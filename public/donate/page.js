/*
 * Page content that comes from data files: the hero game showcase, the "Our games" cards,
 * the community statistics, and the donation options in the support section. Also runs the
 * scroll fade-in. Donation checkout itself lives in donate.js.
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

  /* Real artwork if the game has it, otherwise a clearly marked placeholder. */
  function gameMedia(game, options) {
    var media = el('div', 'game-media');
    if (game.image) {
      var img = el('img');
      img.src = game.image;
      img.alt = options && options.decorative ? '' : (game.imageAlt || game.title);
      img.loading = options && options.eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      media.appendChild(img);
    } else {
      media.classList.add('game-media--placeholder');
      media.appendChild(el('span', 'game-media__title', game.title));
      media.appendChild(el('span', 'game-media__note', 'Artwork coming soon'));
    }
    return media;
  }

  /* ---------- Hero showcase: up to three games, those with real artwork first ---------- */

  var showcase = document.querySelector('[data-hero-games]');
  if (showcase && games.length) {
    var picks = games.filter(function (g) { return g.image; })
      .concat(games.filter(function (g) { return !g.image; }))
      .slice(0, 3);
    // Put the strongest card (first pick) in the middle, on top.
    var order = picks.length === 3 ? [picks[1], picks[0], picks[2]] : picks;
    order.forEach(function (game, i) {
      var card = el('div', 'showcase__card showcase__card--' + (order.length === 3 ? ['left', 'front', 'right'][i] : 'front'));
      card.appendChild(gameMedia(game, { decorative: true, eager: true }));
      var cap = el('div', 'showcase__caption');
      cap.appendChild(el('span', 'showcase__title', game.title));
      if (game.status) cap.appendChild(el('span', 'showcase__status', game.status));
      card.appendChild(cap);
      showcase.appendChild(card);
    });
    showcase.setAttribute('aria-label', 'Games by Bible Games Project: ' + picks.map(function (g) { return g.title; }).join(', '));
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
      body.appendChild(el('p', 'game__desc' + (game.description ? '' : ' game__desc--pending'),
        game.description || 'More about this game soon.'));
      if (game.link) {
        var a = el('a', 'game__link');
        a.href = game.link;
        a.rel = 'noopener';
        a.target = '_blank';
        a.textContent = game.linkLabel ? 'Get it on ' + game.linkLabel : 'Visit the game';
        a.insertAdjacentHTML('beforeend', '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg>');
        body.appendChild(a);
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

  var SOURCE_NAMES = {
    googlePlay: 'Google Play', appStore: 'App Store', steam: 'Steam',
    paypal: 'PayPal', paypalDonors: 'PayPal donors', storePurchases: 'store purchases',
  };

  function loadStats() {
    if (!window.fetch) return;
    fetch('data/stats.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(renderStats)
      .catch(function () { /* keep the pending state; never show made-up numbers */ });
  }

  function renderStats(data) {
    var stats = (data && data.stats) || {};
    var currency = data.currency || 'EUR';
    var anyShown = false;

    Object.keys(stats).forEach(function (key) {
      var card = document.querySelector('[data-stat="' + key + '"]');
      if (!card) return;
      var sources = stats[key].sources || {};
      var included = Object.keys(sources).filter(function (s) {
        return typeof sources[s] === 'number' && isFinite(sources[s]);
      });
      if (!included.length) return;

      var total = included.reduce(function (sum, s) { return sum + sources[s]; }, 0);
      var isMoney = key === 'totalContributions';
      var format = isMoney
        ? function (n) { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(n); }
        : function (n) { return new Intl.NumberFormat('en-IE').format(n); };

      var valueEl = card.querySelector('[data-value]');
      card.classList.add('has-value');
      countUp(valueEl, Math.round(total), format);
      card.querySelector('[data-sources]').textContent =
        'Includes ' + included.map(function (s) { return SOURCE_NAMES[s] || s; }).join(' · ');
      anyShown = true;
    });

    var updated = document.querySelector('[data-stats-updated]');
    if (anyShown && data.updatedAt) {
      var d = new Date(data.updatedAt);
      if (!isNaN(d)) {
        updated.textContent = 'Last updated ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      }
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
