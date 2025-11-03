const NAV_LINKS = [
  { id: 'overview', label: 'Overview', href: './index.html' },
  { id: 'allocation', label: 'Allocation Simulator', href: './allocation.html' },
  { id: 'about', label: 'About', href: './about.html' },
];

const STYLE_ID = 'site-nav-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --site-nav-background: #1f2933;
      --site-nav-foreground: #f9fafb;
      --site-nav-muted: #d1d5db;
      --site-nav-hover: rgba(249, 250, 251, 0.1);
      --site-nav-active: rgba(249, 250, 251, 0.2);
      --site-nav-border: rgba(255, 255, 255, 0.08);
    }

    .site-nav-container {
      background: var(--site-nav-background);
      color: var(--site-nav-foreground);
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.3);
      border-bottom: 1px solid var(--site-nav-border);
      margin: 0 0 16px;
    }

    .site-nav {
      margin: 0 auto;
      max-width: 1100px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 32px;
      box-sizing: border-box;
    }

    .site-nav__brand {
      font-size: 1.1rem;
      font-weight: 600;
      color: inherit;
      text-decoration: none;
      letter-spacing: 0.02em;
    }

    .site-nav__list {
      display: flex;
      align-items: center;
      gap: 12px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .site-nav__link {
      color: #e5e7eb;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 6px;
      transition: background 120ms ease, color 120ms ease;
      font-weight: 600;
      font-size: 0.95rem;
    }

    .site-nav__link:hover,
    .site-nav__link:focus-visible {
      color: var(--site-nav-foreground);
      background: var(--site-nav-hover);
      outline: none;
    }

    .site-nav__link--active {
      color: var(--site-nav-foreground);
      background: var(--site-nav-active);
    }

    .site-nav__spacer {
      flex: 1;
    }
  `;
  document.head.appendChild(style);
}

function removeExistingNav() {
  const existing = document.querySelector('[data-site-nav="true"]');
  if (existing) {
    existing.remove();
  }
}

export function initNavigation(activeId) {
  if (typeof document === 'undefined') {
    return null;
  }
  ensureStyles();
  removeExistingNav();

  const header = document.createElement('header');
  header.className = 'site-nav-container';
  header.dataset.siteNav = 'true';

  const nav = document.createElement('nav');
  nav.className = 'site-nav';

  const list = document.createElement('ul');
  list.className = 'site-nav__list';

  NAV_LINKS.forEach((link) => {
    const li = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = 'site-nav__link';
    if (link.id === activeId) {
      anchor.classList.add('site-nav__link--active');
      anchor.setAttribute('aria-current', 'page');
    }
    li.appendChild(anchor);
    list.appendChild(li);
  });

  nav.appendChild(list);

  header.appendChild(nav);

  const main = document.querySelector('main');
  if (main && main.parentNode) {
    main.parentNode.insertBefore(header, main);
  } else {
    document.body.insertBefore(header, document.body.firstChild);
  }
  return header;
}
