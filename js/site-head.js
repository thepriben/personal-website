(function () {
  var ANALYTICS_ID = 'G-Q8WHXGDDWG';
  var THEME_STORAGE_KEY = 'theme';
  var theme = 'dark';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', ANALYTICS_ID);

  try {
    theme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', theme);
})();
