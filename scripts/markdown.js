export function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text) {
  if (!text) {
    return '';
  }
  let result = '';
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end === -1) {
        result += escapeHtml(text.slice(index));
        break;
      }
      const code = text.slice(index + 1, end);
      result += `<code>${escapeHtml(code)}</code>`;
      index = end + 1;
      continue;
    }
    if (char === '[') {
      const closeBracket = text.indexOf(']', index + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const label = text.slice(index + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          const safeLabel = escapeHtml(label);
          const safeHref = href.replace(/"/g, '%22');
          result += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
          index = closeParen + 1;
          continue;
        }
      }
    }

    const nextCode = text.indexOf('`', index);
    const nextLink = text.indexOf('[', index);
    let nextStop = -1;
    if (nextCode !== -1 && nextLink !== -1) {
      nextStop = Math.min(nextCode, nextLink);
    } else {
      nextStop = Math.max(nextCode, nextLink);
    }
    if (nextStop === -1) {
      result += escapeHtml(text.slice(index));
      break;
    }
    if (nextStop === index) {
      result += escapeHtml(text[index]);
      index += 1;
      continue;
    }
    result += escapeHtml(text.slice(index, nextStop));
    index = nextStop;
  }
  return result;
}

function renderBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) {
    return '';
  }
  const lines = trimmed.split(/\n/);
  const isQuote = lines.every((line) => /^> ?/.test(line) || line === '');
  const normalized = lines.map((line) => line.replace(/^> ?/, ''));

  const parts = [];
  let paragraphBuffer = [];
  let listBuffer = null;

  function flushParagraph() {
    const text = paragraphBuffer.join(' ').trim();
    if (text) {
      parts.push(`<p>${formatInline(text)}</p>`);
    }
    paragraphBuffer = [];
  }

  function flushList() {
    if (!listBuffer || listBuffer.items.length === 0) {
      listBuffer = null;
      return;
    }
    const items = listBuffer.items.map((item) => `<li>${item}</li>`).join('');
    const tag = listBuffer.type === 'ol' ? 'ol' : 'ul';
    parts.push(`<${tag}>${items}</${tag}>`);
    listBuffer = null;
  }

  normalized.forEach((line) => {
    const stripped = line.trim();
    if (stripped === '') {
      flushParagraph();
      flushList();
      return;
    }
    const orderedMatch = stripped.match(/^(\d+)\.\s+(.*)$/);
    const bulletMatch = stripped.match(/^[-*]\s+(.*)$/);
    if (orderedMatch || bulletMatch) {
      flushParagraph();
      const type = orderedMatch ? 'ol' : 'ul';
      if (!listBuffer || listBuffer.type !== type) {
        flushList();
        listBuffer = { type, items: [] };
      }
      const content = orderedMatch ? orderedMatch[2] : bulletMatch[1];
      listBuffer.items.push(formatInline(content.trim()));
      return;
    }
    flushList();
    paragraphBuffer.push(stripped);
  });

  flushParagraph();
  flushList();

  const html = parts.join('');
  return isQuote ? `<blockquote>${html}</blockquote>` : html;
}

export function renderMarkdown(markdown) {
  const blocks = [];
  let textBuffer = [];
  let codeBuffer = [];
  let inCodeBlock = false;

  function flushTextBuffer() {
    const text = textBuffer.join('\n').trim();
    if (!text) {
      textBuffer = [];
      return;
    }
    text
      .split(/\n\s*\n/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .forEach((segment) => blocks.push({ type: 'text', content: segment }));
    textBuffer = [];
  }

  function flushCodeBuffer() {
    const content = codeBuffer.join('\n');
    blocks.push({
      type: 'code',
      content: escapeHtml(content),
    });
    codeBuffer = [];
  }

  const lines = String(markdown ?? '').replace(/\r/g, '').split('\n');
  lines.forEach((line) => {
    if (/^\s*```/.test(line)) {
      if (inCodeBlock) {
        flushCodeBuffer();
        inCodeBlock = false;
      } else {
        flushTextBuffer();
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  });

  if (inCodeBlock) {
    flushCodeBuffer();
  }
  flushTextBuffer();

  return blocks
    .map((block) => {
      if (block.type === 'code') {
        return `<pre><code>${block.content}</code></pre>`;
      }
      return renderBlock(block.content);
    })
    .join('')
    .trim();
}
