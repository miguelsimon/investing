(function () {
  const GTAG_ID = 'G-Z3HRWM07R4';
  if (document.querySelector(`script[data-gtag-id="${GTAG_ID}"]`)) {
    return;
  }
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;
  script.dataset.gtagId = GTAG_ID;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;
  window.gtag('js', new Date());
  window.gtag('config', GTAG_ID);
})();
