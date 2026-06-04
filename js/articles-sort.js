(function () {
  var toggle = document.getElementById('articles-sort-toggle');
  var table = document.querySelector('table.books-section');
  if (!toggle || !table) return;

  var storageKey = toggle.dataset.sortKey || 'articles-sort-by-year';
  var tbody = table.querySelector('tbody');
  var categoryRows = [].slice.call(tbody.querySelectorAll('tr:not(.articles-chronology-row)'));
  var items = [].slice.call(table.querySelectorAll('li[data-year]'));
  var chronologyRow = null;

  items.forEach(function (li) {
    li._sortParent = li.parentElement;
    li._sortIndex = [].indexOf.call(li.parentElement.children, li);
  });

  function rank(li) {
    return parseInt(li.dataset.rank, 10) || 0;
  }

  function year(li) {
    return parseInt(li.dataset.year, 10) || 0;
  }

  function sortedItems() {
    return items.slice().sort(function (a, b) {
      var diff = year(b) - year(a);
      if (diff) return diff;
      return rank(b) - rank(a);
    });
  }

  function buildChronologyCell() {
    var cell = document.createElement('td');
    cell.className = 'books-section info-cell articles-chronology-cell';

    var currentYear = null;
    var ul = null;

    sortedItems().forEach(function (li) {
      var y = li.dataset.year;
      if (y !== currentYear) {
        currentYear = y;
        var heading = document.createElement('h2');
        heading.className = 'articles-year-heading';
        heading.textContent = y;
        cell.appendChild(heading);
        ul = document.createElement('ul');
        cell.appendChild(ul);
      }
      ul.appendChild(li);
    });

    return cell;
  }

  function restoreItems() {
    items
      .slice()
      .sort(function (a, b) {
        if (a._sortParent !== b._sortParent) {
          return categoryRows.indexOf(a._sortParent.closest('tr')) - categoryRows.indexOf(b._sortParent.closest('tr'));
        }
        return a._sortIndex - b._sortIndex;
      })
      .forEach(function (li) {
        var parent = li._sortParent;
        var siblings = parent.children;
        if (li._sortIndex >= siblings.length) parent.appendChild(li);
        else parent.insertBefore(li, siblings[li._sortIndex]);
      });
  }

  function enableYearView() {
    restoreItems();

    if (chronologyRow) chronologyRow.remove();

    chronologyRow = document.createElement('tr');
    chronologyRow.className = 'articles-chronology-row';
    chronologyRow.appendChild(buildChronologyCell());

    var cover = document.createElement('td');
    cover.className = 'cover-placeholder cover-cell';
    chronologyRow.appendChild(cover);

    categoryRows.forEach(function (row) {
      row.hidden = true;
    });
    tbody.appendChild(chronologyRow);

    document.body.classList.add('articles-by-year');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.textContent = 'By topic';
    try {
      localStorage.setItem(storageKey, 'year');
    } catch (e) {}
  }

  function disableYearView() {
    restoreItems();
    if (chronologyRow) {
      chronologyRow.remove();
      chronologyRow = null;
    }
    categoryRows.forEach(function (row) {
      row.hidden = false;
    });
    document.body.classList.remove('articles-by-year');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'By year';
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {}
  }

  toggle.addEventListener('click', function () {
    if (toggle.getAttribute('aria-pressed') === 'true') disableYearView();
    else enableYearView();
  });

  disableYearView();

  try {
    if (localStorage.getItem(storageKey) === 'year') enableYearView();
  } catch (e) {}
})();
