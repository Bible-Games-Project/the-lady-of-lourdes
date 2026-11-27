/*
 * Donation dialog: pick one-time or monthly, pick an amount, then pay through PayPal's own
 * secure checkout (popup on desktop, PayPal's flow on mobile). Uses the official PayPal
 * JavaScript SDK. A contribution is only shown as successful after PayPal confirms it:
 * one-time donations wait for the capture to come back COMPLETED, monthly support waits for
 * PayPal to approve the subscription.
 */
(function () {
  'use strict';

  var cfg = window.BGP_DONATE_CONFIG || {};
  var dialog = document.getElementById('donate-dialog');
  if (!dialog) return;

  var $ = function (sel, root) { return (root || dialog).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || dialog).querySelectorAll(sel)); };

  var currency = cfg.currency || 'EUR';
  var tiers = cfg.monthlyTiers || [];
  var connected = !!cfg.paypalClientId;

  var state = {
    mode: 'once',
    onceAmount: cfg.defaultOneTimeAmount || 10,
    custom: false,
    tierIndex: Math.min(cfg.defaultMonthlyTier || 0, Math.max(tiers.length - 1, 0)),
  };

  var wholeMoney = new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var centsMoney = new Intl.NumberFormat('en-IE', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function fmt(n) { return (Number.isInteger(n) ? wholeMoney : centsMoney).format(n); }

  /* ---------- Step 1: build the choices ---------- */

  var amountsBox = $('[data-once-amounts]');
  (cfg.oneTimeAmounts || []).forEach(function (n) {
    amountsBox.appendChild(choiceButton('amount', fmt(n), { amount: n }));
  });
  amountsBox.appendChild(choiceButton('amount', 'Custom', { custom: '1' }));

  var tiersBox = $('[data-monthly-tiers]');
  tiers.forEach(function (t, i) {
    var btn = choiceButton('tier', '', { tier: i });
    btn.innerHTML = '<span class="tier-options__amount">' + fmt(t.amount) + '<small>/month</small></span>' +
      '<span class="tier-options__name">' + escapeHtml(t.name) + '</span>' +
      (connected && t.planId ? '' : '<span class="tier-options__soon">Coming soon</span>');
    tiersBox.appendChild(btn);
  });

  function choiceButton(kind, label, data) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = kind === 'tier' ? 'tier-option' : 'amount';
    b.setAttribute('role', 'radio');
    b.textContent = label;
    Object.keys(data).forEach(function (k) { b.dataset[k] = data[k]; });
    return b;
  }

  var customWrap = $('[data-custom-wrap]');
  var customInput = $('[data-custom-input]');
  var errorBox = $('[data-error]');

  amountsBox.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.custom) {
      state.custom = true;
    } else {
      state.custom = false;
      state.onceAmount = Number(b.dataset.amount);
    }
    hideError();
    syncChoices();
    if (state.custom) customInput.focus();
  });

  tiersBox.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.tierIndex = Number(b.dataset.tier);
    hideError();
    syncChoices();
  });

  customInput.addEventListener('input', hideError);
  customInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); goToPay(); }
  });

  $$('[data-mode-btn]').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.modeBtn); });
  });

  function setMode(mode) {
    state.mode = mode === 'monthly' ? 'monthly' : 'once';
    hideError();
    syncChoices();
  }

  function syncChoices() {
    $$('[data-mode-btn]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.modeBtn === state.mode));
    });
    $('[data-panel="once"]').hidden = state.mode !== 'once';
    $('[data-panel="monthly"]').hidden = state.mode !== 'monthly';

    $$('.amount', amountsBox).forEach(function (b) {
      var on = b.dataset.custom ? state.custom : (!state.custom && Number(b.dataset.amount) === state.onceAmount);
      b.setAttribute('aria-checked', String(on));
    });
    customWrap.hidden = !state.custom;

    $$('.tier-option', tiersBox).forEach(function (b) {
      b.setAttribute('aria-checked', String(Number(b.dataset.tier) === state.tierIndex));
    });
  }

  /* Returns the amount to charge for a one-time donation, or null (with an error shown). */
  function readOnceAmount() {
    if (!state.custom) return state.onceAmount;
    var raw = (customInput.value || '').trim().replace(/[€\s]/g, '').replace(',', '.');
    var n = Number(raw);
    var min = cfg.minAmount || 1;
    var max = cfg.maxAmount || 10000;
    if (!raw || !isFinite(n)) { showError('Please enter an amount.'); return null; }
    if (n < min) { showError('The minimum amount is ' + fmt(min) + '.'); return null; }
    if (n > max) { showError('For amounts above ' + fmt(max) + ', please contact us.'); return null; }
    return Math.round(n * 100) / 100;
  }

  function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
  function hideError() { errorBox.hidden = true; }

  /* ---------- Step navigation ---------- */

  function showStep(name) {
    $$('[data-step]').forEach(function (s) { s.hidden = s.dataset.step !== name; });
    var focusTarget = $('[data-step="' + name + '"] h2');
    if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  }

  $('[data-continue]').addEventListener('click', goToPay);
  $('[data-back]').addEventListener('click', function () { closeButtons(); showStep('choose'); });

  function goToPay() {
    var payment;
    if (state.mode === 'once') {
      var amount = readOnceAmount();
      if (amount == null) return;
      payment = { mode: 'once', amount: amount };
      $('[data-summary]').textContent = 'One-time donation of ' + fmt(amount);
    } else {
      var tier = tiers[state.tierIndex];
      if (!tier) return;
      payment = { mode: 'monthly', amount: tier.amount, tier: tier };
      $('[data-summary]').textContent = fmt(tier.amount) + ' per month · ' + tier.name.replace(/ of Bible Games Project$/, '');
    }
    showStep('pay');
    renderPayment(payment);
  }

  /* ---------- Step 2: PayPal ---------- */

  var slot = $('[data-paypal-slot]');
  var payError = $('[data-pay-error]');
  var currentButtons = null;
  var renderToken = 0;

  function setPayError(msg) { payError.textContent = msg || ''; payError.hidden = !msg; }

  function closeButtons() {
    renderToken++;
    if (currentButtons && currentButtons.close) {
      try { currentButtons.close(); } catch (e) { /* already gone */ }
    }
    currentButtons = null;
  }

  function renderPayment(payment) {
    closeButtons();
    setPayError('');
    slot.innerHTML = '';

    if (payment.mode === 'monthly' && !(connected && payment.tier.planId)) {
      slot.innerHTML =
        '<div class="donate__notice"><p>Monthly support is being set up and will be available very soon.</p>' +
        '<p>In the meantime, you can still help with a one-time donation.</p>' +
        '<button type="button" class="btn btn--ghost" data-switch-once>Make a one-time donation instead</button></div>';
      slot.querySelector('[data-switch-once]').addEventListener('click', function () {
        setMode('once');
        showStep('choose');
      });
      return;
    }

    if (!connected) {
      // Not connected to the PayPal SDK yet: send people to the existing, real PayPal campaign.
      slot.innerHTML =
        '<a class="btn btn--paypal btn--block" href="' + escapeHtml(cfg.fallbackDonateUrl) + '">Continue to PayPal</a>' +
        '<p class="donate__fine donate__fine--center">You will confirm the amount (' + fmt(payment.amount) + ') on PayPal.</p>';
      return;
    }

    var token = ++renderToken;
    var loading = document.createElement('p');
    loading.className = 'donate__loading';
    loading.textContent = 'Loading PayPal…';
    slot.appendChild(loading);

    var kind = payment.mode === 'monthly' ? 'subscription' : 'capture';
    loadPayPal(kind).then(function (paypal) {
      if (token !== renderToken) return;
      slot.innerHTML = '';
      currentButtons = paypal.Buttons(buttonOptions(payment));
      if (currentButtons.isEligible && !currentButtons.isEligible()) {
        setPayError('PayPal checkout is not available in this browser. Please try another browser.');
        return;
      }
      return currentButtons.render(slot);
    }).catch(function () {
      if (token !== renderToken) return;
      slot.innerHTML = '';
      setPayError('We could not load PayPal. Please check your connection and try again.');
    });
  }

  function buttonOptions(payment) {
    var common = {
      style: { layout: 'vertical', shape: 'pill', color: 'gold', height: 48, label: payment.mode === 'monthly' ? 'subscribe' : 'paypal' },
      onCancel: function () { setPayError('The payment was cancelled. You can try again whenever you like.'); },
      onError: function () { setPayError('Something went wrong with PayPal and nothing was charged. Please try again.'); },
    };

    if (payment.mode === 'monthly') {
      common.createSubscription = function (data, actions) {
        setPayError('');
        return actions.subscription.create({
          plan_id: payment.tier.planId,
          application_context: { brand_name: cfg.brandName, shipping_preference: 'NO_SHIPPING', user_action: 'SUBSCRIBE_NOW' },
        });
      };
      common.onApprove = function (data) {
        showThanks(
          'Thank you for walking with us!',
          'Your monthly support as ' + payment.tier.name + ' (' + fmt(payment.amount) + ' per month) is set up. ' +
          'You can manage or cancel it anytime from your PayPal account.',
          data && data.subscriptionID
        );
      };
      return common;
    }

    var value = payment.amount.toFixed(2);
    common.createOrder = function (data, actions) {
      setPayError('');
      return actions.order.create({
        intent: 'CAPTURE',
        purchase_units: [{
          description: 'Donation to ' + cfg.brandName,
          amount: { currency_code: currency, value: value },
        }],
        application_context: { brand_name: cfg.brandName, shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' },
      });
    };
    common.onApprove = function (data, actions) {
      return actions.order.capture().then(function (details) {
        var issue = details && details.details && details.details[0] && details.details[0].issue;
        if (issue === 'INSTRUMENT_DECLINED') return actions.restart();

        var unit = details && details.purchase_units && details.purchase_units[0];
        var capture = unit && unit.payments && unit.payments.captures && unit.payments.captures[0];
        var status = capture ? capture.status : details && details.status;

        if (status === 'COMPLETED') {
          showThanks('Thank you for your gift!',
            'Your donation of ' + fmt(payment.amount) + ' has been received. It helps us keep creating games that bring the Bible to life.',
            capture && capture.id);
        } else if (status === 'PENDING') {
          showThanks('Thank you — almost there',
            'PayPal is still processing your donation of ' + fmt(payment.amount) + '. You will receive an email from PayPal once it is complete.',
            capture && capture.id);
        } else {
          setPayError('PayPal could not complete the payment and nothing was charged. Please try again or use another payment method.');
        }
      }).catch(function (err) {
        var msg = String(err && err.message || '');
        if (msg.indexOf('INSTRUMENT_DECLINED') !== -1) return actions.restart();
        setPayError('PayPal could not complete the payment. Please try again or use another payment method.');
      });
    };
    return common;
  }

  var sdkPromises = {};
  function loadPayPal(kind) {
    var ns = kind === 'subscription' ? 'paypalSubscriptions' : 'paypalCheckout';
    if (window[ns]) return Promise.resolve(window[ns]);
    if (sdkPromises[kind]) return sdkPromises[kind];

    var params = new URLSearchParams({
      'client-id': cfg.paypalClientId,
      currency: currency,
      components: 'buttons',
      'disable-funding': 'paylater,venmo',
    });
    if (kind === 'subscription') {
      params.set('vault', 'true');
      params.set('intent', 'subscription');
    } else {
      params.set('intent', 'capture');
    }

    sdkPromises[kind] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?' + params.toString();
      s.async = true;
      s.setAttribute('data-namespace', ns);
      s.onload = function () { window[ns] ? resolve(window[ns]) : reject(new Error('PayPal SDK missing')); };
      s.onerror = function () { delete sdkPromises[kind]; s.remove(); reject(new Error('PayPal SDK failed to load')); };
      document.head.appendChild(s);
    });
    return sdkPromises[kind];
  }

  /* ---------- Step 3: thank you ---------- */

  function showThanks(title, text, reference) {
    closeButtons();
    $('[data-thanks-title]').textContent = title;
    $('[data-thanks-text]').textContent = text + (reference ? ' Reference: ' + reference + '.' : '');
    showStep('thanks');
  }

  /* ---------- Open / close ---------- */

  function open(mode) {
    if (typeof dialog.showModal !== 'function') {
      window.location.href = cfg.fallbackDonateUrl;
      return;
    }
    closeButtons();
    setMode(mode);
    showStep('choose');
    document.documentElement.classList.add('dialog-open');
    dialog.showModal();
  }

  dialog.addEventListener('close', function () {
    closeButtons();
    document.documentElement.classList.remove('dialog-open');
  });

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close(); // click on the backdrop
    if (e.target.closest('[data-close]')) dialog.close();
  });

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-donate]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger.dataset.mode || 'once');
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  syncChoices();
})();
