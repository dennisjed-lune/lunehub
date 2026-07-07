/* LuneHub — behavior: auth, routing, rendering, search, toggles */
(function () {
  var D = window.LH_DATA;
  var CUR = (D && D.currency) || 'AED';
  var openReport = null, openInExplorer = null;
  var expFilters = { sortOrder: 'desc' };
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------- auth ---------- */
  var AUTH_KEY = 'lunehub.proto.auth';
  function setAuthed(v) {
    document.body.classList.toggle('authed', v);
    try { v ? localStorage.setItem(AUTH_KEY, '1') : localStorage.removeItem(AUTH_KEY); } catch (e) {}
  }
  var loginForm = $('#lh-login-form');
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var em = $('#lh-email');
    if (!em.value || !/.+@.+\..+/.test(em.value)) { em.focus(); em.style.borderColor = '#B05A52'; return; }
    setAuthed(true);
    go(localStorage.getItem('lunehub.proto.view') || 'overview');
  });
  $('#lh-signout').addEventListener('click', function (e) { e.stopPropagation(); setAuthed(false); });

  /* ---------- nav / routing ---------- */
  var LEGACY_VIEWS = { 'brands': 'explorer', 'categories': 'explorer', 'geo-compare': 'geo', 'geo-segments': 'geo' };
  var MODULES = { 'geo': 'geo-frame', 'pulse': 'pulse-frame' };
  var geoReady = false, geoPending = null, geoBound = false;
  function geoNav(page) {
    var f = $('#geo-frame');
    if (!geoBound) {
      geoBound = true;
      f.addEventListener('load', function () {
        geoReady = true;
        if (geoPending) { f.contentWindow.postMessage({ type: 'lg-nav', page: geoPending }, '*'); geoPending = null; }
      });
    }
    if (!f.getAttribute('src')) f.setAttribute('src', f.getAttribute('data-src'));
    if (geoReady) f.contentWindow.postMessage({ type: 'lg-nav', page: page }, '*');
    else geoPending = page;
  }
  function go(view) {
    view = LEGACY_VIEWS[view] || view;
    $$('.lh-view').forEach(function (v) { v.classList.toggle('active', v.id === 'view-' + view); });
    $$('.lh-item[data-view]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === view); });
    var u = $('#lh-user'); if (u) u.classList.toggle('on', view === 'settings');
    try { localStorage.setItem('lunehub.proto.view', view); } catch (e) {}
    if (view === 'geo') {
      var tab = document.querySelector('#geo-tabs button.on');
      geoNav(tab ? tab.getAttribute('data-geo') : 'map');
    }
    if (MODULES[view]) { var f = $('#' + MODULES[view]); if (f && !f.getAttribute('src')) f.setAttribute('src', f.getAttribute('data-src')); }
    if (view === 'dashboard') { renderTree(); setTimeout(renderTree, 60); }
    var tip = $('#lh-tip'); if (tip) tip.classList.remove('show');
    $('.lh-main').scrollTop = 0; window.scrollTo(0, 0);
  }
  // geo in-view tabs
  $$('#geo-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#geo-tabs button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      geoNav(b.getAttribute('data-geo'));
    });
  });
  // user card -> settings
  (function () {
    var u = $('#lh-user');
    if (!u) return;
    u.addEventListener('click', function () { go('settings'); });
    u.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('settings'); } });
  })();
  $$('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () { go(b.getAttribute('data-view')); });
  });
  $$('.lh-item[data-group]').forEach(function (g) {
    g.addEventListener('click', function () {
      g.classList.toggle('open');
      var sub = $('#sub-' + g.getAttribute('data-group'));
      if (sub) sub.classList.toggle('closed');
    });
  });
  $('#lh-collapse').addEventListener('click', function () { document.body.classList.toggle('collapsed'); });

  /* ---------- renderers ---------- */
  function initials(label) {
    return label.replace(/[^A-Za-z0-9& ]/g, '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  }
  function chip(label, color) {
    return '<span class="lh-chip" style="background:' + color + '">' + initials(label) + '</span>';
  }
  // real brand logo (favicon CDN) with chip fallback; data-* used for fallback + enlarge
  function favicon(domain, sz) { return 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=' + sz; }
  function logoImg(brand, color) {
    var m = D.brandMeta && D.brandMeta[brand];
    if (!m || !m.url) return chip(brand, color);
    return '<img class="lh-logo" data-domain="' + m.url + '" data-name="' + esc(brand) + '" data-color="' + color + '" src="' + favicon(m.url, 64) + '" alt="' + esc(brand) + '" />';
  }
  function bindLogos(root) {
    $$('img.lh-logo', root || document).forEach(function (img) {
      if (img._b) return; img._b = 1;
      img.addEventListener('error', function () {
        var s = document.createElement('span'); s.className = 'lh-chip'; s.style.background = img.getAttribute('data-color');
        s.textContent = initials(img.getAttribute('data-name')); if (img.parentNode) img.parentNode.replaceChild(s, img);
      });
      img.addEventListener('click', function (e) { e.stopPropagation(); openLogo(img); });
    });
  }
  function openLogo(img) {
    var box = $('#lh-logobox'); if (!box) return;
    var big = box.querySelector('img'), dom = img.getAttribute('data-domain');
    big.removeAttribute('data-fb'); big.setAttribute('data-domain', dom);
    big.src = favicon(dom, 128);
    box.querySelector('.cap').innerHTML = '<b>' + img.getAttribute('data-name') + '</b><span>' + dom + '</span>';
    box.classList.add('open');
  }
  var FLAG_SVG = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3.5 14V2.5M3.5 3h8.2l-1.6 2.8 1.6 2.8H3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHEV_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var COPY_SVG = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  var XFER_SVG = '<svg width="15" height="15" viewBox="0 0 18 18" fill="none"><path d="M3 6.5h9M9.5 3 13 6.5 9.5 10M15 11.5H6M8.5 15 5 11.5 8.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // city lookup by country name (for enrichment detail)
  var CITY_BY_NAME = {};
  (function () { var cm = D.countryMeta || {}; Object.keys(cm).forEach(function (k) { CITY_BY_NAME[cm[k].name] = cm[k].cities; }); })();
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function txDetail(r) {
    var brand = r[2], cat = r[4], cur = r[7], h = hashStr(r[0]);
    var meta = brand ? D.brandMeta[brand] : null;
    var subs = brand ? (D.subcats[cat] || [cat]) : D.transferSubs;
    var cities = CITY_BY_NAME[r[8]] || ['—'];
    var amtAed = Math.abs(amtVal(r[6])) * ((D.fx && D.fx[cur]) || 1);
    var carbon = brand ? (amtAed * ((D.carbon && D.carbon[cat]) || 0.03)).toFixed(1) + ' kg CO₂e' : '—';
    var time = brand ? ('0' + ((h >> 5) % 24)).slice(-2) + ':' + ('0' + ((h >> 9) % 60)).slice(-2) : '00:00';
    return {
      merchant: brand || '—',
      customerId: 'CUST' + (r[11] + 1),
      subcategory: subs[h % subs.length],
      country: r[8],
      brandUrl: meta ? meta.url : '—',
      brandAr: meta ? meta.ar : '—',
      transactionId: String(1000000000 + (h % 900000000)),
      mcc: r[10] || '—',
      carbon: carbon,
      city: brand ? cities[(h >> 3) % cities.length] : '—',
      dateTime: r[5] + ', ' + time,
      countryCode: r[9]
    };
  }
  function dq(k, v) { return '<div><div class="k">' + k + '</div><div class="val' + (v === '—' ? ' muted' : '') + '">' + v + '</div></div>'; }
  function buildDetail(r) {
    var x = txDetail(r);
    return '<tr class="lh-detail" hidden><td colspan="10"><div class="lh-detail-wrap"><div class="lh-detail-in">' +
      dq('Merchant Name', x.merchant) + dq('Customer ID', x.customerId) + dq('Subcategory', x.subcategory) + dq('Country', x.country) +
      dq('Brand URL', x.brandUrl) + dq('Brand Name (Arabic)', x.brandAr) + dq('Transaction ID', x.transactionId) + dq('MCC', x.mcc) +
      dq('Carbon Footprint', x.carbon) + dq('City', x.city) + dq('Date & Time', x.dateTime) + dq('Country Code', x.countryCode) +
      '</div><div class="lh-detail-foot"><button class="lh-btn lh-btn--dark lh-report-one" data-id="' + r[0] + '">' + FLAG_SVG + ' Report Transaction</button></div></div></td></tr>';
  }
  function renderCategories(filter) {
    if (!$('#tb-categories')) return;
    var rows = D.categories.filter(function (r) { return !filter || r[0].toLowerCase().indexOf(filter) > -1; });
    $('#tb-categories').innerHTML = rows.map(function (r) {
      return '<tr class="lh-drill" data-cat="' + esc(r[0]) + '"><td><span class="lh-name">' + chip(r[0], r[1]) + r[0] + '</span></td>' +
        '<td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td>' +
        '<td class="num">' + r[4] + '</td><td class="num lh-muted">' + r[5] + '</td></tr>';
    }).join('') || '<tr><td colspan="5" class="lh-muted" style="text-align:center;padding:28px">No categories match.</td></tr>';
    $$('#tb-categories .lh-drill').forEach(function (row) { row.addEventListener('click', function () { openCategory(row.getAttribute('data-cat')); }); });
  }
  function renderBrands() {
    if (!$('#tb-brands')) return;
    var q = ($('#exp-search') ? $('#exp-search').value : '').trim().toLowerCase(), f = expFilters;
    var rows = D.brands.filter(function (r) {
      if (q && r[0].toLowerCase().indexOf(q) < 0) return false;
      if (f.cat && r[2] !== f.cat) return false;
      var spend = parseNum(r[3]), tx = parseNum(r[4]), cust = parseNum(r[5]), spc = parseNum(r[6]);
      if (f.spendMin != null && spend < f.spendMin) return false;
      if (f.spendMax != null && spend > f.spendMax) return false;
      if (f.txMin != null && tx < f.txMin) return false;
      if (f.txMax != null && tx > f.txMax) return false;
      if (f.custMin != null && cust < f.custMin) return false;
      if (f.custMax != null && cust > f.custMax) return false;
      if (f.spcMin != null && spc < f.spcMin) return false;
      if (f.spcMax != null && spc > f.spcMax) return false;
      return true;
    });
    if (f.sortField) {
      var col = { spend: 3, tx: 4, cust: 5, spc: 6 };
      rows = rows.slice().sort(function (a, b) {
        var va, vb;
        if (f.sortField === 'name') { va = a[0].toLowerCase(); vb = b[0].toLowerCase(); }
        else { va = parseNum(a[col[f.sortField]]); vb = parseNum(b[col[f.sortField]]); }
        var d = va < vb ? -1 : va > vb ? 1 : 0;
        return f.sortOrder === 'asc' ? d : -d;
      });
    }
    $('#tb-brands').innerHTML = rows.map(function (r) {
      return '<tr class="lh-drill" data-brand="' + esc(r[0]) + '"><td><span class="lh-name">' + logoImg(r[0], r[1]) + r[0] + '</span></td>' +
        '<td class="lh-muted">' + r[2] + '</td><td class="num">' + r[3] + '</td><td class="num">' + r[4] + '</td>' +
        '<td class="num">' + r[5] + '</td><td class="num">' + r[6] + '</td></tr>';
    }).join('') || '<tr><td colspan="6" class="lh-muted" style="text-align:center;padding:28px">No brands match.</td></tr>';
    $('#brand-count').innerHTML = rows.length + ' <span>/ ' + D.brands.length + ' brands</span>';
    bindLogos($('#tb-brands'));
    $$('#tb-brands .lh-drill').forEach(function (row) { row.addEventListener('click', function (e) { if (e.target.closest('img.lh-logo')) return; openBrand(row.getAttribute('data-brand')); }); });
  }
  function renderBrandsMini() {
    $('#tb-brands-mini').innerHTML = D.brands.slice(0, 13).map(function (r) {
      return '<tr class="lh-drill" data-brand="' + esc(r[0]) + '"><td><span class="lh-name">' + logoImg(r[0], r[1]) + r[0] + '</span></td>' +
        '<td class="num">' + fmtSpend(parseNum(r[3])) + '</td><td class="num">' + r[4] + '</td><td class="num">' + r[5] + '</td></tr>';
    }).join('');
    bindLogos($('#tb-brands-mini'));
    $$('#tb-brands-mini .lh-drill').forEach(function (row) { row.addEventListener('click', function (e) { if (e.target.closest('img.lh-logo')) return; openBrand(row.getAttribute('data-brand')); }); });
  }
  /* ---------- transactions: filters + sorting + pagination + expandable rows ---------- */
  var txFilters = {};
  var txSort = { key: null, dir: 1 };
  var txPage = 0, TX_PAGE = 50;
  var MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  function dateVal(s) { var p = s.split(' '); return new Date(+p[2], MONTHS[p[1]], +p[0]).getTime(); }
  function amtVal(s) { return parseFloat(String(s).replace(/,/g, '')); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
  function renderTransactions() {
    var qd = ($('#tx-search').value || '').trim().toLowerCase();
    var qi = ($('#tx-id') ? $('#tx-id').value || '' : '').trim().toLowerCase();
    var f = txFilters;
    var rows = D.transactions.filter(function (r) {
      if (qd && r[1].toLowerCase().indexOf(qd) < 0) return false;
      if (qi && r[0].toLowerCase().indexOf(qi) < 0) return false;
      if (f.merchant && r[1].toLowerCase().indexOf(f.merchant) < 0) return false;
      if (f.brand && r[2].toLowerCase().indexOf(f.brand) < 0) return false;
      if (f.category && r[4] !== f.category) return false;
      if (f.currency && r[7] !== f.currency) return false;
      if (f.country && r[8] !== f.country) return false;
      if (f.mcc && r[10].indexOf(f.mcc) !== 0) return false;
      if (f.emptyDesc && r[1] !== '') return false;
      return true;
    });
    if (txSort.key) {
      rows = rows.slice().sort(function (a, b) {
        var va, vb;
        if (txSort.key === 'id') { va = +a[0]; vb = +b[0]; }
        else if (txSort.key === 'desc') { va = a[1].toLowerCase(); vb = b[1].toLowerCase(); }
        else if (txSort.key === 'date') { va = dateVal(a[5]); vb = dateVal(b[5]); }
        else if (txSort.key === 'amount') { va = amtVal(a[6]); vb = amtVal(b[6]); }
        else { va = a[7]; vb = b[7]; }
        return va < vb ? -txSort.dir : va > vb ? txSort.dir : 0;
      });
    }
    var total = rows.length, pages = Math.max(1, Math.ceil(total / TX_PAGE));
    if (txPage >= pages) txPage = pages - 1;
    var pageRows = rows.slice(txPage * TX_PAGE, txPage * TX_PAGE + TX_PAGE);
    $('#tb-tx').innerHTML = pageRows.map(function (r) {
      var logo = r[2] ? logoImg(r[2], r[3]) : '<span class="lh-chip lh-chip--xfer">' + XFER_SVG + '</span>';
      var brandCell = r[2] ? r[2] + '<button class="lh-copyc" data-copy="' + esc(r[2]) + '" title="Copy brand" aria-label="Copy brand">' + COPY_SVG + '</button>' : '<span class="lh-muted">—</span>';
      var amtNeg = amtVal(r[6]) < 0;
      return '<tr><td><input type="checkbox" class="lh-cb" data-id="' + r[0] + '" aria-label="Select transaction ' + r[0] + '"></td>' +
        '<td><span class="lh-name">' + logo + '</span></td>' +
        '<td class="lh-muted">' + r[0] + '</td><td style="font-weight:600">' + (r[1] || '<span class="lh-muted">—</span>') + '</td>' +
        '<td>' + brandCell + '</td><td class="lh-muted">' + r[4] + '</td><td class="lh-muted">' + r[5] + '</td>' +
        '<td class="num" style="font-weight:600' + (amtNeg ? '' : ';color:var(--accent-ink)') + '">' + r[6] + '</td><td class="lh-muted">' + r[7] + '</td>' +
        '<td><span class="lh-rowtools">' +
        '<button class="lh-flag" title="Report transaction" aria-label="Report transaction" data-id="' + r[0] + '">' + FLAG_SVG + '</button>' +
        '<button class="lh-rowtog" title="Expand" aria-label="Expand row">' + CHEV_SVG + '</button>' +
        '</span></td></tr>' + buildDetail(r);
    }).join('') || '<tr><td colspan="10" class="lh-muted" style="text-align:center;padding:28px">No transactions match.</td></tr>';
    if (total) {
      var from = txPage * TX_PAGE + 1, to = Math.min(total, txPage * TX_PAGE + TX_PAGE);
      $('#tx-count').innerHTML = '<b>' + from.toLocaleString() + '–' + to.toLocaleString() + '</b> of ' + total.toLocaleString() + ' <span>transactions</span>';
    } else {
      $('#tx-count').innerHTML = '<span>No transactions match</span>';
    }
    renderPager(pages);
    bindReport();
    bindRowTools();
    bindLogos($('#tb-tx'));
  }
  function renderPager(pages) {
    var el = $('#tx-pager'); if (!el) return;
    if (pages <= 1) { el.innerHTML = ''; return; }
    var btn = function (lbl, pg, dis, cur) { return '<button class="pg' + (cur ? ' pg-cur' : '') + '"' + (dis ? ' disabled' : '') + ' data-pg="' + pg + '">' + lbl + '</button>'; };
    var html = btn('‹', txPage - 1, txPage === 0);
    var win = [];
    for (var p = 0; p < pages; p++) {
      if (p === 0 || p === pages - 1 || (p >= txPage - 1 && p <= txPage + 1)) win.push(p);
      else if (win[win.length - 1] !== '…') win.push('…');
    }
    win.forEach(function (p) { html += p === '…' ? '<span class="pg-gap">…</span>' : btn(p + 1, p, false, p === txPage); });
    html += btn('›', txPage + 1, txPage === pages - 1);
    el.innerHTML = html;
    $$('#tx-pager button[data-pg]').forEach(function (b) {
      b.addEventListener('click', function () { var pg = +b.getAttribute('data-pg'); if (pg >= 0 && pg < pages) { txPage = pg; renderTransactions(); var c = $('#view-transactions .lh-tablewrap'); if (c) c.scrollTop = 0; } });
    });
  }
  function cell(k, v) { return '<div><div class="k">' + k + '</div><div class="val">' + v + '</div></div>'; }
  function mccFor(cat) {
    var m = { Travel: '4722', Shopping: '5651', 'Financial Services': '6012', Services: '7372', Transportation: '4121', Dining: '5812', Groceries: '5411', Wellness: '8099', Insurance: '6300', Household: '5200', Entertainment: '7929', Education: '8220', 'Government Services': '9399' };
    return m[cat] || '0000';
  }
  function bindReport() {
    var report = $('#lh-report');
    function sync() { report.disabled = $$('.lh-cb:checked').length === 0; }
    $$('.lh-cb').forEach(function (cb) { cb.addEventListener('change', sync); });
    var all = $('#lh-cb-all');
    all.onchange = function () { $$('.lh-cb').forEach(function (cb) { cb.checked = all.checked; }); sync(); };
    if (!report._bound) { report._bound = 1; report.addEventListener('click', function () { var ids = $$('.lh-cb:checked').map(function (cb) { return cb.getAttribute('data-id'); }); if (ids.length && openReport) openReport(ids); }); }
    sync();
  }
  function toggleRow(row) {
    var det = row.nextElementSibling;
    if (!det || !det.classList.contains('lh-detail')) return;
    if (det.hasAttribute('hidden')) { det.removeAttribute('hidden'); row.classList.add('exp'); }
    else { det.setAttribute('hidden', ''); row.classList.remove('exp'); }
  }
  function bindRowTools() {
    // whole-row click toggles the detail (ignoring interactive controls)
    $$('#tb-tx tr').forEach(function (row) {
      if (row.classList.contains('lh-detail') || row._rb) return; row._rb = 1;
      row.addEventListener('click', function (e) {
        if (e.target.closest('input, button, a, img.lh-logo, .lh-copyc')) return;
        toggleRow(row);
      });
    });
    $$('#tb-tx .lh-rowtog').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggleRow(btn.closest('tr')); });
    });
    $$('#tb-tx .lh-copyc').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var txt = btn.getAttribute('data-copy');
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
        btn.classList.add('ok');
        setTimeout(function () { btn.classList.remove('ok'); }, 1200);
      });
    });
    $$('#tb-tx .lh-flag, #tb-tx .lh-report-one').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); if (openReport) openReport([btn.getAttribute('data-id')]); });
    });
  }
  function renderOverviewBars() {
    var max = Math.max.apply(null, D.overviewBars) || 1;
    var peak = D.overviewBars.indexOf(max);
    $('#ov-bars').innerHTML = D.overviewBars.map(function (cnt, i) {
      var d = new Date(2026, 4, 11 + i);
      var h = Math.max(3, cnt / max * 100);
      return '<i style="height:' + h + '%"' + (i === peak ? ' class="peak"' : '') + ' title="' + d.getDate() + ' ' + ['May', 'Jun'][d.getMonth() - 4] + ' — ' + cnt.toLocaleString() + ' transactions"></i>';
    }).join('');
    var pd = new Date(2026, 4, 11 + peak);
    var cap = $('#ov-cap');
    if (cap) cap.innerHTML = 'Peak day: <b>' + pd.getDate() + ' ' + ['May', 'Jun'][pd.getMonth() - 4] + '</b> · ' + max.toLocaleString() + ' enriched transactions';
  }
  var stackGran = 'monthly', catDaily = null;
  function ensureCatDaily() {
    if (catDaily) return;
    var idx = {}; D.spendLegend.forEach(function (c, i) { idx[c] = i; });
    catDaily = D.spendLegend.map(function () { var a = [], i; for (i = 0; i < SPAN_DAYS; i++) a.push(0); return a; });
    var fx = D.fx || {}, tx = D.transactions, i;
    for (i = 0; i < tx.length; i++) { var r = tx[i]; if (!r[2]) continue; var ci = idx[r[4]]; if (ci === undefined) continue; catDaily[ci][dayIdx(r[5])] += Math.abs(amtVal(r[6])) * (fx[r[7]] || 1); }
  }
  function renderStack() {
    ensureCatDaily();
    var series = catDaily.map(function (d) { return bucketize(d, stackGran); });
    var labels = series.length ? series[0].labels : [], n = labels.length, p, c;
    var max = 1; for (p = 0; p < n; p++) { var t = 0; for (c = 0; c < series.length; c++) t += series[c].values[p]; if (t > max) max = t; }
    var gap = n > 40 ? '1px' : n > 16 ? '3px' : 'clamp(14px,4vw,48px)';
    var host = $('#spend-stack'); host.style.gap = gap;
    host.innerHTML = labels.map(function (lab, p) {
      var segs = series.map(function (s, c) { var v = s.values[p]; if (!v) return ''; return '<i style="height:' + (v / max * 100).toFixed(2) + '%;background:' + D.spendColors[c] + '" title="' + D.spendLegend[c] + ' — ' + fmtSpend(v) + '"></i>'; }).join('');
      return '<div class="col" title="' + lab + '">' + segs + '</div>';
    }).join('');
    var step = Math.max(1, Math.ceil(n / (n > 40 ? 8 : 12)));
    var labsEl = $('#spend-labs'); labsEl.style.gap = gap;
    labsEl.innerHTML = labels.map(function (lab, p) { return '<span>' + ((p % step === 0 || p === n - 1) ? lab : '') + '</span>'; }).join('');
    $('#spend-legend').innerHTML = D.spendLegend.map(function (l, i) { return '<span><i style="background:' + D.spendColors[i] + '"></i>' + l + '</span>'; }).join('');
  }

  /* ---------- spend treemap (squarified) ---------- */
  var treeEntity = 'categories', treeMetric = 'spend';
  function parseNum(s) { return parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0; }
  function treeData() {
    if (treeEntity === 'categories') return D.categories.map(function (r) { return { name: r[0], color: r[1], spend: parseNum(r[2]), transactions: parseNum(r[3]), customers: parseNum(r[4]) }; });
    return D.brands.map(function (r) { return { name: r[0], color: r[1], spend: parseNum(r[3]), transactions: parseNum(r[4]), customers: parseNum(r[5]) }; });
  }
  function metricOf(d) { return treeMetric === 'spend' ? d.spend : treeMetric === 'customers' ? d.customers : d.transactions; }
  function fmtSpend(n) {
    if (n >= 1e9) return CUR + ' ' + (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (n >= 1e6) return CUR + ' ' + (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return CUR + ' ' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return CUR + ' ' + Math.round(n);
  }
  function fmtNum(n) { return Math.round(n).toLocaleString(); }
  function fmtCount(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return fmtNum(n);
  }
  function renderKpis() {
    var k = D.kpi; if (!k) return;
    var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    // overview
    set('#ov-users', k.customers.toLocaleString());
    set('#ov-usage', k.transactions.toLocaleString());
    set('#ov-usage-max', '/ ' + k.quota.toLocaleString());
    var pct = k.transactions / k.quota * 100;
    var bar = $('#ov-usage-bar'); if (bar) bar.style.width = Math.min(100, pct).toFixed(1) + '%';
    set('#ov-usage-cap', pct.toFixed(1) + '% of annual quota · ' + Math.max(0, k.quota - k.transactions).toLocaleString() + ' remaining');
    // dashboard
    set('#kpi-customers', fmtCount(k.customers));
    set('#kpi-transactions', fmtCount(k.transactions));
    set('#kpi-spend', fmtSpend(k.spend));
    set('#kpi-spendcust', fmtSpend(k.spendPerCustomer));
  }
  function fmtMetric(d) { return treeMetric === 'spend' ? fmtSpend(d.spend) : fmtNum(metricOf(d)); }
  // squarified treemap: returns [{x,y,w,h,ref}]
  function squarify(items, X, Y, W, H) {
    var out = [];
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);
    if (!total) return out;
    var scale = (W * H) / total;
    var areas = items.map(function (i) { return { ref: i.ref, area: i.value * scale }; });
    var rect = { x: X, y: Y, w: W, h: H };
    function worst(row, side) {
      var sum = 0, mx = -Infinity, mn = Infinity;
      for (var i = 0; i < row.length; i++) { var a = row[i].area; sum += a; if (a > mx) mx = a; if (a < mn) mn = a; }
      var s2 = sum * sum, sd2 = side * side;
      return Math.max(sd2 * mx / s2, s2 / (sd2 * mn));
    }
    function layout(row, vertical) {
      var sum = row.reduce(function (s, r) { return s + r.area; }, 0);
      if (vertical) {
        var rw = sum / rect.h, yy = rect.y;
        row.forEach(function (r) { var ch = r.area / rw; out.push({ x: rect.x, y: yy, w: rw, h: ch, ref: r.ref }); yy += ch; });
        rect.x += rw; rect.w -= rw;
      } else {
        var rh = sum / rect.w, xx = rect.x;
        row.forEach(function (r) { var cw = r.area / rh; out.push({ x: xx, y: rect.y, w: cw, h: rh, ref: r.ref }); xx += cw; });
        rect.y += rh; rect.h -= rh;
      }
    }
    var i = 0;
    while (i < areas.length) {
      var vertical = rect.w > rect.h;
      var side = vertical ? rect.h : rect.w;
      var row = [areas[i]], k = i + 1;
      while (k < areas.length) {
        var next = row.concat([areas[k]]);
        if (worst(next, side) <= worst(row, side)) { row = next; k++; } else break;
      }
      layout(row, vertical); i = k;
    }
    return out;
  }
  function renderTree() {
    var host = $('#spend-tree'); if (!host) return;
    var W = host.clientWidth, H = host.clientHeight || 380;
    if (!W) return;
    var data = treeData().filter(function (d) { return metricOf(d) > 0; }).sort(function (a, b) { return metricOf(b) - metricOf(a); });
    var total = data.reduce(function (s, d) { return s + metricOf(d); }, 0);
    var spendTotal = data.reduce(function (s, d) { return s + d.spend; }, 0);
    var cells = squarify(data.map(function (d) { return { value: metricOf(d), ref: d }; }), 0, 0, W, H);
    host.innerHTML = cells.map(function (c) {
      var d = c.ref, pct = metricOf(d) / total * 100;
      var pctTxt = pct >= 1 ? Math.round(pct) + '%' : pct.toFixed(1) + '%';
      var small = c.w < 130 || c.h < 76, tiny = c.w < 74 || c.h < 48;
      return '<div class="lh-cell' + (tiny ? ' tiny' : small ? ' sm' : '') + '" data-i="' + data.indexOf(d) + '" style="left:' + c.x + 'px;top:' + c.y + 'px;width:' + Math.max(0, c.w - 3) + 'px;height:' + Math.max(0, c.h - 3) + 'px;background:' + d.color + '">' +
        '<span class="v">' + fmtMetric(d) + '</span>' +
        '<span class="c">' + d.name + '</span>' +
        '<span class="m">' + fmtNum(d.customers) + ' customers</span>' +
        '<span class="pct">' + pctTxt + '</span></div>';
    }).join('');
    var totalEl = $('#tree-total'), totalL = $('#tree-total-l');
    if (totalEl) totalEl.textContent = treeMetric === 'spend' ? fmtSpend(total).replace('SAR ', '') : fmtNum(total);
    if (totalL) totalL.textContent = treeMetric === 'spend' ? 'Total Spend' : treeMetric === 'customers' ? 'Total Customers' : 'Total Transactions';
    bindTreeTips(data, spendTotal);
  }
  function bindTreeTips(data, spendTotal) {
    var tip = $('#lh-tip'); if (!tip) return;
    var mode = treeEntity;
    $$('#spend-tree .lh-cell').forEach(function (cell) {
      var d = data[+cell.getAttribute('data-i')];
      cell.title = 'View ' + d.name + (mode === 'categories' ? ' category' : '');
      cell.addEventListener('click', function () { tip.classList.remove('show'); if (mode === 'categories') openCategory(d.name); else openBrand(d.name); });
      cell.addEventListener('mousemove', function (e) {
        tip.innerHTML = '<div class="tt"><i style="background:' + d.color + '"></i>' + d.name + '</div><div class="tg">' +
          '<div><div class="tl">Total Spend</div><div class="tv">' + fmtSpend(d.spend) + '</div></div>' +
          '<div><div class="tl">Spend Share</div><div class="tv">' + (d.spend / spendTotal * 100).toFixed(d.spend / spendTotal * 100 >= 1 ? 0 : 1) + '%</div></div>' +
          '<div><div class="tl">Customers</div><div class="tv">' + fmtNum(d.customers) + '</div></div>' +
          '<div><div class="tl">Transaction Count</div><div class="tv">' + fmtNum(d.transactions) + '</div></div></div>';
        tip.style.left = Math.min(e.clientX + 16, window.innerWidth - 212) + 'px';
        tip.style.top = Math.min(e.clientY + 16, window.innerHeight - 110) + 'px';
        tip.classList.add('show');
      });
      cell.addEventListener('mouseleave', function () { tip.classList.remove('show'); });
    });
  }
  $$('#tree-entity button').forEach(function (b) { b.addEventListener('click', function () { treeEntity = b.getAttribute('data-ent'); renderTree(); }); });
  $$('#tree-metric button').forEach(function (b) { b.addEventListener('click', function () { treeMetric = b.getAttribute('data-met'); renderTree(); }); });
  $$('#stack-gran button').forEach(function (b) { b.addEventListener('click', function () { stackGran = b.getAttribute('data-gran'); renderStack(); }); });
  var treeRz; window.addEventListener('resize', function () { clearTimeout(treeRz); treeRz = setTimeout(function () { renderTree(); if (redrawDetail) redrawDetail(); }, 160); });
  // self-heal: render the treemap once its container actually has width (handles collapsed/hidden panels)
  if (window.ResizeObserver) {
    var roDeb; var ro = new ResizeObserver(function () {
      clearTimeout(roDeb); roDeb = setTimeout(function () {
        var host = $('#spend-tree');
        if (host && host.clientWidth > 0 && document.querySelector('#view-dashboard.active') && !host.children.length) renderTree();
        if (redrawDetail && (document.querySelector('#view-catdetail.active') || document.querySelector('#view-branddetail.active'))) redrawDetail();
      }, 120);
    });
    var treeHost = $('#spend-tree'); if (treeHost) ro.observe(treeHost);
  }

  /* ---------- time bucketing (daily / weekly / monthly) ---------- */
  var MON_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var SPAN_START = new Date(2025, 11, 9).getTime(), SPAN_DAYS = 196;
  function dayIdx(dateStr) { var p = dateStr.split(' '); var t = new Date(+p[2], MONTHS[p[1]], +p[0]).getTime(); var i = Math.round((t - SPAN_START) / 86400000); return i < 0 ? 0 : i >= SPAN_DAYS ? SPAN_DAYS - 1 : i; }
  function dayDate(i) { return new Date(SPAN_START + i * 86400000); }
  function dLabel(dt) { return dt.getDate() + ' ' + MON_ABBR[dt.getMonth()]; }
  // group a per-day array into {values,labels} by granularity; supports multi-series (array of daily arrays)
  function bucketize(daily, gran) {
    var vals = [], labels = [], i, j;
    if (gran === 'monthly') {
      var seen = {};
      for (i = 0; i < SPAN_DAYS; i++) { var dt = dayDate(i), k = dt.getFullYear() + '-' + dt.getMonth(); if (seen[k] === undefined) { seen[k] = vals.length; vals.push(0); labels.push(MON_ABBR[dt.getMonth()]); } vals[seen[k]] += daily[i] || 0; }
    } else if (gran === 'weekly') {
      for (i = 0; i < SPAN_DAYS; i += 7) { var s = 0; for (j = i; j < Math.min(i + 7, SPAN_DAYS); j++) s += daily[j] || 0; vals.push(s); labels.push(dLabel(dayDate(i))); }
    } else {
      for (i = 0; i < SPAN_DAYS; i++) { vals.push(daily[i] || 0); labels.push(dLabel(dayDate(i))); }
    }
    return { values: vals, labels: labels };
  }

  /* ---------- category / brand detail pages ---------- */
  var DMONTHS = [['Dec 2025', 2025, 11], ['Jan 2026', 2026, 0], ['Feb 2026', 2026, 1], ['Mar 2026', 2026, 2], ['Apr 2026', 2026, 3], ['May 2026', 2026, 4], ['Jun 2026', 2026, 5]];
  function monthIdx(dateStr) { var p = dateStr.split(' '); var y = +p[2], m = MONTHS[p[1]]; for (var i = 0; i < DMONTHS.length; i++) if (DMONTHS[i][1] === y && DMONTHS[i][2] === m) return i; return -1; }
  var detailReturn = 'dashboard', redrawDetail = null;
  // single pass over transactions matching `match`
  function scanTx(match, keepSample) {
    var monthSpend = [], monthCount = [], dailySpend = [], i;
    for (i = 0; i < DMONTHS.length; i++) { monthSpend.push(0); monthCount.push(0); }
    for (i = 0; i < SPAN_DAYS; i++) dailySpend.push(0);
    var subs = {}, brands = {}, custAll = {}, sample = [], totalSpend = 0, totalTx = 0, fx = D.fx || {};
    var tx = D.transactions;
    for (i = 0; i < tx.length; i++) {
      var r = tx[i]; if (!match(r)) continue;
      var aed = Math.abs(amtVal(r[6])) * (fx[r[7]] || 1);
      dailySpend[dayIdx(r[5])] += aed;
      var mi = monthIdx(r[5]); if (mi >= 0) { monthSpend[mi] += aed; monthCount[mi]++; }
      totalSpend += aed; totalTx++; custAll[r[11]] = 1;
      if (r[2]) { var b = brands[r[2]] || (brands[r[2]] = { spend: 0, tx: 0, cust: {}, color: r[3] }); b.spend += aed; b.tx++; b.cust[r[11]] = 1; }
      var list = r[2] ? (D.subcats[r[4]] || [r[4]]) : D.transferSubs, sc = list[hashStr(r[0]) % list.length];
      var s = subs[sc] || (subs[sc] = { spend: 0, tx: 0, cust: {} }); s.spend += aed; s.tx++; s.cust[r[11]] = 1;
      if (keepSample && sample.length < 80) sample.push(r);
    }
    return { monthSpend: monthSpend, monthCount: monthCount, dailySpend: dailySpend, subs: subs, brands: brands, customers: Object.keys(custAll).length, custKeys: Object.keys(custAll), sample: sample, totalSpend: totalSpend, totalTx: totalTx };
  }
  function ageBandOf(age) { var b = D.ageBands || []; for (var i = 0; i < b.length; i++) if (age >= b[i][1] && age <= b[i][2]) return b[i][0]; return '—'; }
  var GENDER_COLOR = { Male: '#3E5C9C', Female: '#C2796C', Undisclosed: '#84908C' };
  function distBars(sel, items) {
    var el = $(sel); if (!el) return;
    var max = 1, tot = 0, i;
    for (i = 0; i < items.length; i++) { if (items[i].value > max) max = items[i].value; tot += items[i].value; }
    if (!tot) tot = 1;
    el.innerHTML = items.map(function (x) {
      var pct = x.value / tot * 100, w = x.value / max * 100;
      return '<div class="lh-distrow"><span class="dl" title="' + x.label + '">' + x.label + '</span><span class="dbar"><i style="width:' + w.toFixed(1) + '%"></i></span><span class="dv">' + fmtNum(x.value) + ' · ' + pct.toFixed(pct < 10 ? 1 : 0) + '%</span></div>';
    }).join('') || '<div class="lh-muted" style="padding:12px 0;font-size:13px">No data</div>';
  }
  function renderDemographics(custKeys) {
    var ages = {}, gens = {}, nats = {}, cs = D.customers || [], ageSum = 0, ageN = 0;
    custKeys.forEach(function (ci) {
      var c = cs[+ci]; if (!c) return;
      var b = ageBandOf(c.a); ages[b] = (ages[b] || 0) + 1; gens[c.g] = (gens[c.g] || 0) + 1; nats[c.n] = (nats[c.n] || 0) + 1;
      ageSum += c.a; ageN++;
    });
    var ageItems = (D.ageBands || []).map(function (b) { return { label: b[0], value: ages[b[0]] || 0 }; });
    distBars('#br-age', ageItems);
    donut('#br-gender', Object.keys(gens).sort(function (a, b) { return gens[b] - gens[a]; }).map(function (k) { return { name: k, value: gens[k], color: GENDER_COLOR[k] || '#6B8693' }; }));
    var natItems = Object.keys(nats).map(function (k) { return { label: k, value: nats[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
    distBars('#br-nat', natItems);
    setTxt('#br-demo-sub', 'Distribution across ' + custKeys.length.toLocaleString() + ' customers · avg age ' + (ageN ? Math.round(ageSum / ageN) : '—'));
  }
  var MLAB = DMONTHS.map(function (m) { return m[0].split(' ')[0]; });
  function barChart(sel, values, labels, fmtY) {
    var el = $(sel); if (!el) return; var W = el.clientWidth || 560, H = 260, pL = 72, pB = 26, pT = 12, pR = 10;
    var max = Math.max.apply(null, values) || 1, n = values.length, iw = W - pL - pR, ih = H - pT - pB;
    var bw = iw / n * (n > 40 ? 0.82 : n > 14 ? 0.66 : 0.5), rad = bw > 6 ? 4 : 1;
    var step = Math.max(1, Math.ceil(n / 9));
    var grid = [1, 0.5, 0].map(function (f) { var y = pT + ih * (1 - f); return '<line x1="' + pL + '" x2="' + (W - pR) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (pL - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + fmtY(max * f) + '</text>'; }).join('');
    var bars = values.map(function (v, i) {
      var x = pL + iw * (i + 0.5) / n - bw / 2, h = Math.max(v > 0 ? 1 : 0, v / max * ih), y = pT + ih - h;
      var lab = (i % step === 0 || i === n - 1) ? '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + labels[i] + '</text>' : '';
      return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + rad + '" fill="var(--accent)"><title>' + labels[i] + ' — ' + fmtY(v) + '</title></rect>' + lab;
    }).join('');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">' + grid + bars + '</svg>';
  }
  function areaChart(sel, values, fmtY) {
    var el = $(sel); if (!el) return; var W = el.clientWidth || 560, H = 260, pL = 56, pB = 26, pT = 12, pR = 10;
    var max = Math.max.apply(null, values) || 1, n = values.length, iw = W - pL - pR, ih = H - pT - pB;
    var pts = values.map(function (v, i) { return [pL + iw * i / (n - 1), pT + ih - (v / max * ih)]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + pts[n - 1][0].toFixed(1) + ' ' + (pT + ih) + ' L' + pts[0][0].toFixed(1) + ' ' + (pT + ih) + ' Z';
    var grid = [1, 0.5, 0].map(function (f) { var y = pT + ih * (1 - f); return '<line x1="' + pL + '" x2="' + (W - pR) + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (pL - 8) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + fmtY(max * f) + '</text>'; }).join('');
    var xl = values.map(function (v, i) { return '<text x="' + pts[i][0] + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + MLAB[i] + '</text>'; }).join('');
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '"><defs><linearGradient id="lh-ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity=".3"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#lh-ag)"/><path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>' + xl + '</svg>';
  }
  function donut(sel, segs) {
    var el = $(sel); if (!el) return; var tot = segs.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    var r = 66, c = 2 * Math.PI * r, off = 0, cx = 90, cy = 90;
    var arcs = segs.map(function (s) { var frac = s.value / tot, len = frac * c; var seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="26" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + s.name + ' — ' + (frac * 100).toFixed(1) + '%</title></circle>'; off += len; return seg; }).join('');
    var legend = segs.map(function (s) { return '<span><i style="background:' + s.color + '"></i>' + s.name + '</span>'; }).join('');
    el.innerHTML = '<div class="lh-donut-wrap"><svg viewBox="0 0 180 180" width="180" height="180">' + arcs + '</svg><div class="lh-legend lh-donut-legend">' + legend + '</div></div>';
  }
  function setTxt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function openCategory(cat) {
    detailReturn = curView();
    var A = scanTx(function (r) { return r[4] === cat && r[2]; }, false);
    setTxt('#cat-title', cat); ['#cat-bars-name', '#cat-share-name', '#cat-sub-name', '#cat-brands-name'].forEach(function (s) { setTxt(s, cat); });
    setTxt('#cat-k-spend', fmtSpend(A.totalSpend)); setTxt('#cat-k-tx', fmtCount(A.totalTx)); setTxt('#cat-k-cust', fmtCount(A.customers)); setTxt('#cat-k-spc', fmtSpend(A.customers ? A.totalSpend / A.customers : 0));
    var brandArr = Object.keys(A.brands).map(function (k) { return { name: k, value: A.brands[k].spend, color: A.brands[k].color, tx: A.brands[k].tx, cust: Object.keys(A.brands[k].cust).length }; }).sort(function (a, b) { return b.value - a.value; });
    var subArr = Object.keys(A.subs).map(function (k) { return { name: k, spend: A.subs[k].spend, tx: A.subs[k].tx, cust: Object.keys(A.subs[k].cust).length }; }).sort(function (a, b) { return b.spend - a.spend; });
    setTxt('#cat-sub-count', subArr.length + ' subcategories');
    $('#cat-subs').innerHTML = subArr.map(function (s) { return '<tr><td style="font-weight:600">' + s.name + '</td><td class="num">' + fmtSpend(s.spend) + '</td><td class="num">' + fmtNum(s.tx) + '</td><td class="num">' + fmtNum(s.cust) + '</td></tr>'; }).join('');
    $('#cat-brands').innerHTML = brandArr.map(function (b) { return '<tr class="lh-drill" data-brand="' + esc(b.name) + '"><td><span class="lh-name">' + logoImg(b.name, b.color) + b.name + '</span></td><td class="num">' + fmtSpend(b.value) + '</td><td class="num">' + fmtNum(b.tx) + '</td><td class="num">' + fmtNum(b.cust) + '</td></tr>'; }).join('');
    go('catdetail');
    redrawDetail = function () { var sb = bucketize(A.dailySpend, catGran); barChart('#cat-bars', sb.values, sb.labels, fmtSpend); donut('#cat-donut', brandArr.slice(0, 12)); };
    redrawDetail();
    bindLogos($('#cat-brands'));
    $$('#cat-brands .lh-drill').forEach(function (row) { row.addEventListener('click', function (e) { if (e.target.closest('img.lh-logo')) return; openBrand(row.getAttribute('data-brand')); }); });
  }
  function openBrand(brand) {
    detailReturn = curView();
    var A = scanTx(function (r) { return r[2] === brand; }, true);
    var meta = D.brandMeta[brand] || {};
    setTxt('#br-title', brand); setTxt('#br-bars-name', brand); setTxt('#br-cat', 'Category: ' + (meta.cat || '—'));
    setTxt('#br-k-spend', fmtSpend(A.totalSpend)); setTxt('#br-k-tx', fmtCount(A.totalTx)); setTxt('#br-k-cust', fmtCount(A.customers)); setTxt('#br-k-spc', fmtSpend(A.customers ? A.totalSpend / A.customers : 0));
    renderDemographics(A.custKeys);
    go('branddetail');
    redrawDetail = function () { var sb = bucketize(A.dailySpend, brGran); barChart('#br-bars', sb.values, sb.labels, fmtSpend); areaChart('#br-area', A.monthCount, fmtCount); };
    redrawDetail();
  }
  function curView() { var v = document.querySelector('.lh-view.active'); return v ? v.id.replace('view-', '') : 'dashboard'; }
  if ($('#cat-back')) $('#cat-back').addEventListener('click', function () { go(detailReturn); });
  if ($('#br-back')) $('#br-back').addEventListener('click', function () { go(detailReturn); });
  // spend-over-time granularity toggles (detail pages)
  var catGran = 'monthly', brGran = 'monthly';
  $$('#cat-gran button').forEach(function (b) { b.addEventListener('click', function () { catGran = b.getAttribute('data-gran'); if (redrawDetail) redrawDetail(); }); });
  $$('#br-gran button').forEach(function (b) { b.addEventListener('click', function () { brGran = b.getAttribute('data-gran'); if (redrawDetail) redrawDetail(); }); });

  // dynamic tab labels + stacked-chart total
  (function () {
    var ent = $$('#tree-entity button');
    if (ent[0]) ent[0].textContent = 'Categories (' + D.categories.length + ')';
    if (ent[1]) ent[1].textContent = 'Brands (' + D.brands.length + ')';
    var st = 0; D.spendMonths.forEach(function (m) { m[1].forEach(function (v) { st += v; }); });
    var stEl = $('#stack-total'); if (stEl) stEl.textContent = fmtSpend(st).replace(CUR + ' ', '');
  })();

  renderKpis(); renderCategories(''); renderBrands(); renderBrandsMini(); renderTransactions(); renderOverviewBars(); renderStack();

  /* ---------- Brand Explorer: search + filter dropdowns ---------- */
  (function () {
    var search = $('#exp-search'); if (!search) return;
    search.addEventListener('input', debounce(renderBrands, 160));
    // populate category dropdown from data
    var list = $('#exp-cat-list');
    if (list) {
      var cats = D.categories.map(function (c) { return c[0]; }).sort();
      list.innerHTML = '<button data-cat="" class="on">All categories</button>' + cats.map(function (c) { return '<button data-cat="' + esc(c) + '">' + c + '</button>'; }).join('');
      $$('#exp-cat-list button').forEach(function (b) {
        b.addEventListener('click', function () {
          $$('#exp-cat-list button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          expFilters.cat = b.getAttribute('data-cat');
          $('#exp-cat-btn').firstChild.textContent = expFilters.cat ? expFilters.cat + ' ' : 'Category ';
          var cd = document.querySelector('#view-explorer .lh-fdrop[data-drop="cat"] .lh-fbtn'); if (cd) cd.classList.toggle('has-filters', !!expFilters.cat);
          closeDrops(); renderBrands();
        });
      });
    }
    // dropdown open/close
    function closeDrops() { $$('#view-explorer .lh-fdrop').forEach(function (d) { d.classList.remove('open'); }); }
    $$('#view-explorer .lh-fdrop .lh-fbtn').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); var d = btn.closest('.lh-fdrop'); var was = d.classList.contains('open'); closeDrops(); if (!was) d.classList.add('open'); });
    });
    $$('#view-explorer .lh-fpanel').forEach(function (p) { p.addEventListener('click', function (e) { e.stopPropagation(); }); });
    document.addEventListener('click', function (e) { if (!e.target.closest('#view-explorer .lh-fdrop')) closeDrops(); });
    // apply filters
    function num(id) { var v = $(id) && $(id).value; return v === '' || v == null ? undefined : parseFloat(v); }
    $('#exp-apply').addEventListener('click', function () {
      expFilters.spendMin = num('#f-spend-min'); expFilters.spendMax = num('#f-spend-max');
      expFilters.txMin = num('#f-tx-min'); expFilters.txMax = num('#f-tx-max');
      expFilters.custMin = num('#f-cust-min'); expFilters.custMax = num('#f-cust-max');
      expFilters.spcMin = num('#f-spc-min'); expFilters.spcMax = num('#f-spc-max');
      expFilters.sortField = $('#f-sort-field').value; expFilters.sortOrder = $('#f-sort-order').value || 'desc';
      // reflect active state on the pill buttons
      [['spend', expFilters.spendMin != null || expFilters.spendMax != null], ['tx', expFilters.txMin != null || expFilters.txMax != null], ['cust', expFilters.custMin != null || expFilters.custMax != null], ['spc', expFilters.spcMin != null || expFilters.spcMax != null], ['sort', !!expFilters.sortField]].forEach(function (p) {
        var d = document.querySelector('#view-explorer .lh-fdrop[data-drop="' + p[0] + '"] .lh-fbtn'); if (d) d.classList.toggle('has-filters', p[1]);
      });
      var cd = document.querySelector('#view-explorer .lh-fdrop[data-drop="cat"] .lh-fbtn'); if (cd) cd.classList.toggle('has-filters', !!expFilters.cat);
      closeDrops(); renderBrands();
    });
  })();
  var txSearchDeb = debounce(function () { txPage = 0; renderTransactions(); }, 160);
  $('#tx-search').addEventListener('input', txSearchDeb);
  if ($('#tx-id')) $('#tx-id').addEventListener('input', txSearchDeb);

  /* sortable headers */
  $$('#view-transactions th.sortable').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (txSort.key === key) txSort.dir = -txSort.dir; else { txSort.key = key; txSort.dir = 1; }
      $$('#view-transactions th.sortable').forEach(function (h) { h.classList.remove('sort-asc', 'sort-desc'); });
      th.classList.add(txSort.dir === 1 ? 'sort-desc' : 'sort-asc');
      txPage = 0; renderTransactions();
    });
  });

  /* ---------- filter modal ---------- */
  (function () {
    var modal = $('#tx-filter'); if (!modal) return;
    var btn = $('#tx-filter-btn'), pill = btn;
    // populate selects
    var catSel = $('#f-category');
    D.categories.forEach(function (c) { var o = document.createElement('option'); o.value = c[0]; o.textContent = c[0]; catSel.appendChild(o); });
    var curSel = $('#f-currency');
    (D.currencies || []).forEach(function (cur) { var o = document.createElement('option'); o.value = cur; o.textContent = cur; curSel.appendChild(o); });
    var ctrySel = $('#f-country');
    if (ctrySel) { ctrySel.innerHTML = '<option value="">Select</option>'; (D.countries || []).forEach(function (c) { var o = document.createElement('option'); o.value = c.name; o.textContent = c.name; ctrySel.appendChild(o); }); }
    $$('.lh-fl select').forEach(function (s) { s.addEventListener('change', function () { s.classList.toggle('chosen', !!s.value); }); });
    function open() { modal.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(function () { $('#f-merchant').focus(); }, 30); }
    function close() { modal.classList.remove('open'); document.body.style.overflow = ''; }
    function apply() {
      txFilters = {
        merchant: $('#f-merchant').value.trim().toLowerCase(),
        brand: $('#f-brand').value.trim().toLowerCase(),
        category: $('#f-category').value,
        currency: $('#f-currency').value,
        country: $('#f-country') ? $('#f-country').value : '',
        mcc: $('#f-mcc') ? $('#f-mcc').value.trim() : '',
        emptyDesc: $('#f-empty').checked
      };
      var n = 0;
      ['f-merchant', 'f-brand', 'f-category', 'f-mcc', 'f-currency', 'f-country', 'f-from', 'f-to', 'f-source', 'f-rtype', 'f-rstatus'].forEach(function (id) { var el = $('#' + id); if (el && el.value) n++; });
      if ($('#f-empty').checked) n++;
      pill.classList.toggle('has-filters', n > 0);
      var badge = pill.querySelector('.lh-fcount');
      if (n > 0) { if (!badge) { badge = document.createElement('span'); badge.className = 'lh-fcount'; pill.appendChild(badge); } badge.textContent = n; }
      else if (badge) badge.remove();
      txPage = 0; close(); renderTransactions();
    }
    function clear() {
      $('#tx-filter-form').reset();
      $$('.lh-fl select').forEach(function (s) { s.classList.remove('chosen'); });
      txFilters = {};
      pill.classList.remove('has-filters');
      var badge = pill.querySelector('.lh-fcount'); if (badge) badge.remove();
      txPage = 0; renderTransactions();
    }
    btn.addEventListener('click', open);
    $('#tx-filter-x').addEventListener('click', close);
    $('#tx-clear').addEventListener('click', clear);
    $('#tx-filter-form').addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  })();

  /* ---------- report transaction modal (feedback loop) ---------- */
  (function () {
    var modal = $('#tx-report'); if (!modal) return;
    var typeSel = $('#rp-type'), targets = [];
    openReport = function (ids) {
      targets = ids || [];
      $('#tx-report-form').reset(); typeSel.classList.remove('chosen'); typeSel.style.borderColor = '';
      $('#rp-target').textContent = targets.length > 1 ? targets.length + ' transactions selected' : 'Transaction ' + (targets[0] || '');
      modal.classList.add('open'); document.body.style.overflow = 'hidden';
      setTimeout(function () { typeSel.focus(); }, 30);
    };
    function close() { modal.classList.remove('open'); document.body.style.overflow = ''; }
    typeSel.addEventListener('change', function () { typeSel.classList.toggle('chosen', !!typeSel.value); });
    function submit() {
      if (!typeSel.value) { typeSel.focus(); typeSel.style.borderColor = '#B05A52'; return; }
      close();
      toast(targets.length > 1 ? targets.length + ' transactions reported · feedback sent to Lune Enrichment' : 'Transaction reported · feedback sent to Lune Enrichment');
    }
    $('#tx-report-x').addEventListener('click', close);
    $('#rp-cancel').addEventListener('click', close);
    $('#tx-report-form').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
  })();
  function toast(msg) {
    var t = $('#lh-toast');
    if (!t) { t = document.createElement('div'); t.id = 'lh-toast'; t.className = 'lh-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- logo lightbox (click a logo to enlarge) ---------- */
  (function () {
    var box = $('#lh-logobox'); if (!box) return;
    var big = box.querySelector('img');
    big.addEventListener('error', function () {
      if (big.getAttribute('data-fb') !== '1') { big.setAttribute('data-fb', '1'); big.src = favicon(big.getAttribute('data-domain'), 64); }
    });
    function close() { box.classList.remove('open'); }
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.lh-logobox-x')) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
  })();

  /* ---------- segmented toggles (visual state) ---------- */
  $$('.lh-seg').forEach(function (seg) {
    $$('button', seg).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('button', seg).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
  });

  /* ---------- copy buttons ---------- */
  $$('.lh-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var txt = btn.getAttribute('data-copy');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
      btn.classList.add('ok');
      setTimeout(function () { btn.classList.remove('ok'); }, 1200);
    });
  });

  /* ---------- restore session ---------- */
  // SSO path
  var sso = $('#lh-sso');
  if (sso) sso.addEventListener('click', function () {
    setAuthed(true);
    go(localStorage.getItem('lunehub.proto.view') || 'overview');
  });

  // restore session — unless ?login=1 forces the sign-in screen
  var forceLogin = /[?&]login=1/.test(location.search);
  var authed = false;
  try { authed = localStorage.getItem(AUTH_KEY) === '1'; } catch (e) {}
  if (authed && !forceLogin) { setAuthed(true); go(localStorage.getItem('lunehub.proto.view') || 'overview'); }
})();
