/*
 * Page content that comes from data files: the "Our games" cards, the community statistics
 * and the donation options in the support section. Also runs the scroll fade-in. Donation
 * checkout itself lives in donate.js.
 */
(function () {
  'use strict';

  var games = window.BGP_GAMES || [];
  var cfg = window.BGP_DONATE_CONFIG || {};
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function statusClass(status) {
    var s = String(status || '').toLowerCase();
    if (s === 'released') return 'status--released';
    if (s === 'in development') return 'status--dev';
    return 'status--soon';
  }

  var ORNAMENT = '<svg class="game-media__ornament" aria-hidden="true" viewBox="0 0 32 32"><path d="M16 3v26M8 11h16"/><circle cx="16" cy="11" r="6.5" opacity=".5"/></svg>';

  /* Real artwork if the game has it, otherwise a clean title cover (decorative). */
  function gameMedia(game) {
    var media = el('div', 'game-media');
    if (game.image) {
      var img = el('img');
      img.src = game.image;
      img.alt = game.imageAlt || game.title;
      img.loading = 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    } else {
      media.classList.add('game-media--placeholder');
      media.setAttribute('aria-hidden', 'true');
      media.insertAdjacentHTML('beforeend', ORNAMENT);
      media.appendChild(el('span', 'game-media__title', game.title));
      media.appendChild(el('span', 'game-media__rule'));
    }
    return media;
  }

  /* ---------- Our games ---------- */

  var grid = document.querySelector('[data-games]');
  if (grid) {
    games.forEach(function (game) {
      var card = el('article', 'game reveal');
      var mediaWrap = el('div', 'game__media');
      mediaWrap.appendChild(gameMedia(game));
      if (game.status) mediaWrap.appendChild(el('span', 'game__status ' + statusClass(game.status), game.status));
      card.appendChild(mediaWrap);

      var body = el('div', 'game__body');
      body.appendChild(el('h3', 'game__title', game.title));
      if (game.description) body.appendChild(el('p', 'game__desc', game.description));
      var links = (game.links || []).filter(function (l) { return l && l.url; });
      if (links.length) {
        var linkRow = el('div', 'game__links');
        links.forEach(function (l) {
          var a = el('a', 'game__link', l.label);
          a.href = l.url;
          a.rel = 'noopener';
          a.target = '_blank';
          a.setAttribute('aria-label', game.title + ' on ' + l.label + ' (opens in a new tab)');
          a.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>');
          linkRow.appendChild(a);
        });
        body.appendChild(linkRow);
      }
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  /* ---------- Donation options shown in the support section ---------- */

  var money = function (n) {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: cfg.currency || 'EUR', maximumFractionDigits: 0 }).format(n);
  };

  var tierList = document.querySelector('[data-plan-tiers]');
  if (tierList) {
    (cfg.monthlyTiers || []).forEach(function (t, i) {
      var li = el('li', t.recommended ? 'is-recommended' : '');
      var btn = el('button', 'tiers__row');
      btn.type = 'button';
      btn.setAttribute('data-donate', '');
      btn.dataset.mode = 'monthly';
      btn.dataset.tier = String(i);
      var amount = el('span', 'tiers__amount', money(t.amount));
      amount.appendChild(el('small', null, '/month'));
      btn.appendChild(amount);
      var name = el('span', 'tiers__name', t.shortName || t.name);
      if (t.recommended) name.appendChild(el('span', 'tiers__badge', 'Recommended'));
      btn.appendChild(name);
      li.appendChild(btn);
      tierList.appendChild(li);
    });
  }

  var amountBox = document.querySelector('[data-plan-amounts]');
  if (amountBox) {
    (cfg.oneTimeAmounts || []).forEach(function (n) {
      var b = el('button', 'quick-amount', money(n));
      b.type = 'button';
      b.setAttribute('data-donate', '');
      b.dataset.mode = 'once';
      b.dataset.amount = String(n);
      amountBox.appendChild(b);
    });
    var custom = el('button', 'quick-amount quick-amount--custom', 'Custom');
    custom.type = 'button';
    custom.setAttribute('data-donate', '');
    custom.dataset.mode = 'once';
    custom.dataset.custom = '1';
    amountBox.appendChild(custom);
  }

  /* ---------- Community statistics ---------- */

  /*
   * data/stats.json holds, per platform, the figures it contributes to each statistic and the
   * date they were last verified. A figure that is null is not included. See STATS.md.
   */
  var STATS = {
    playersReached: { fields: ['players'] },
    supporters: { fields: ['supporters', 'purchases'] },
    totalContributions: { fields: ['contributions'], money: true },
  };
  var STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000; // a daily refresh that failed twice
  var dateFmt = function (d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function toDate(v) { var d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; }

  function loadStats() {
    if (!window.fetch) return;
    fetch('data/stats.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(renderStats)
      .catch(function () { /* keep the pending state; never show made-up numbers */ });
  }

  function renderStats(data) {
    var platforms = (data && data.platforms) || {};
    var currency = (data && data.currency) || 'EUR';
    var now = Date.now();
    var anyShown = false;
    var stale = {};

    Object.keys(STATS).forEach(function (key) {
      var def = STATS[key];
      var card = document.querySelector('[data-stat="' + key + '"]');
      if (!card) return;
      var total = 0;
      var included = [];
      Object.keys(platforms).forEach(function (id) {
        var p = platforms[id] || {};
        var used = false;
        def.fields.forEach(function (field) {
          if (!isNum(p[field])) return;
          total += p[field];
          used = true;
          var asOf = toDate(p[field + 'AsOf']) || toDate(p.verifiedAt);
          if (!asOf || now - asOf.getTime() > STALE_AFTER_MS) {
            var name = p.name || id;
            if (!stale[name] || (asOf && asOf < stale[name])) stale[name] = asOf || true;
          }
        });
        if (used) included.push(p.name || id);
      });
      if (!included.length) return;

      var format = def.money
        ? function (n) { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(n); }
        : function (n) { return new Intl.NumberFormat('en-IE').format(n); };
      card.classList.add('has-value');
      countUp(card.querySelector('[data-value]'), Math.floor(total), format);
      card.querySelector('[data-sources]').textContent = 'Includes ' + included.join(' · ');
      anyShown = true;
    });

    if (!anyShown) return;
    var updated = document.querySelector('[data-stats-updated]');
    var updatedAt = toDate(data.updatedAt);
    if (updated && updatedAt) updated.textContent = 'Last updated ' + dateFmt(updatedAt);

    var staleBox = document.querySelector('[data-stats-stale]');
    var names = Object.keys(stale);
    if (staleBox && names.length) {
      staleBox.textContent = names.map(function (name) {
        return stale[name] === true
          ? name + ' figures may be out of date.'
          : name + ' figures were last verified on ' + dateFmt(stale[name]) + ' and may be out of date.';
      }).join(' ');
    }
  }

  function countUp(node, target, format) {
    if (reduceMotion || typeof window.IntersectionObserver !== 'function') { node.textContent = format(target); return; }
    node.textContent = format(0);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = null;
      var duration = 1800;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        node.textContent = format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(node);
  }

  loadStats();

  /* ---------- Footer year + scroll fade-in ---------- */

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  if (document.documentElement.classList.contains('js-reveal')) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (node) { reveal.observe(node); });
  }
})();
