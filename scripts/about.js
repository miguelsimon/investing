import { escapeHtml, renderMarkdown } from './markdown.js';
import { initNavigation } from './navigation.js';

async function bootstrap() {
  initNavigation('about');
  const container = document.getElementById('about-content');
  if (!container) {
    return;
  }
  try {
    const response = await fetch('README.md', { headers: { Accept: 'text/plain' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    const html = renderMarkdown(text);
    container.innerHTML = html || '<p>Contenido no disponible.</p>';
  } catch (error) {
    container.innerHTML = `<p>Error al cargar el contenido: ${escapeHtml(error.message)}</p>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
