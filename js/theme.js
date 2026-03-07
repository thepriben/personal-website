(function () {
  var STORAGE_KEY = 'theme';

  function getIconPaths() {
    var btn = document.getElementById('theme-toggle');
    if (btn && btn.dataset.iconSun) {
      return { sun: btn.dataset.iconSun, moon: btn.dataset.iconMoon };
    }
    return { sun: 'images/ui/theme-sun.svg', moon: 'images/ui/theme-moon.svg' };
  }

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'dark';
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
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
    var current = getStoredTheme() || getSystemTheme();
    var next = current === 'light' ? 'dark' : 'light';
    setTheme(next);
  }

  setTheme(getStoredTheme() || getSystemTheme());

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', toggleTheme);
      updateIcon(getStoredTheme() || getSystemTheme());
    }
  });
})();
