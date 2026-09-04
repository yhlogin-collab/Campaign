/* campaign.js — Chabad of Carrollton-Lewisville annual campaign layer.
   Loads on every page of the site; exits at once unless this is the campaign page.
   Everything it adds is built here and inserted into the platform's DOM. */
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════════════════
     PLATFORM CONFIG — the one block that knows ChabadOne's markup.
     Every selector is a best guess until the live campaign page exists.
     Correct them here and nowhere else. window.CMP_CONFIG (set by preview.html)
     may override any key. Placeholders are replaced at deploy time.
     ═══════════════════════════════════════════════════════════════════════════ */
  var CONFIG = {
    // Campaign pages live under /templates/fundraising/…; .fs-root is the platform's own wrapper.
    pagePath: /\/templates\/fundraising\//i,
    sel: {
      // VERIFIED against last year's page (aid 7043033)
      root: '.fs-root',
      header: '.fs-header',
      orgName: '.fs-header .page-header h1 small',
      title: '.fs-header .page-header h1 > span',
      subtitle: '.fs-header .page-header h2',
      heroButtons: '.fs-header .donate-flex',
      topBar: '.fs-header-top',
      money: '.fs-goal',
      moneyGoalText: '.fs-goal-text',
      moneyBar: '.fs-goal-graph',
      moneyFill: '.fs-goal-graph-fill',
      moneyTotal: '.fs-total-raised-amount',
      moneyGoal: '.fs-original-goal',
      moneyMeta: '.fs-goal-graph-text',
      matchBox: '.fs-matchers',
      countdownBand: '.fs-countdowndonate',
      countdown: '.fs-countdown',
      countdownMsg: '.fs-countdown-message',
      sideDonate: '.fs-donate',
      decor: '.fs-right-triangle, .fs-bottom-triangle, .fs-left-border-triangle, .fs-left-triangle, .fs-top-border-triangle, .fs-top-triangle',
      donateBtn: '.js-action-open-donate',
      wallSection: '.donar-section',
      wallTabs: '.donar-section .nav-tabs',
      wallFilters: '.right-filters-data',
      wall: '.js-donors-list',
      donor: '.donate-item',
      donorName: '.user-name',
      donorTime: '.time',
      donorTeam: '.team-up',
      donorAmount: '.donate-A',
      donorDedication: '.description',
      footer: '.fs-footer',
      // VERIFIED against a live donate form (copied from an open campaign's lightbox)
      lightbox: '.js-donate-form',
      form: '#fs-donate-form',
      lightboxTitle: '.fs-donate-header h2',
      sectionTitle: '.fs-donate-body h3',
      amountRadio: 'input[name="x_amount"]',
      otherRadio: '#PresetOther',
      otherAmount: '.js-other-amount',
      tier: 'label.fs-donation-option',
      effective: '.fs-effective-donation-container',
      recurringWrap: 'sites-recurring-options',
      recurring: '#inputRecurring',
      submitBtn: '.fs-btn-donate'
    },
    // The length of a monthly plan is the campaign's own setting (recurring for a year). The page never writes
    // plan_payments; this number is used only in the wording of the confirmation box.
    monthlyMonths: 12,
    nudgeMin: 100, nudgeMax: 1800, // one-time gifts in this range get the nudge
    // Test mode: open the campaign page with ?cmptest=1 → the nudge fires from $1 and proposes the same amount
    // monthly, so a $1 gift can verify the 12-payment plan end to end. Nobody else is affected.
    testMode: /[?&]cmptest=1/.test(location.search),
    matchCopy: /will be matched|will be doubled|matching funds|double in value/i,
    // Published Google Sheet (File → Share → Publish to web → CSV). Either layout works:
    //   row 1 headers / row 2 values   or   one "name,value" pair per row.
    dataUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTtLst8n1GMPTUoSolWBQ6p8oJXooWJAd664Hh-5aZdRtvosnjJWM3Eiq2G6q9IUPKbmbzcXQG2lqCX/pub?output=csv',
    mitzvahForm: 'https://docs.google.com/forms/d/e/1FAIpQLSechY_cR0CuvtqJ_8dSnKjd2nMO8uvSFduF1nvZ1G8rC4RCLQ/viewform',
    // Field ids from the form's "Get pre-filled link" (entry.NNNNNNN). Empty = open the form unfilled.
    mitzvahEntries: { mitzvah: 'entry.1811438944', path: 'entry.1300651748' },
    assetBase: 'PLACEHOLDER_ASSET_BASE',
    campaignEnd: '2026-09-20T18:00:00-05:00', // Sept 20, 2026, 6:00 pm Central (CDT)
    pollMs: 5000,
    pipStyle: 'flame', // 'flame' (Lucide flame, fills gold as donors join) or 'chai' (the letters חי)
    // Feature flags. Mitzvah tracker + section ship off until that part of the campaign is ready.
    features: { chai: true, mitzvah: true, ticks: false },
    chaiGoalFallback: 36,
    mitzvahGoalFallback: 100
  };
  if (window.CMP_CONFIG) {
    var ov = window.CMP_CONFIG;
    for (var k in ov) if (k !== 'sel' && k !== 'features') CONFIG[k] = ov[k];
    if (ov.sel) for (var s in ov.sel) CONFIG.sel[s] = ov.sel[s];
    if (ov.features) for (var f in ov.features) CONFIG.features[f] = ov.features[f];
  }
  /* ═══════════════════════ end of platform config ════════════════════════ */

  var $ = function (sel, ctx) { try { return (ctx || document).querySelector(sel); } catch (e) { return null; } };
  var $$ = function (sel, ctx) { try { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); } catch (e) { return []; } };
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var a in attrs) {
      if (a === 'text') n.textContent = attrs[a];
      else if (a === 'html') n.innerHTML = attrs[a];
      else n.setAttribute(a, attrs[a]);
    }
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function tagAll(sel, cls, ctx) { $$(sel, ctx).forEach(function (n) { n.classList.add(cls); }); }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function parseAmount(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : null; }
  function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── page detection ─────────────────────────────────────────────────────── */
  function init() {
    var root = $(CONFIG.sel.root);
    if (!root && !CONFIG.pagePath.test(location.pathname)) return;
    root = root || $('main') || document.body;
    root.classList.add('cmp-root');

    tagPlatform(root);
    buildDashboard(root);
    if (CONFIG.features.mitzvah) buildMitzvah(root);
    wireLightbox();
    startPolling();

    // The platform re-renders parts of the page live (new donors, totals).
    // Re-tag on changes; every step below is idempotent.
    var pending = null;
    new MutationObserver(function () {
      if (pending) return;
      pending = setTimeout(function () { pending = null; tagPlatform(root); wireLightbox(); }, 200);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ── 1. restyle what the platform renders: tag it, hide the match box ───── */
  function tagPlatform(root) {
    var S = CONFIG.sel;
    tagAll(S.header, 'cmp-header', root);
    tagAll(S.topBar, 'cmp-topbar', root);
    tagAll(S.orgName, 'cmp-org', root);
    tagAll(S.title, 'cmp-title', root);
    tagAll(S.subtitle, 'cmp-subtitle', root);
    tagAll(S.heroButtons, 'cmp-hero-buttons', root);
    tagAll(S.money, 'cmp-money', root);
    tagAll(S.moneyGoalText, 'cmp-money-goaltext', root);
    tagAll(S.moneyBar, 'cmp-money-bar', root);
    tagAll(S.moneyFill, 'cmp-money-fill', root);
    tagAll(S.moneyTotal, 'cmp-money-total', root);
    tagAll(S.moneyGoal, 'cmp-money-goal', root);
    tagAll(S.moneyMeta, 'cmp-money-meta', root);
    tagAll(S.countdownBand, 'cmp-countdown-band', root);
    tagAll(S.countdown, 'cmp-countdown', root);
    tagAll(S.countdownMsg, 'cmp-countdown-msg', root);
    tagAll(S.sideDonate, 'cmp-side-donate', root);
    tagAll(S.decor, 'cmp-hidden', root);
    tagAll(S.donateBtn, 'cmp-donate-btn', root);
    tagAll(S.wallSection, 'cmp-wall-section', root);
    tagAll(S.wallTabs, 'cmp-wall-tabs', root);
    tagAll(S.wallFilters, 'cmp-wall-filters', root);
    tagAll(S.wall, 'cmp-wall', root);
    tagAll(S.donorName, 'cmp-donor-name', root);
    tagAll(S.donorTime, 'cmp-donor-time', root);
    tagAll(S.donorTeam, 'cmp-donor-team', root);
    tagAll(S.donorAmount, 'cmp-donor-amount', root);
    tagAll(S.footer, 'cmp-footer', root);
    $$(S.donor, root).forEach(function (d) {
      d.classList.add('cmp-donor');
      var ded = $(S.donorDedication, d);
      if (!ded) return;
      ded.classList.add('cmp-donor-dedication');
      if (ded.textContent.trim()) d.classList.add('cmp-donor--dedicated');
    });
    // The whole matchers band goes; the $1 match is gone after the first gift.
    tagAll(S.matchBox, 'cmp-hidden', root);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      var p = node.parentElement;
      if (!p || p.closest('.cmp-injected, .fs-about-text') || !CONFIG.matchCopy.test(node.nodeValue)) continue;
      if (p.textContent.length < 200) p.classList.add('cmp-hidden');
    }
    if (CONFIG.features.ticks) addChaiTicks(root);
  }

  // A tick on the money bar every $18,000 — chai as the campaign's unit of measure.
  function addChaiTicks(root) {
    var S = CONFIG.sel;
    var bar = $(S.moneyBar, root), goalEl = $(S.moneyGoal, root);
    if (!bar || !goalEl || bar.parentNode.querySelector('.cmp-ticks')) return;
    var m = goalEl.textContent.replace(/,/g, '').match(/(\d{4,})/);
    var goal = m ? parseInt(m[1], 10) : null;
    if (!goal) return;
    var ticks = el('div', { 'class': 'cmp-ticks cmp-injected', 'aria-hidden': 'true' });
    for (var v = 18000; v < goal; v += 18000) {
      var t = el('span', { 'class': 'cmp-tick', text: '$' + (v / 1000) + 'k' });
      t.style.left = (v / goal * 100) + '%';
      ticks.appendChild(t);
    }
    bar.parentNode.insertBefore(ticks, bar.nextSibling);
  }

  /* ── 2. the two count trackers ──────────────────────────────────────────── */
  var trackers = {};
  var dash = null;

  function buildDashboard(root) {
    var moneyEl = $(CONFIG.sel.money, root);
    dash = el('div', { 'class': 'cmp-dash cmp-injected cmp-hidden', 'aria-live': 'polite' });
    trackers.chai = makeTracker('chai', 'Goal: 36 new Chai Club partners', 'Help us reach our goal of 36 new monthly partners and keep the lights on all year round. Chai Club starts at $18/mo, and your full year of giving counts toward the $100,000 goal today.', 'new Chai partners');
    trackers.mitzvah = makeTracker('mitzvah', 'Goal: 100 people', '', 'people have taken on a mitzvah');
    dash.appendChild(trackers.chai.el);
    dash.appendChild(trackers.mitzvah.el);
    if (moneyEl && moneyEl.parentNode) moneyEl.parentNode.insertBefore(dash, moneyEl.nextSibling);
    else { dash.classList.add('cmp-dash--alone'); var h = $(CONFIG.sel.header, root); if (h) h.parentNode.insertBefore(dash, h.nextSibling); else root.insertBefore(dash, root.firstChild); }
  }

  function makeTracker(kind, title, sub, unit) {
    var count = el('span', { 'class': 'cmp-tracker-count', text: '' });
    var of = el('span', { 'class': 'cmp-tracker-of', text: '' });
    var fill = el('div', { 'class': 'cmp-tracker-fill' });
    var bar = el('div', { 'class': 'cmp-tracker-bar', role: 'progressbar', 'aria-valuemin': '0' }, [fill]);
    var node = el('div', { 'class': 'cmp-tracker', 'data-kind': kind }, [
      el('div', { 'class': 'container cmp-tracker-inner' }, [
        el('div', { 'class': 'cmp-tracker-text' }, [
          el('div', { 'class': 'cmp-tracker-title', text: title }),
          el('div', { 'class': 'cmp-tracker-sub', text: sub })
        ]),
        el('div', { 'class': 'cmp-tracker-graph' }, [bar, el('div', { 'class': 'cmp-tracker-figure' }, [count, of])])
      ])
    ]);
    return { el: node, countEl: count, ofEl: of, barEl: bar, fillEl: fill, unit: unit || '', count: null, goal: null };
  }

  function renderTracker(t, count, goal) {
    if (t.count === count && t.goal === goal) return; // same value: no re-render, no motion
    var first = t.count === null;
    t.countEl.textContent = String(count);
    t.ofEl.textContent = ' of ' + goal + (t.unit ? ' ' + t.unit : '');
    t.el.style.setProperty('--cmp-pct', Math.min(100, count / goal * 100) + '%');
    t.barEl.style.setProperty('--cmp-seg', (100 / goal) + '%'); // one cell per member
    t.barEl.setAttribute('aria-valuenow', String(count));
    t.barEl.setAttribute('aria-valuemax', String(goal));
    t.el.setAttribute('aria-label', count + ' of ' + goal);
    if (!first && !reducedMotion) {
      t.countEl.classList.remove('cmp-tracker-count--bump');
      void t.countEl.offsetWidth;
      t.countEl.classList.add('cmp-tracker-count--bump');
    }
    t.count = count; t.goal = goal;
  }

  var latestProgress = null; // the nudge reads the live Chai Club count from here
  function applyProgress(p) {
    latestProgress = p;
    var anyShown = false;
    [['chai', p.chaiCount, p.chaiGoal, CONFIG.chaiGoalFallback],
     ['mitzvah', p.mitzvahCount, p.mitzvahGoal, CONFIG.mitzvahGoalFallback]].forEach(function (row) {
      var t = trackers[row[0]], count = row[1], goal = row[2] || row[3];
      if (!CONFIG.features[row[0]] || count === null || !goal) { t.el.classList.add('cmp-hidden'); return; }
      t.el.classList.remove('cmp-hidden');
      renderTracker(t, count, goal);
      anyShown = true;
    });
    var inDash = Object.keys(trackers).some(function (k) { return trackers[k].el.parentNode === dash && !trackers[k].el.classList.contains('cmp-hidden'); });
    dash.classList.toggle('cmp-hidden', !inDash);
  }
  function hideTrackers() { if (dash) dash.classList.add('cmp-hidden'); }

  // The single data source. Ships against a static JSON file; a live feed is
  // swapped in behind this same function later. Everything downstream only
  // knows the returned shape.
  async function getProgress() {
    var url = CONFIG.dataUrl + (CONFIG.dataUrl.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();
    var res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('progress feed ' + res.status);
    var text = await res.text(), raw;
    try { raw = JSON.parse(text); } catch (e) { raw = parseCsv(text); }
    var num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? Math.max(0, Math.round(n)) : null; };
    return { chaiCount: num(raw.chaiCount), chaiGoal: num(raw.chaiGoal), mitzvahCount: num(raw.mitzvahCount), mitzvahGoal: num(raw.mitzvahGoal) };
  }
  // Google Sheets CSV → {key: value}. Keys are matched loosely (case, spaces) so a typo like "chaiGoa" still lands.
  function parseCsv(text) {
    var rows = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(function (l) { return l.split(',').map(function (c) { return c.trim().replace(/^"|"$/g, ''); }); });
    var keys = ['chaiCount', 'chaiGoal', 'mitzvahCount', 'mitzvahGoal'], out = {};
    var match = function (s) { s = String(s).toLowerCase().replace(/[^a-z]/g, ''); for (var i = 0; i < keys.length; i++) { var k = keys[i].toLowerCase(); if (s === k || (s.length >= 5 && k.indexOf(s) === 0)) return keys[i]; } return null; };
    var pairs = rows.every(function (r) { return r.length >= 2 && match(r[0]) && r[1] !== ''; });
    if (pairs) { rows.forEach(function (r) { out[match(r[0])] = r[1]; }); return out; }
    var head = rows[0] || [], vals = rows[1] || [];
    head.forEach(function (h, i) { var k = match(h); if (k) out[k] = vals[i]; });
    return out;
  }

  var pollTimer = null;
  var lastGood = null;
  function poll() { getProgress().then(function (p) {
      var empty = p.chaiCount === null && p.mitzvahCount === null;
      if (empty && lastGood) p = lastGood;          // unrecognizable feed (e.g. wrong tab published): keep the last good numbers
      else if (!empty) lastGood = p; try { document.dispatchEvent(new CustomEvent('cmp:progress', { detail: p })); } catch (e) {} applyProgress(p); }, function () { if (!lastGood) hideTrackers(); }); }
  function startPolling() {
    if (pollTimer) return;
    poll();
    pollTimer = setInterval(poll, CONFIG.pollMs);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { clearInterval(pollTimer); pollTimer = null; }
      else if (!pollTimer) { poll(); pollTimer = setInterval(poll, CONFIG.pollMs); }
    });
  }

  /* ── 5. mitzvah section ─────────────────────────────────────────────────── */
  function buildMitzvah(root) {
    var options = [
      { title: 'Torah study', formValue: 'Torah Study', desc: 'Join a class, learn online, or buy a Jewish book.', paths: ['Join one of our classes', 'Learn online', 'Buy a Jewish book'] },
      { title: 'Tzedakah', desc: 'Give a little, often, to a cause you choose.', paths: ['Tzedakah box for my home', 'Give daily with the awesome Colel Chabad app'] },
      { title: 'Mezuzah', desc: 'Get a mezuzah for your doorway or check the one you have to make sure it\u2019s kosher.', paths: ['Get a mezuzah for my home', 'Have my mezuzahs checked'] }
    ];
    var grid = el('div', { 'class': 'cmp-options' });
    options.forEach(function (o, i) {
      var listId = 'cmp-paths-' + i;
      var list = el('ul', { 'class': 'cmp-paths', id: listId, hidden: '' }, o.paths.map(function (p) {
        var btn = el('button', { 'class': 'cmp-path', type: 'button', text: p });
        btn.addEventListener('click', function () { openMitzvahForm(o.formValue || o.title, p, btn); });
        return el('li', null, [btn]);
      }));
      var toggle = el('button', { 'class': 'cmp-btn cmp-btn--secondary cmp-option-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': listId, text: 'See how' });
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        toggle.textContent = open ? 'See how' : 'Close';
        if (open) list.setAttribute('hidden', ''); else list.removeAttribute('hidden');
      });
      grid.appendChild(el('div', { 'class': 'cmp-option' }, [
        el('div', { 'class': 'cmp-option-title', text: o.title }), el('p', { 'class': 'cmp-option-desc', text: o.desc }), toggle, list]));
    });
    var own = el('button', { 'class': 'cmp-own', type: 'button', text: 'Have a different mitzvah in mind? Add your own' });
    own.addEventListener('click', function () { openMitzvahForm('Other', '', own); });
    var side = trackers.mitzvah.el;
    side.classList.add('cmp-tracker--vertical');
    $('.cmp-tracker-inner', side).classList.remove('container'); // Bootstrap's .container would size and center it over the cards
    var section = el('div', { 'class': 'cmp-mitzvah cmp-injected' }, [el('div', { 'class': 'container' }, [
      el('div', { 'class': 'cmp-mitzvah-title', text: 'Take on a mitzvah for the New Year' }),
      el('p', { 'class': 'cmp-mitzvah-lede', text: 'Choose a mitzvah in one of these categories or add your own.' }),
      el('div', { 'class': 'cmp-mitzvah-body' }, [side, el('div', { 'class': 'cmp-options-wrap' }, [grid, own])])
    ])]);
    var wall = $(CONFIG.sel.wallSection, root);
    if (wall && wall.parentNode) wall.parentNode.insertBefore(section, wall); else root.appendChild(section);
  }

  // The Google Form opens in a lightbox on the page, mitzvah and path pre-selected when the field ids are set.
  function openMitzvahForm(mitzvah, path, returnTo) {
    var E = CONFIG.mitzvahEntries, q = ['embedded=true', 'usp=pp_url'];
    // "Other" is a free-text choice: Google pre-fills it as __other_option__ plus the typed text
    if (E.mitzvah && mitzvah === 'Other') q.push(E.mitzvah + '=__other_option__', E.mitzvah + '.other_option_response=');
    else if (E.mitzvah && mitzvah) q.push(E.mitzvah + '=' + encodeURIComponent(mitzvah));
    if (E.path && path) q.push(E.path + '=' + encodeURIComponent(path));
    var frame = el('iframe', { 'class': 'cmp-form-frame', src: CONFIG.mitzvahForm + '?' + q.join('&'), title: 'Mitzvah pledge form' });
    var close = el('button', { 'class': 'cmp-form-close', type: 'button', 'aria-label': 'Close', text: '\u00D7' });
    var modal = el('div', { 'class': 'cmp-form-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Take on a mitzvah' }, [close, frame]);
    var overlay = el('div', { 'class': 'cmp-overlay cmp-overlay--form cmp-injected' }, [modal]);
    function shut() { document.removeEventListener('keydown', onKey, true); overlay.remove(); if (returnTo && returnTo.focus) returnTo.focus(); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); shut(); } }
    close.addEventListener('click', shut);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) shut(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    close.focus();
  }

  /* ── 3 & 4. the lightbox: frequency toggle, monthly confirmation, nudge ─── */
  var nudgeFired = false;

  // The platform's amount is a radio group; "Other" is a radio plus a number input.
  function currentAmount(form) {
    var S = CONFIG.sel, checked = $(S.amountRadio + ':checked', form);
    if (!checked) return null;
    if (checked.matches(S.otherRadio)) return parseAmount(($(S.otherAmount, form) || {}).value);
    return parseAmount(checked.value);
  }
  function setAmount(form, n) {
    var S = CONFIG.sel;
    var preset = $$(S.amountRadio, form).filter(function (r) { return !r.matches(S.otherRadio) && parseAmount(r.value) === n; })[0];
    if (preset) { preset.click(); return; }
    var other = $(S.otherRadio, form), input = $(S.otherAmount, form);
    if (!other || !input) return;
    other.click();
    input.value = String(n);
    ['input', 'change', 'keyup'].forEach(function (t) { fire(input, t); });
  }
  function isMonthly(form) { var r = $(CONFIG.sel.recurring, form); return !!(r && r.checked); }
  function setMonthly(form, on) { var r = $(CONFIG.sel.recurring, form); if (r && r.checked !== on) r.click(); }

  function wireLightbox() {
    var S = CONFIG.sel;
    tagAll(S.lightbox, 'cmp-lightbox');
    tagAll(S.lightboxTitle, 'cmp-lightbox-title');
    tagAll(S.sectionTitle, 'cmp-section-title');
    tagAll(S.tier, 'cmp-tier');
    tagAll(S.otherAmount, 'cmp-amount');
    tagAll(S.effective, 'cmp-hidden'); // "Effective Donation" only meant something while the match ran
    tagAll(S.submitBtn, 'cmp-submit');
    $$(S.form).forEach(function (form) {
      if ($('.cmp-freq', form)) { syncForm(form); return; } // already built (or a platform clone of a built form)
      var rec = $(S.recurring, form), submit = $(S.submitBtn, form);
      if (!rec || !submit) return; // markup differs: leave the form untouched
      var wrap = $(S.recurringWrap, form) || rec.closest('.checkbox') || rec.parentNode;
      // Frequency toggle. Drives the platform's own checkbox; one-time stays the default.
      var once = el('button', { 'class': 'cmp-freq-opt', type: 'button', 'data-cmp-freq': 'once', 'aria-pressed': 'true' }, [
        'Give once', el('span', { 'class': 'cmp-freq-hint', text: 'A single gift today' })]);
      var monthly = el('button', { 'class': 'cmp-freq-opt', type: 'button', 'data-cmp-freq': 'monthly', 'aria-pressed': 'false' }, [
        'Give monthly', el('span', { 'class': 'cmp-freq-hint', text: 'Join the Chai Club' })]);
      wrap.parentNode.insertBefore(el('div', { 'class': 'cmp-freq cmp-injected', role: 'group', 'aria-label': 'How often' }, [once, monthly]), wrap);
      wrap.classList.add('cmp-native-freq');
      // Loud confirmation whenever monthly is on.
      submit.parentNode.insertBefore(el('div', { 'class': 'cmp-confirm cmp-injected', role: 'status', hidden: '' }), submit);
      syncForm(form);
    });
  }
  function syncForm(form) {
    var S = CONFIG.sel, on = isMonthly(form);
    $$('.cmp-freq-opt', form).forEach(function (btn) { btn.setAttribute('aria-pressed', String((btn.getAttribute('data-cmp-freq') === 'monthly') === on)); });
    var box = $('.cmp-confirm', form);
    if (!box) return;
    if (!on) { box.setAttribute('hidden', ''); return; }
    var amt = currentAmount(form), months = CONFIG.monthlyMonths;
    box.textContent = '';
    box.appendChild(el('b', { text: amt ? money(amt) : 'Your gift' }));
    box.appendChild(document.createTextNode(' every month' + (months ? ' for ' + months + ' months' : '') + '. First charge today. Cancel anytime.'));
    box.removeAttribute('hidden');
  }
  // Delegated: the platform clones the form into its lightbox, and clones don't carry listeners.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest('.cmp-freq-opt');
    var form = e.target.closest(CONFIG.sel.form);
    if (btn && form) { setMonthly(form, btn.getAttribute('data-cmp-freq') === 'monthly'); syncForm(form); return; }
    if (form) setTimeout(function () { syncForm(form); }, 0);
  });
  ['change', 'input'].forEach(function (t) {
    document.addEventListener(t, function (e) { var f = e.target && e.target.closest ? e.target.closest(CONFIG.sel.form) : null; if (f) syncForm(f); });
  });

  // The nudge fires when the donor settles on a one-time amount — before any card details are typed —
  // never on the Donate click, which the platform uses for fraud checks and card tokenization.
  function maybeNudge(form) {
    if (nudgeFired || !form || isMonthly(form)) return;
    var amount = currentAmount(form), monthlyAmt = monthlyFor(amount);
    if (!monthlyAmt) return;
    nudgeFired = true;
    var returnTo = $(CONFIG.sel.recurringWrap, form) ? $('.cmp-freq-opt', form) : null;
    openNudge(amount, monthlyAmt, returnTo, function accept() {
      setMonthly(form, true);
      setAmount(form, monthlyAmt);
      syncForm(form);
    }, function decline() { /* keep the one-time gift exactly as entered */ });
  }
  document.addEventListener('change', function (e) {
    try {
      var t = e.target, S = CONFIG.sel;
      if (!t || !t.closest || !t.matches(S.amountRadio) || t.matches(S.otherRadio)) return;
      var form = t.closest(S.form);
      if (form) setTimeout(function () { maybeNudge(form); }, 150); // let the platform mark the tier first
    } catch (err) { }
  });
  document.addEventListener('focusout', function (e) {
    try {
      var t = e.target, S = CONFIG.sel;
      if (!t || !t.matches || !t.matches(S.otherAmount)) return;
      var form = t.closest(S.form);
      if (form && parseAmount(t.value)) setTimeout(function () { maybeNudge(form); }, 150);
    } catch (err) { }
  });

  // The rule, not the table. Ladder rungs are the figures this community knows.
  var LADDER = [18, 25, 36, 54, 72, 100, 118, 144, 180];
  function monthlyFor(amount) {
    if (amount === null) return null;
    if (CONFIG.testMode) return amount >= 1 ? Math.round(amount) : null;
    if (amount < CONFIG.nudgeMin || amount > CONFIG.nudgeMax) return null;
    var target = amount / 8, i = 0;
    for (var j = 1; j < LADDER.length; j++) {
      if (Math.abs(LADDER[j] - target) <= Math.abs(LADDER[i] - target)) i = j; // ties round up
    }
    var ok = function (idx) { return LADDER[idx] * 12 >= amount * 1.2; };          // hard rule
    while (!ok(i)) { if (++i >= LADDER.length) return null; }
    while (i > 0 && LADDER[i] * 12 - amount > 600 && ok(i - 1)) i--;              // soft rule
    return LADDER[i];
  }

  function openNudge(amount, monthly, returnTo, onAccept, onDecline) {
    var p = latestProgress || {}, count = p.chaiCount, goal = p.chaiGoal || CONFIG.chaiGoalFallback;
    var haveCount = typeof count === 'number' && count < goal;
    var title = el('div', { 'class': 'cmp-modal-title', id: 'cmp-nudge-title' }, [
      'Excuse the chutzpah.', el('span', { 'class': 'cmp-modal-kicker', text: 'Would you consider joining the Chai Club?' })]);
    var figure = el('div', { 'class': 'cmp-modal-figure' }, [money(monthly), el('small', { text: 'a month' })]);
    // The count is live from the sheet; if it can't be read, the sentence about it is left out.
    var copy = el('p', { id: 'cmp-nudge-desc', text: haveCount
      ? 'We\u2019re at ' + count + ' of our goal of ' + goal + ' new Chai Club partners. Would you consider being number ' + (count + 1) + '?'
      : 'Chai Club partners give monthly, starting at $18, and help us plan a whole year of programming.' });
    var decline = el('button', { 'class': 'cmp-btn cmp-btn--primary cmp-btn--block', type: 'button', text: 'Keep my ' + money(amount) + ' gift' });
    var accept = el('button', { 'class': 'cmp-btn cmp-btn--secondary cmp-btn--block', type: 'button' }, [
      'Join the Chai Club at ' + money(monthly) + ' a month', el('span', { 'class': 'cmp-btn-hint', text: 'or any amount you choose' })]);
    var modal = el('div', { 'class': 'cmp-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'cmp-nudge-title', 'aria-describedby': 'cmp-nudge-desc' },
      [title, figure, copy, el('div', { 'class': 'cmp-modal-actions' }, [decline, accept])]);
    var overlay = el('div', { 'class': 'cmp-overlay cmp-injected' }, [modal]);
    var previous = document.activeElement;

    function close(cb) {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (returnTo && returnTo.focus) returnTo.focus(); else if (previous && previous.focus) previous.focus();
      cb();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(onDecline); return; }
      if (e.key !== 'Tab') return;
      var f = [decline, accept];
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[1]) { e.preventDefault(); f[0].focus(); }
      else if (!modal.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); }
    }
    accept.addEventListener('click', function () { close(onAccept); });
    decline.addEventListener('click', function () { close(onDecline); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(onDecline); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    decline.focus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
