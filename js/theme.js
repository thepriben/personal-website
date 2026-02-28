(function () {
  var STORAGE_KEY = 'theme';
  function getIconPaths() {
    var btn = document.getElementById('theme-toggle');
    if (btn && btn.dataset.iconSun) {
      return { sun: btn.dataset.iconSun, moon: btn.dataset.iconMoon };
    }
    return { sun: 'images/sun.svg', moon: 'images/moon.svg' };
  }

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getTheme() {
    return getStoredTheme() || getSystemTheme();
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateIcon(theme);
  }

  function updateIcon(theme) {
    var img = document.getElementById('theme-icon');
    if (img) {
      var paths = getIconPaths();
      img.src = theme === 'dark' ? paths.sun : paths.moon;
    }
  }

  function toggleTheme() {
    var current = getTheme();
    var next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  setTheme(getTheme());

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
      updateIcon(getTheme());
    }
  });
})();
