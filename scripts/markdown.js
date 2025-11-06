export function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInline(text) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const [raw, label, href] = match;
    result += escapeHtml(text.slice(lastIndex, match.index));
    const safeLabel = escapeHtml(label);
    const safeHref = href.replace(/"/g, '%22');
    result += `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
    lastIndex = match.index + raw.length;
  }
  result += escapeHtml(text.slice(lastIndex));
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
  const hasList = normalized.some((line) => /^\* /.test(line));
  let html = '';
  if (hasList) {
    const items = normalized
      .filter((line) => /^\* /.test(line))
      .map((line) => `<li>${formatInline(line.slice(2).trim())}</li>`)
      .join('');
    html = `<ul>${items}</ul>`;
  } else {
    const paragraphs = normalized
      .join('\n')
      .split(/\n+/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => `<p>${formatInline(segment)}</p>`)
      .join('');
    html = paragraphs;
  }
  return isQuote ? `<blockquote>${html}</blockquote>` : html;
}

export function renderMarkdown(markdown) {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .map(renderBlock)
    .join('')
    .trim();
}
