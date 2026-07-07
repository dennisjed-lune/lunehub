/* LuneHub — demo data generator v3
   Account: Dubai Retail Group · 2,000 customers · ~300k transactions
   Multi-country / multi-currency · full Lune enrichment fields per transaction.
   Customers have a brand-affinity subset (not everyone on every brand).
   Seeded so figures are stable across reloads. */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rand = mulberry32(20260622);
  function ri(n) { return Math.floor(rand() * n); }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmtAmt(n) { return n.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function fmt2(n) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  var BASE = 'AED';
  var FX = { AED: 1, SAR: 0.979, QAR: 1.008, KWD: 11.93, OMR: 9.54, BHD: 9.74, USD: 3.6725, GBP: 4.66, EUR: 3.99, INR: 0.044, EGP: 0.0755 };
  var COUNTRIES = {
    UAE: { name: 'United Arab Emirates', code: 'ARE', cur: 'AED', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Al Ain'] },
    KSA: { name: 'Saudi Arabia', code: 'SAU', cur: 'SAR', cities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca'] },
    QAT: { name: 'Qatar', code: 'QAT', cur: 'QAR', cities: ['Doha', 'Al Rayyan'] },
    KWT: { name: 'Kuwait', code: 'KWT', cur: 'KWD', cities: ['Kuwait City', 'Hawalli'] },
    OMN: { name: 'Oman', code: 'OMN', cur: 'OMR', cities: ['Muscat', 'Salalah'] },
    BHR: { name: 'Bahrain', code: 'BHR', cur: 'BHD', cities: ['Manama', 'Riffa'] },
    USA: { name: 'United States', code: 'USA', cur: 'USD', cities: ['New York', 'San Francisco', 'Seattle'] },
    GBR: { name: 'United Kingdom', code: 'GBR', cur: 'GBP', cities: ['London', 'Manchester'] },
    FRA: { name: 'France', code: 'FRA', cur: 'EUR', cities: ['Paris', 'Nice'] },
    IND: { name: 'India', code: 'IND', cur: 'INR', cities: ['Mumbai', 'Bengaluru', 'Delhi'] },
    EGY: { name: 'Egypt', code: 'EGY', cur: 'EGP', cities: ['Cairo', 'Alexandria'] }
  };
  var SCOPE = {
    uae: [['UAE', 100]],
    gcc: [['UAE', 70], ['KSA', 12], ['QAT', 8], ['KWT', 5], ['OMN', 3], ['BHR', 2]],
    global: [['UAE', 55], ['USA', 18], ['GBR', 10], ['IND', 8], ['EGY', 5], ['FRA', 4]],
    travel: [['UAE', 60], ['GBR', 10], ['IND', 10], ['KSA', 8], ['EGY', 6], ['FRA', 6]]
  };
  function pickCountry(scope) {
    var arr = SCOPE[scope], tot = 0, i;
    for (i = 0; i < arr.length; i++) tot += arr[i][1];
    var r = rand() * tot;
    for (i = 0; i < arr.length; i++) { r -= arr[i][1]; if (r <= 0) return arr[i][0]; }
    return arr[0][0];
  }

  var CATMETA = {
    Groceries: { c: '#2F8C82', sub: 6, mcc: '5411' }, Shopping: { c: '#C2796C', sub: 9, mcc: '5651' },
    Electronics: { c: '#3E5C9C', sub: 5, mcc: '5732' }, Dining: { c: '#C8A878', sub: 7, mcc: '5812' },
    Travel: { c: '#0F4F47', sub: 4, mcc: '4722' }, Transportation: { c: '#6B8693', sub: 8, mcc: '4121' },
    Entertainment: { c: '#8A6B7E', sub: 6, mcc: '7832' }, Services: { c: '#5E7A8A', sub: 5, mcc: '4814' },
    'Financial Services': { c: '#1C645D', sub: 4, mcc: '6012' }, Wellness: { c: '#7FA8A1', sub: 7, mcc: '5912' }
  };
  var SUBCATS = {
    Groceries: ['Supermarkets', 'Convenience Stores', 'Specialty Food', 'Bakeries'],
    Shopping: ['Department Stores', 'Fashion & Apparel', 'Online Marketplace', 'Footwear'],
    Electronics: ['Consumer Electronics', 'Computers', 'Mobile & Accessories'],
    Dining: ['Restaurants', 'Fast Food', 'Cafes', 'Food Delivery'],
    Travel: ['Airlines', 'Hotels', 'Travel Agencies'],
    Transportation: ['Ride Hailing', 'Fuel', 'Tolls & Parking'],
    Entertainment: ['Cinemas', 'Theme Parks', 'Events'],
    Services: ['Telecom', 'Utilities', 'Professional Services'],
    'Financial Services': ['Banking', 'Insurance', 'Investments'],
    Wellness: ['Pharmacies', 'Fitness', 'Personal Care']
  };
  var TRANSFER_SUBS = ['Money Transfers to Others', 'Salary Credit', 'ATM Withdrawal', 'Bill Payment', 'Card to Card Transfer', 'Government Fees'];
  var CARBON = { Travel: 0.18, Transportation: 0.12, Electronics: 0.06, Shopping: 0.04, Groceries: 0.03, Dining: 0.025, Services: 0.02, Entertainment: 0.02, 'Financial Services': 0.005, Wellness: 0.02 };

  var LOCS = { UAE: ['Mall of the Emirates', 'The Dubai Mall', 'Dubai Marina', 'Deira City Centre', 'Yas Mall AUH', 'City Centre Sharjah'] };
  // name, category, color, weight, avgAED, descTemplate, scope, arabic, url
  var BRANDS = [
    ['Carrefour', 'Groceries', '#2F8C82', 9, 180, 'CARREFOUR {loc}', 'uae', 'كارفور', 'carrefouruae.com'],
    ['Lulu Hypermarket', 'Groceries', '#3E7A72', 7, 150, 'LULU HYPERMARKET {city}', 'uae', 'لولو هايبر ماركت', 'luluhypermarket.com'],
    ['Spinneys', 'Groceries', '#4E9488', 4, 230, 'SPINNEYS {city}', 'uae', 'سبينس', 'spinneys.com'],
    ['Union Coop', 'Groceries', '#5E7A72', 3, 160, 'UNION COOP {city}', 'uae', 'جمعية الاتحاد', 'unioncoop.ae'],
    ['Marhaba Mart', 'Groceries', '#1C645D', 6, 120, 'MARHABA MART {city}', 'uae', 'مرحبا مارت', 'marhabamart.ae'],
    ['Noon', 'Shopping', '#C2796C', 7, 240, 'NOON.COM {city}', 'global', 'نون', 'noon.com'],
    ['Amazon', 'Shopping', '#B0682E', 7, 210, 'AMAZON {ctry} PAYMENTS', 'global', 'أمازون', 'amazon.ae'],
    ['Namshi', 'Shopping', '#9C5A6B', 4, 320, 'NAMSHI.COM {city}', 'gcc', 'نمشي', 'namshi.com'],
    ['Centrepoint', 'Shopping', '#A8453E', 3, 380, 'CENTREPOINT {city}', 'uae', 'سنتربوينت', 'centrepointstores.com'],
    ['Max Fashion', 'Shopping', '#B05A52', 3, 190, 'MAX FASHION {city}', 'uae', 'ماكس', 'maxfashion.com'],
    ['Ounass', 'Shopping', '#7E5A6B', 2, 1200, 'OUNASS.COM {city}', 'gcc', 'أناس', 'ounass.ae'],
    ['Sharaf DG', 'Electronics', '#3E5C9C', 4, 850, 'SHARAF DG {city}', 'gcc', 'شرف دي جي', 'sharafdg.com'],
    ['Apple Store', 'Electronics', '#2E4A7C', 3, 1800, 'APPLE STORE {city}', 'global', 'آبل', 'apple.com'],
    ['Jumbo Electronics', 'Electronics', '#4E6CAC', 2, 720, 'JUMBO ELECTRONICS {city}', 'uae', 'جامبو', 'jumbo.ae'],
    ['Talabat', 'Dining', '#C8A878', 8, 75, 'TALABAT.COM {city}', 'gcc', 'طلبات', 'talabat.com'],
    ['Deliveroo', 'Dining', '#3E9C9C', 5, 85, 'DELIVEROO {city}', 'gcc', 'دليفرو', 'deliveroo.ae'],
    ['Shake Shack', 'Dining', '#9C8A5E', 3, 95, 'SHAKE SHACK {city}', 'gcc', 'شيك شاك', 'shakeshack.ae'],
    ['Starbucks', 'Dining', '#1E6B52', 6, 38, 'STARBUCKS {city}', 'gcc', 'ستاربكس', 'starbucks.ae'],
    ['KFC', 'Dining', '#A8453E', 4, 55, 'KFC {city}', 'gcc', 'كنتاكي', 'kfc.ae'],
    ['Emirates', 'Travel', '#0F4F47', 5, 2600, 'EMIRATES {city}', 'travel', 'طيران الإمارات', 'emirates.com'],
    ['Etihad Airways', 'Travel', '#84713E', 3, 2400, 'ETIHAD AIRWAYS {city}', 'travel', 'الاتحاد للطيران', 'etihad.com'],
    ['flydubai', 'Travel', '#2F7A6E', 3, 900, 'FLYDUBAI {city}', 'travel', 'فلاي دبي', 'flydubai.com'],
    ['Air Arabia', 'Travel', '#A8453E', 3, 650, 'AIR ARABIA {city}', 'travel', 'العربية للطيران', 'airarabia.com'],
    ['Careem', 'Transportation', '#1E7A5E', 7, 32, 'CAREEM {city}', 'gcc', 'كريم', 'careem.com'],
    ['Uber', 'Transportation', '#2C2C30', 5, 38, 'UBER TRIP {city}', 'global', 'أوبر', 'uber.com'],
    ['ENOC', 'Transportation', '#6B8693', 5, 160, 'ENOC STATION {city}', 'uae', 'إينوك', 'enoc.com'],
    ['ADNOC', 'Transportation', '#5E7A8A', 5, 170, 'ADNOC {city}', 'uae', 'أدنوك', 'adnocdistribution.ae'],
    ['Salik', 'Transportation', '#84908C', 4, 20, 'SALIK TOLL GATE {city}', 'uae', 'سالك', 'salik.ae'],
    ['VOX Cinemas', 'Entertainment', '#8A6B7E', 4, 90, 'VOX CINEMAS {city}', 'uae', 'فوكس سينما', 'voxcinemas.com'],
    ['Emaar Entertainment', 'Entertainment', '#7E5A6B', 2, 260, 'EMAAR ENTERTAINMENT {city}', 'uae', 'إعمار للترفيه', 'emaarentertainment.com'],
    ['Etisalat e&', 'Services', '#5E7A8A', 5, 320, 'ETISALAT e& {city}', 'uae', 'اتصالات', 'etisalat.ae'],
    ['du', 'Services', '#6B8693', 4, 280, 'DU TELECOM {city}', 'uae', 'دو', 'du.ae'],
    ['DEWA', 'Services', '#4E6C7C', 4, 540, 'DEWA UTILITY {city}', 'uae', 'ديوا', 'dewa.gov.ae'],
    ['Emirates NBD', 'Financial Services', '#1C645D', 3, 1500, 'EMIRATES NBD {city}', 'uae', 'بنك الإمارات دبي الوطني', 'emiratesnbd.com'],
    ['Aster Pharmacy', 'Wellness', '#7FA8A1', 4, 110, 'ASTER PHARMACY {city}', 'gcc', 'صيدلية آستر', 'asterpharmacy.com'],
    ['Fitness First', 'Wellness', '#5E8A82', 2, 300, 'FITNESS FIRST {city}', 'uae', 'فيتنس فيرست', 'fitnessfirstme.com']
  ];
  var pool = [];
  BRANDS.forEach(function (b, i) { for (var k = 0; k < b[3]; k++) pool.push(i); });
  var brandMeta = {};
  BRANDS.forEach(function (b) { brandMeta[b[0]] = { ar: b[7], url: b[8], cat: b[1] }; });

  var END = new Date(2026, 5, 22);            // 22 Jun 2026
  var WIN_START = new Date(2026, 4, 11);      // overview window day 0 (11 May)
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(d) { return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }

  var transactions = [];
  var byBrand = {}, byCat = {}, byCountry = {}, monthCat = {};
  var dayCounts = []; for (var i = 0; i < 31; i++) dayCounts.push(0);
  var idc = 89000000, refc = 158000000;
  var TRANSFER_RATE = 0.22;

  for (var c = 0; c < 2000; c++) {
    // brand affinity subset (6–14 brands) — weighted draw without replacement
    var aff = {}, affList = [], want = 6 + ri(9), guard = 0;
    while (affList.length < want && guard < 80) { var bi = pool[ri(pool.length)]; if (!aff[bi]) { aff[bi] = 1; affList.push(bi); } guard++; }
    // activity tier → transaction count
    var roll = rand(), n;
    if (roll < 0.5) n = 30 + ri(70); else if (roll < 0.85) n = 100 + ri(140); else n = 240 + ri(260);

    for (var t = 0; t < n; t++) {
      var off = ri(196), d = new Date(END.getTime() - off * 86400000);
      var di = Math.round((d.getTime() - WIN_START.getTime()) / 86400000);
      if (di >= 0 && di < 31) dayCounts[di]++;
      var id = String(idc++);

      if (rand() < TRANSFER_RATE) {
        // transfer / unenriched
        var amtT = Math.max(5, Math.round((10 + rand() * rand() * 6000) * 100) / 100);
        var raw = rand() < 0.12 ? '' : 'Electron-Ref#20000000000' + (refc++);
        transactions.push([id, raw, '', '#6B8693', 'Transfer', fmtDate(d), '-' + fmtAmt(amtT), 'AED',
          'United Arab Emirates', 'ARE', '', c]);
        continue;
      }
      // enriched merchant transaction
      var b = BRANDS[affList[ri(affList.length)]];
      var ck = pickCountry(b[6]), C = COUNTRIES[ck], cur = C.cur;
      var city = C.cities[ri(C.cities.length)];
      var aed = Math.max(2, b[4] * (0.4 + rand() * 1.6));
      var local = aed / FX[cur];
      var raw2 = b[5].replace('{loc}', (LOCS.UAE[ri(LOCS.UAE.length)])).replace('{city}', city).replace('{ctry}', C.code);
      transactions.push([id, raw2, b[0], b[2], b[1], fmtDate(d), '-' + fmtAmt(local), cur,
        C.name, C.code, CATMETA[b[1]].mcc, c]);

      var bb = byBrand[b[0]] || (byBrand[b[0]] = { spend: 0, tx: 0, cust: {}, color: b[2], cat: b[1] });
      bb.spend += aed; bb.tx++; bb.cust[c] = 1;
      var cc = byCat[b[1]] || (byCat[b[1]] = { spend: 0, tx: 0, cust: {}, color: CATMETA[b[1]].c });
      cc.spend += aed; cc.tx++; cc.cust[c] = 1;
      var co = byCountry[C.name] || (byCountry[C.name] = { spend: 0, tx: 0, code: C.code, cur: cur });
      co.spend += aed; co.tx++;
      var mk = d.getFullYear() + '-' + d.getMonth(), mc = monthCat[mk] || (monthCat[mk] = {});
      mc[b[1]] = (mc[b[1]] || 0) + aed;
    }
  }

  function nKeys(o) { return Object.keys(o.cust).length; }
  var brands = Object.keys(byBrand).map(function (k) {
    var b = byBrand[k], cn = nKeys(b);
    return [k, b.color, b.cat, 'AED ' + fmtInt(b.spend), fmtInt(b.tx), fmtInt(cn), 'AED ' + fmt2(b.spend / cn)];
  }).sort(function (a, b) { return parseFloat(b[3].replace(/[^0-9.]/g, '')) - parseFloat(a[3].replace(/[^0-9.]/g, '')); });
  var categories = Object.keys(byCat).map(function (k) {
    var c = byCat[k], cn = nKeys(c);
    return [k, c.color, 'AED ' + fmtInt(c.spend), fmtInt(c.tx), fmtInt(cn), CATMETA[k].sub];
  }).sort(function (a, b) { return parseFloat(b[2].replace(/[^0-9.]/g, '')) - parseFloat(a[2].replace(/[^0-9.]/g, '')); });
  var countries = Object.keys(byCountry).map(function (k) {
    var c = byCountry[k];
    return { name: k, code: c.code, cur: c.cur, spend: c.spend, tx: c.tx };
  }).sort(function (a, b) { return b.spend - a.spend; });

  var totalSpend = 0; Object.keys(byCat).forEach(function (k) { totalSpend += byCat[k].spend; });
  var topCats = categories.slice(0, 7).map(function (r) { return r[0]; });
  var months = [['Dec 2025', 2025, 11], ['Jan 2026', 2026, 0], ['Feb 2026', 2026, 1], ['Mar 2026', 2026, 2], ['Apr 2026', 2026, 3], ['May 2026', 2026, 4], ['Jun 2026', 2026, 5]];
  var spendMonths = months.map(function (m) {
    var mc = monthCat[m[1] + '-' + m[2]] || {};
    return [m[0], topCats.map(function (cat) { return Math.round(mc[cat] || 0); })];
  });
  var curList = {}; transactions.forEach(function (r) { curList[r[7]] = 1; });

  // ---- customer demographics: age / gender / nationality (per customer index) ----
  var rd = mulberry32(70707);
  function wpool(arr) { var p = []; arr.forEach(function (x) { for (var i = 0; i < x[1]; i++) p.push(x[0]); }); return p; }
  var AGE_BANDS = [['18–24', 18, 24, 15], ['25–34', 25, 34, 32], ['35–44', 35, 44, 26], ['45–54', 45, 54, 16], ['55–64', 55, 64, 8], ['65+', 65, 72, 4]];
  var ageBandPool = wpool(AGE_BANDS.map(function (b, i) { return [i, b[3]]; }));
  var genPool = wpool([['Male', 58], ['Female', 40], ['Undisclosed', 2]]);
  var natPool = wpool([['Indian', 28], ['Emirati', 16], ['Pakistani', 12], ['Egyptian', 9], ['Filipino', 8], ['British', 6], ['Bangladeshi', 5], ['Jordanian', 4], ['Lebanese', 4], ['Saudi', 3], ['Other', 5]]);
  var customers = [];
  for (var cix = 0; cix < 2000; cix++) {
    var bnd = AGE_BANDS[ageBandPool[Math.floor(rd() * ageBandPool.length)]];
    customers.push({ a: bnd[1] + Math.floor(rd() * (bnd[2] - bnd[1] + 1)), g: genPool[Math.floor(rd() * genPool.length)], n: natPool[Math.floor(rd() * natPool.length)] });
  }

  window.LH_DATA = {
    currency: BASE,
    currencies: Object.keys(curList),
    countries: countries,
    countryMeta: COUNTRIES,
    brandMeta: brandMeta,
    subcats: SUBCATS,
    transferSubs: TRANSFER_SUBS,
    carbon: CARBON,
    fx: FX,
    customers: customers,
    ageBands: AGE_BANDS.map(function (b) { return [b[0], b[1], b[2]]; }),
    kpi: { customers: 2000, transactions: transactions.length, spend: totalSpend, spendPerCustomer: totalSpend / 2000, quota: 600000 },
    categories: categories,
    brands: brands,
    transactions: transactions,
    overviewBars: dayCounts,
    spendMonths: spendMonths,
    spendColors: topCats.map(function (cat) { return CATMETA[cat].c; }),
    spendLegend: topCats.slice()
  };
})();
