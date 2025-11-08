(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const o of t.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function s(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function i(e){if(e.ep)return;e.ep=!0;const t=s(e);fetch(e.href,t)}})();const d=[{id:"overview",label:"Overview",href:"./index.html"},{id:"allocation",label:"Allocation Simulator",href:"./allocation.html"},{id:"buffett",label:"Buffett Indicator",href:"./buffet_indicator.html"},{id:"about",label:"About",href:"./about.html"}],c="site-nav-styles";function l(){if(document.getElementById(c))return;const r=document.createElement("style");r.id=c,r.textContent=`
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
  `,document.head.appendChild(r)}function u(){const r=document.querySelector('[data-site-nav="true"]');r&&r.remove()}function f(r){if(typeof document>"u")return null;l(),u();const n=document.createElement("header");n.className="site-nav-container",n.dataset.siteNav="true";const s=document.createElement("nav");s.className="site-nav";const i=document.createElement("ul");i.className="site-nav__list",d.forEach(t=>{const o=document.createElement("li"),a=document.createElement("a");a.href=t.href,a.textContent=t.label,a.className="site-nav__link",t.id===r&&(a.classList.add("site-nav__link--active"),a.setAttribute("aria-current","page")),o.appendChild(a),i.appendChild(o)}),s.appendChild(i),n.appendChild(s);const e=document.querySelector("main");return e&&e.parentNode?e.parentNode.insertBefore(n,e):document.body.insertBefore(n,document.body.firstChild),n}export{f as i};
