/*
 * HaramTablePagination
 * Client-side pagination factory for HaramApp data tables.
 * Bar stays hidden until total rows > threshold (default 15).
 * RTL-aware: prev = chevron-right (السابق), next = chevron-left (التالي).
 *
 * Usage:
 *   var pager = HaramTablePagination.attach({
 *     container:  someElement,                 // pagination bar gets appended INSIDE this
 *     getItems:   () => filteredArray,         // current filtered items (DOM rows or any data)
 *     renderPage: (pageItems, info) => { ... } // caller renders the page slice
 *     threshold:  15,                          // optional: hide bar when total <= this
 *     pageSize:   15,                          // optional: initial page size (must be in `sizes` or 0)
 *     sizes:      [15, 30, 45, 0],             // optional: page-size buttons (0 = الكل / show all)
 *     itemLabel:  'صف'                         // optional: noun in pager-info text ("X من Z <label>")
 *   });
 *   pager.reset();   // resets to page 1 and re-renders (call after filter/search changes)
 *   pager.render();  // re-renders current page without resetting
 */
(function (global) {
  'use strict';

  // Inject CSS once.
  function injectCss() {
    if (document.getElementById('haram-table-pagination-css')) return;
    var s = document.createElement('style');
    s.id = 'haram-table-pagination-css';
    s.textContent = [
      '.pagination-bar {',
      '  display: none; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;',
      '  padding: 14px 20px; border-top: 1px solid var(--bs-border-color);',
      '  border-radius: 0 0 12px 12px;',
      '}',
      '.pagination-bar .page-size-group { display: flex; gap: 3px; align-items: center; }',
      '.pagination-bar .page-size-btn {',
      '  height: 28px; padding: 0 10px; border-radius: 6px; font-size: .75rem; font-weight: 600;',
      '  border: 1px solid var(--bs-border-color); background: var(--bs-card-bg);',
      '  color: var(--bs-body-color); cursor: pointer; transition: all .15s; display: inline-flex; align-items: center;',
      '}',
      '.pagination-bar .page-size-btn:hover { border-color: var(--bs-primary); color: var(--bs-primary); background: rgba(var(--bs-primary-rgb),.04); }',
      '.pagination-bar .page-size-btn.active { background: var(--bs-primary); border-color: var(--bs-primary); color: #fff; }',
      '.pagination-bar .page-nav { display: flex; align-items: center; gap: 3px; }',
      '.pagination-bar .page-nav-btn {',
      '  height: 28px; padding: 0 10px; border-radius: 6px; font-size: .75rem; font-weight: 500;',
      '  border: 1px solid var(--bs-border-color); background: var(--bs-card-bg);',
      '  color: var(--bs-body-color); cursor: pointer; transition: all .15s;',
      '  display: inline-flex; align-items: center; gap: 3px;',
      '}',
      '.pagination-bar .page-nav-btn:hover:not([disabled]) { border-color: var(--bs-primary); color: var(--bs-primary); }',
      '.pagination-bar .page-nav-btn[disabled] { opacity: .4; cursor: default; pointer-events: none; }',
      '.pagination-bar .page-num-btn {',
      '  width: 28px; height: 28px; border-radius: 6px; font-size: .75rem; font-weight: 600;',
      '  border: 1px solid var(--bs-border-color); background: var(--bs-card-bg);',
      '  color: var(--bs-body-color); cursor: pointer; transition: all .15s;',
      '  display: inline-flex; align-items: center; justify-content: center; padding: 0;',
      '}',
      '.pagination-bar .page-num-btn:hover { border-color: var(--bs-primary); color: var(--bs-primary); }',
      '.pagination-bar .page-num-btn.active { background: var(--bs-primary); border-color: var(--bs-primary); color: #fff; }',
      '.pagination-bar .pager-info { font-size: .73rem; color: var(--bs-secondary-color); }',
      '.pagination-bar .page-ellipsis {',
      '  display: inline-flex; align-items: center; padding: 0 3px;',
      '  font-size: .75rem; color: var(--bs-secondary-color);',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildPageRange(cur, total) {
    if (total <= 7) {
      var arr = [];
      for (var i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    var r = [1];
    if (cur > 3) r.push('…');
    for (var j = Math.max(2, cur - 1); j <= Math.min(total - 1, cur + 1); j++) r.push(j);
    if (cur < total - 2) r.push('…');
    r.push(total);
    return r;
  }

  function buildBar(sizes, initialSize) {
    var bar = document.createElement('div');
    bar.className = 'pagination-bar';

    var sizeGroup = document.createElement('div');
    sizeGroup.className = 'page-size-group';
    var label = document.createElement('span');
    label.className = 'pager-info';
    label.style.marginLeft = '6px';
    label.textContent = 'عرض:';
    sizeGroup.appendChild(label);
    sizes.forEach(function (size) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'page-size-btn' + (size === initialSize ? ' active' : '');
      b.setAttribute('data-size', size);
      b.textContent = size === 0 ? 'الكل' : String(size);
      sizeGroup.appendChild(b);
    });

    var nav = document.createElement('div');
    nav.className = 'page-nav';
    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'page-nav-btn';
    prev.setAttribute('data-act', 'prev');
    prev.innerHTML = '<i class="ti tabler-chevron-right"></i> السابق';
    var nums = document.createElement('div');
    nums.className = 'page-numbers d-flex gap-1 flex-wrap';
    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'page-nav-btn';
    next.setAttribute('data-act', 'next');
    next.innerHTML = 'التالي <i class="ti tabler-chevron-left"></i>';
    nav.appendChild(prev);
    nav.appendChild(nums);
    nav.appendChild(next);

    var info = document.createElement('div');
    info.className = 'pager-info pager-info-text';

    bar.appendChild(sizeGroup);
    bar.appendChild(nav);
    bar.appendChild(info);

    return { bar: bar, nav: nav, prev: prev, next: next, nums: nums, info: info };
  }

  function attach(opts) {
    injectCss();

    var threshold = (typeof opts.threshold === 'number') ? opts.threshold : 15;
    var sizes     = opts.sizes || [15, 30, 45, 0];
    var pageSize  = (typeof opts.pageSize === 'number') ? opts.pageSize : 15;
    var itemLabel = opts.itemLabel || 'صف';
    var currentPage = 1;

    var ui = buildBar(sizes, pageSize);
    opts.container.appendChild(ui.bar);

    function render() {
      var items = opts.getItems() || [];
      var total = items.length;
      var pages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize));
      if (currentPage > pages) currentPage = pages;
      if (currentPage < 1) currentPage = 1;

      var start = pageSize === 0 ? 0 : (currentPage - 1) * pageSize;
      var end   = pageSize === 0 ? total : Math.min(start + pageSize, total);

      opts.renderPage(items.slice(start, end), {
        start: start, end: end, total: total,
        page: currentPage, pages: pages, pageSize: pageSize
      });

      // Threshold: hide bar entirely when total <= threshold.
      ui.bar.style.display = total > threshold ? 'flex' : 'none';

      // Pager info text.
      ui.info.textContent = pageSize === 0 || total <= pageSize
        ? total + ' ' + itemLabel
        : (start + 1) + '–' + end + ' من ' + total;

      // Prev/next buttons.
      ui.prev.disabled = currentPage <= 1 || pageSize === 0;
      ui.next.disabled = currentPage >= pages || pageSize === 0;
      ui.nav.style.display = (pageSize > 0 && pages > 1) ? '' : 'none';

      // Page number buttons.
      ui.nums.innerHTML = '';
      if (pageSize > 0 && pages > 1) {
        buildPageRange(currentPage, pages).forEach(function (p) {
          if (p === '…') {
            var sp = document.createElement('span');
            sp.className = 'page-ellipsis';
            sp.textContent = '…';
            ui.nums.appendChild(sp);
          } else {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'page-num-btn' + (p === currentPage ? ' active' : '');
            btn.textContent = p;
            btn.addEventListener('click', function () { currentPage = p; render(); });
            ui.nums.appendChild(btn);
          }
        });
      }
    }

    // Wire size buttons.
    ui.bar.querySelectorAll('.page-size-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ui.bar.querySelectorAll('.page-size-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        pageSize = +btn.getAttribute('data-size');
        currentPage = 1;
        render();
      });
    });

    ui.prev.addEventListener('click', function () {
      if (currentPage > 1) { currentPage--; render(); }
    });
    ui.next.addEventListener('click', function () {
      var items = opts.getItems() || [];
      var pages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(items.length / pageSize));
      if (currentPage < pages) { currentPage++; render(); }
    });

    return {
      render: render,
      reset: function () { currentPage = 1; render(); },
      getPageSize: function () { return pageSize; }
    };
  }

  global.HaramTablePagination = { attach: attach };
})(window);
