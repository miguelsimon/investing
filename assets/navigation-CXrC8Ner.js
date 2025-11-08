(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function a(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(e){if(e.ep)return;e.ep=!0;const n=a(e);fetch(e.href,n)}})();(function(){const t="G-Z3HRWM07R4";if(typeof window>"u"||document.querySelector(`script[data-gtag-id="${t}"]`))return;const a=document.createElement("script");a.async=!0,a.src=`https://www.googletagmanager.com/gtag/js?id=${t}`,a.dataset.gtagId=t,document.head.appendChild(a),window.dataLayer=window.dataLayer||[];function i(){window.dataLayer.push(arguments)}window.gtag=window.gtag||i,window.gtag("js",new Date),window.gtag("config",t)})();const c=[{id:"overview",label:"Overview",href:"./index.html"},{id:"allocation",label:"Allocation Simulator",href:"./allocation.html"},{id:"buffett",label:"Buffett Indicator",href:"./buffet_indicator.html"},{id:"about",label:"About",href:"./about.html"}],d="site-nav-styles";function l(){if(document.getElementById(d))return;const o=document.createElement("style");o.id=d,o.textContent=`
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
  `,document.head.appendChild(o)}function u(){const o=document.querySelector('[data-site-nav="true"]');o&&o.remove()}function f(o){if(typeof document>"u")return null;l(),u();const t=document.createElement("header");t.className="site-nav-container",t.dataset.siteNav="true";const a=document.createElement("nav");a.className="site-nav";const i=document.createElement("ul");i.className="site-nav__list",c.forEach(n=>{const r=document.createElement("li"),s=document.createElement("a");s.href=n.href,s.textContent=n.label,s.className="site-nav__link",n.id===o&&(s.classList.add("site-nav__link--active"),s.setAttribute("aria-current","page")),r.appendChild(s),i.appendChild(r)}),a.appendChild(i),t.appendChild(a);const e=document.querySelector("main");return e&&e.parentNode?e.parentNode.insertBefore(t,e):document.body.insertBefore(t,document.body.firstChild),t}export{f as i};
