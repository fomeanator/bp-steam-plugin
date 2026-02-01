// BattlePass Steam Balance Helper - Millennium Plugin
// Адаптированная версия для Steam Desktop Client
// ============================================

(function() {
  'use strict';

  // Проверяем, не инициализирован ли уже плагин
  if (window.__battlepassInitialized) return;
  window.__battlepassInitialized = true;

  // ============================================
  // КОНФИГУРАЦИЯ
  // ============================================
  const API_BASE_URL = 'https://profile.battlepass.ru';
  const ORG = 'extension';

  const API_ENDPOINTS = {
    authSteam: '/api/v2/user/auth/steam',
    bills: `/api/v2/payment/bills/steam?org=${ORG}`,
    commission: `/api/v2/payment/comission?org=${ORG}`,
    createInvoice: `/api/v2/payment/create?org=${ORG}`,
    validatePromocode: `/api/v2/payment/validate?org=${ORG}`,
    convert: `/api/v2/payment/convert?org=${ORG}`,
  };

  // ============================================
  // STORAGE HELPERS (localStorage вместо chrome.storage)
  // ============================================
  function storageSet(data) {
    Object.keys(data).forEach(key => {
      localStorage.setItem(`bp_${key}`, JSON.stringify(data[key]));
    });
  }

  function storageGet(keys) {
    const result = {};
    keys.forEach(key => {
      const value = localStorage.getItem(`bp_${key}`);
      result[key] = value ? JSON.parse(value) : null;
    });
    return result;
  }

  // ============================================
  // API REQUEST (прямой fetch вместо background script)
  // ============================================
  async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    console.log('[BattlePass] Request:', method, url);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMsg;

      if (typeof errorData.message === 'object' && errorData.message?.Message) {
        errorMsg = errorData.message.Message;
      } else if (typeof errorData.message === 'string') {
        errorMsg = errorData.message;
      } else if (errorData.error) {
        errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
      } else if (errorData.detail) {
        errorMsg = errorData.detail;
      } else {
        errorMsg = 'Ошибка операции, обратитесь в поддержку';
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log('[BattlePass] Response:', data);
    return data;
  }

  // ============================================
  // СОСТОЯНИЕ ПРИЛОЖЕНИЯ
  // ============================================
  const state = {
    token: null,
    user: null,
    steamLogin: null,
    steamId64: null,
    paymentMethods: [],
    selectedMethod: null,
    currentCommission: null,
    promocode: 'HELLO',
    promocodeDiscount: 0,
    promocodeValid: false,
    currency: 'RUB',
    steamCurrency: null,
    convertedAmount: null,
  };

  // Проверяем тип страницы
  const isCheckoutPage = window.location.href.includes('checkout.steampowered.com');
  const isCartPage = window.location.href.includes('store.steampowered.com/cart');
  const isAppPage = window.location.href.includes('store.steampowered.com/app/');
  const isBundlePage = window.location.href.includes('store.steampowered.com/bundle/');
  const isAddFundsPage = window.location.href.includes('store.steampowered.com/steamaccount/addfunds');

  // ============================================
  // STEAM USER INFO
  // ============================================
  function getSteamUserInfo() {
    // Попытка 1: Из глобального объекта g_steamID
    if (typeof g_steamID !== 'undefined' && g_steamID) {
      state.steamId64 = g_steamID;
    }

    // Попытка 2: Из data-атрибута
    const profileLink = document.querySelector('[data-miniprofile]');
    if (profileLink) {
      const miniprofile = profileLink.getAttribute('data-miniprofile');
      if (miniprofile) {
        state.steamId64 = (BigInt('76561197960265728') + BigInt(miniprofile)).toString();
      }
    }

    // Попытка 3: Из URL профиля
    const profileMatch = window.location.href.match(/steamcommunity\.com\/(?:id|profiles)\/([^\/]+)/);
    if (profileMatch) {
      const idOrVanity = profileMatch[1];
      if (/^\d{17}$/.test(idOrVanity)) {
        state.steamId64 = idOrVanity;
      }
    }

    // Попытка 4: Из скриптов на странице
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      const match = script.textContent.match(/g_steamID\s*=\s*"(\d{17})"/);
      if (match) {
        state.steamId64 = match[1];
      }
    });

    // Получаем логин
    const accountNameSpan = document.querySelector('.account_name');
    if (accountNameSpan) {
      state.steamLogin = accountNameSpan.textContent.trim();
    }

    if (!state.steamLogin) {
      const accountLink = document.querySelector('a[href*="/account/"]');
      if (accountLink) {
        const accountText = accountLink.textContent.trim();
        const match = accountText.match(/:\s*(.+)$/);
        if (match) {
          state.steamLogin = match[1].trim();
        }
      }
    }

    if (!state.steamLogin) {
      const accountName = document.querySelector('#account_pulldown, .persona_name, .playerAvatar + a');
      if (accountName) {
        state.steamLogin = accountName.textContent.trim();
      }
    }

    console.log('[BattlePass] Steam info:', { steamId64: state.steamId64, steamLogin: state.steamLogin });
    return { steamId64: state.steamId64, steamLogin: state.steamLogin };
  }

  // ============================================
  // API ФУНКЦИИ
  // ============================================
  async function authWithSteam() {
    if (!state.steamId64) {
      getSteamUserInfo();
    }

    if (!state.steamId64) {
      state.steamId64 = '76561198000000000';
    }

    try {
      const data = await apiRequest(API_ENDPOINTS.authSteam, 'POST', {
        steamId64: state.steamId64,
        username: state.steamLogin || '',
      });

      state.token = data.access_token;
      state.user = data.user;
      console.log('[BattlePass] Auth success:', state.user);
      return data;
    } catch (error) {
      console.error('[BattlePass] Auth error:', error);
      throw error;
    }
  }

  async function fetchPaymentMethods() {
    if (!state.token) {
      await authWithSteam();
    }

    try {
      state.paymentMethods = await apiRequest(API_ENDPOINTS.bills, 'GET', null, state.token);
      console.log('[BattlePass] Payment methods:', state.paymentMethods);
      return state.paymentMethods;
    } catch (error) {
      console.error('[BattlePass] Fetch methods error:', error);
      throw error;
    }
  }

  async function calculateCommission(amount, methodName, currency = 'rub', promocode = null) {
    if (!state.token) {
      await authWithSteam();
    }

    try {
      const requestBody = {
        amount: parseInt(amount),
        account: state.steamLogin || '',
        currency: currency.toLowerCase(),
        type: 0,
        isIncludeCommission: false,
        billType: 0,
        tag: methodName,
        promocode: promocode || '',
      };

      state.currentCommission = await apiRequest(API_ENDPOINTS.commission, 'POST', requestBody, state.token);
      console.log('[BattlePass] Commission:', state.currentCommission);
      return state.currentCommission;
    } catch (error) {
      console.error('[BattlePass] Commission error:', error);
      throw error;
    }
  }

  async function validatePromocode(code) {
    if (!code || code.trim() === '') {
      state.promocodeDiscount = 0;
      state.promocodeValid = false;
      state.promocode = '';
      return { valid: false, discount: 0 };
    }

    const upperCode = code.toUpperCase();

    if (!state.token) {
      try {
        await authWithSteam();
      } catch (e) {
        state.promocodeDiscount = 0;
        state.promocodeValid = false;
        return { valid: false, discount: 0 };
      }
    }

    try {
      const result = await apiRequest(API_ENDPOINTS.validatePromocode, 'POST', {
        code: upperCode,
        account: state.steamLogin || 'test',
      }, state.token);

      const discount = result.discount || result.percent || 0;
      state.promocodeDiscount = discount;
      state.promocodeValid = discount > 0;
      state.promocode = upperCode;

      return { valid: state.promocodeValid, discount };
    } catch (error) {
      console.error('[BattlePass] Promocode validation error:', error);
      state.promocodeDiscount = 0;
      state.promocodeValid = false;
      return { valid: false, discount: 0 };
    }
  }

  function detectSteamCurrency() {
    const priceElements = document.querySelectorAll('.game_purchase_price, .discount_final_price, .price, [data-price-final]');

    for (const el of priceElements) {
      const text = el.textContent || '';
      if (text.includes('₸') || text.includes('KZT') || text.match(/\d+[,\s]?\d*\s*тг/i)) {
        state.steamCurrency = 'KZT';
        return 'KZT';
      }
      if (text.includes('₽') || text.includes('руб') || text.includes('pуб')) {
        state.steamCurrency = 'RUB';
        return 'RUB';
      }
    }

    state.steamCurrency = 'RUB';
    return 'RUB';
  }

  async function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!state.token) {
      await authWithSteam();
    }

    if (fromCurrency === toCurrency) {
      return { amount: amount, rate: 1 };
    }

    try {
      const result = await apiRequest(API_ENDPOINTS.convert, 'POST', {
        amount: parseInt(amount),
        account: state.steamLogin || 'test',
        type: 1,
        isIncludeCommission: true,
        billType: 1,
        inputCurrency: fromCurrency.toLowerCase(),
        outputCurrency: toCurrency.toLowerCase(),
      }, state.token);

      state.convertedAmount = result.input || result.amount;
      return result;
    } catch (error) {
      console.error('[BattlePass] Convert error:', error);
      throw error;
    }
  }

  async function createOrder(amount, methodName, currency, promocode = null) {
    if (!state.token) {
      await authWithSteam();
    }

    if (!state.steamLogin) {
      throw new Error('Не удалось получить Steam логин');
    }

    const region = { name: 'Россия', value: 'RU' };

    try {
      const inputValues = [
        { name: 'account', value: state.steamLogin },
        { name: 'amount', value: String(amount) },
      ];

      if (promocode && promocode.trim()) {
        inputValues.push({ name: 'promocode', value: promocode.trim().toUpperCase() });
      }

      inputValues.push({ name: 'currency', value: currency.toLowerCase() });

      const requestBody = {
        productId: '1',
        tag: methodName,
        service: 'steam',
        productType: 'DIRECT_PAYMENT',
        region: region,
        inputValues: inputValues,
      };

      const invoice = await apiRequest(API_ENDPOINTS.createInvoice, 'POST', requestBody, state.token);
      console.log('[BattlePass] Invoice created:', invoice);
      return invoice;
    } catch (error) {
      console.error('[BattlePass] Create order error:', error);
      throw error;
    }
  }

  // ============================================
  // UI ФУНКЦИИ
  // ============================================
  function createPaymentForm() {
    return `
      <div id="steam-balance-form" class="steam-balance-container ${isCheckoutPage ? 'checkout-page' : ''}">
        <div class="form-header">
          <h3>Пополнение баланса Steam</h3>
          ${!isCheckoutPage ? '<button id="close-form" class="close-btn">✕</button>' : ''}
        </div>

        <div class="form-content">
          <div class="steam-login-section">
            <h4>Ваш Steam логин:</h4>
            <input type="text" id="steam-login-input" placeholder="Введите логин Steam" class="amount-input">
            <small class="login-hint">Логин от аккаунта Steam (не email)</small>
          </div>

          <div class="payment-methods">
            <h4>Выберите способ оплаты:</h4>
            <div class="methods-grid" id="methods-grid">
              <div class="loading-methods">Загрузка способов оплаты...</div>
            </div>
          </div>

          <div class="currency-section">
            <h4>Валюта Steam:</h4>
            <div class="currency-selector" id="currency-selector">
              <button class="currency-btn active" data-currency="RUB">RUB</button>
              <button class="currency-btn" data-currency="KZT">KZT</button>
            </div>
          </div>

          <div class="amount-section">
            <h4>Сумма пополнения (<span id="currency-label">RUB</span>):</h4>
            <input type="number" id="custom-amount" placeholder="От 50" min="50" class="amount-input">
            <small class="amount-error" id="amount-error" style="display: none; color: #ff4444; margin-top: 4px;"></small>
            <small class="amount-hint" id="amount-hint">Минимум: 50 RUB. Максимум: 15 000 RUB</small>

            <div class="quick-amounts" id="quick-amounts">
              <button class="amount-btn" data-amount="500">500</button>
              <button class="amount-btn" data-amount="1000">1000</button>
              <button class="amount-btn" data-amount="5000">5000</button>
            </div>
          </div>

          <div class="promocode-section">
            <h4>Промокод:</h4>
            <div class="promocode-input-wrapper">
              <input type="text" id="promocode-input" placeholder="Введите промокод" class="amount-input" value="HELLO">
              <span id="promocode-status" class="promocode-status"></span>
            </div>
            <small id="promocode-hint" class="promocode-hint">Промокод даёт скидку на комиссию сервиса</small>
          </div>

          <div class="balance-info">
            <div class="info-row" id="convert-row" style="display: none;">
              <span>Конвертация:</span>
              <span id="convert-info">-</span>
            </div>
            <div class="info-row">
              <span>Стоимость товара</span>
              <span id="price-with-commission">0 ₽</span>
            </div>
            <div class="info-row discount-row" id="discount-row" style="display: none;">
              <span>Скидка</span>
              <span id="discount-amount" class="discount-value">- 0 ₽</span>
            </div>
            <div class="info-row total-row">
              <span>Итого</span>
              <span id="total-amount">0 ₽</span>
            </div>
          </div>

          <div class="terms-checkbox">
            <label>
              <input type="checkbox" id="agree-terms">
              <span>Я ознакомлен с <a href="https://battlepass.ru/info/agreement" target="_blank">Соглашением</a> и <a href="https://battlepass.ru/info/privacypolicy" target="_blank">Политикой конфиденциальности</a></span>
            </label>
          </div>

          <div class="support-link-section">
            <small>Возникли вопросы? <a href="https://t.me/BattlePassSupportBot" target="_blank" class="support-link">Написать в поддержку</a></small>
          </div>

          <button id="pay-btn" class="pay-button" disabled>
            <span>Оплатить</span>
          </button>

          <div class="payment-note">
            <small>Платежи обрабатываются через защищенное соединение BattlePass</small>
          </div>
        </div>
      </div>
    `;
  }

  function renderPaymentMethods(methods) {
    const grid = document.getElementById('methods-grid');
    if (!grid) return;

    if (!methods || methods.length === 0) {
      grid.innerHTML = '<div class="loading-methods">Способы оплаты недоступны</div>';
      return;
    }

    grid.innerHTML = methods.map((method, index) => `
      <button class="method-btn ${index === 0 ? 'active' : ''}" data-method="${method.name}" data-commission="${method.commission}" data-min="${method.min}">
        <span class="method-text">
          <span class="method-name">${method.display_name.replace(/От \d+\.?\d* рублей?/, '')}</span>
          <span class="method-commission">${method.commission}%</span>
        </span>
      </button>
    `).join('');

    if (methods.length > 0) {
      state.selectedMethod = methods[0];
    }

    grid.querySelectorAll('.method-btn').forEach((btn) => {
      btn.addEventListener('click', function() {
        grid.querySelectorAll('.method-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');

        const methodName = this.dataset.method;
        state.selectedMethod = methods.find((m) => m.name === methodName);
        triggerRecalculate();
      });
    });

    const amount = document.getElementById('custom-amount')?.value;
    if (amount && parseInt(amount) > 0) {
      triggerRecalculate();
    }
  }

  // ============================================
  // ПЕРЕСЧЁТ КОМИССИИ
  // ============================================
  function setBalanceInfoLoading(isLoading) {
    const balanceInfo = document.querySelector('.balance-info');
    if (!balanceInfo) return;

    let spinner = balanceInfo.querySelector('.balance-spinner');
    let content = balanceInfo.querySelector('.balance-content');

    if (!content) {
      const rows = balanceInfo.querySelectorAll('.info-row');
      content = document.createElement('div');
      content.className = 'balance-content';
      rows.forEach((row) => content.appendChild(row));
      balanceInfo.appendChild(content);
    }

    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'balance-spinner';
      spinner.innerHTML = '<div class="spinner-circle"></div><span>Расчёт...</span>';
      balanceInfo.insertBefore(spinner, content);
    }

    spinner.style.display = isLoading ? 'flex' : 'none';
  }

  async function recalculatePayment(params) {
    const { amount, currency, methodName, promocode, promocodeDiscount, steamLogin } = params;

    const numAmount = parseInt(amount) || 0;
    const convertRow = document.getElementById('convert-row');
    const convertInfo = document.getElementById('convert-info');

    const actualMethodName = methodName || state.selectedMethod?.name;
    if (!actualMethodName || !state.selectedMethod) {
      return null;
    }

    const minAmount = state.selectedMethod.min || 50;
    if (numAmount < minAmount) {
      document.getElementById('price-with-commission').textContent = '0 ₽';
      document.getElementById('discount-row').style.display = 'none';
      document.getElementById('total-amount').textContent = '0 ₽';
      if (convertRow) convertRow.style.display = 'none';
      updatePayButtonState();
      return null;
    }

    setBalanceInfoLoading(true);

    try {
      let amountForCommission = numAmount;

      if (currency === 'KZT') {
        if (convertRow) convertRow.style.display = 'flex';
        if (convertInfo) convertInfo.textContent = 'Расчёт...';

        try {
          const convertResult = await convertCurrency(numAmount, 'KZT', 'RUB');
          const convertedAmount = convertResult.input || convertResult.amount || numAmount;
          const rate = convertResult.rate || convertedAmount / numAmount;

          amountForCommission = Math.round(convertedAmount);
          if (convertInfo) convertInfo.textContent = `${numAmount} KZT = ${amountForCommission} RUB (курс: ${rate.toFixed(4)})`;
          state.convertedAmount = amountForCommission;
        } catch (err) {
          console.error('[BattlePass] Convert error:', err);
          if (convertInfo) convertInfo.textContent = 'Ошибка конвертации';
          setBalanceInfoLoading(false);
          return null;
        }
      } else {
        if (convertRow) convertRow.style.display = 'none';
        state.convertedAmount = null;
      }

      const commissionResponse = await calculateCommission(amountForCommission, actualMethodName, 'rub', promocode);

      const walletAmountInRouble = commissionResponse.amountInRouble || amountForCommission;
      const bankCommission = commissionResponse.bankComission || 0;
      const baseSteamRate = commissionResponse.steamRate || 12;

      const actualSteamRate = Math.max(0, baseSteamRate - (promocodeDiscount || 0));
      const serviceCommission = Math.round(walletAmountInRouble * (actualSteamRate / 100));
      const finalPrice = Math.round(walletAmountInRouble + bankCommission + serviceCommission);

      const baseServiceCommission = Math.round(walletAmountInRouble * (baseSteamRate / 100));
      const priceWithoutDiscount = Math.round(walletAmountInRouble + bankCommission + baseServiceCommission);
      const discountAmount = priceWithoutDiscount - finalPrice;

      const priceWithCommissionEl = document.getElementById('price-with-commission');
      const totalAmountEl = document.getElementById('total-amount');
      const discountRow = document.getElementById('discount-row');
      const discountEl = document.getElementById('discount-amount');

      if (priceWithCommissionEl) priceWithCommissionEl.textContent = `${priceWithoutDiscount} ₽`;

      if (discountAmount > 0) {
        if (discountRow) discountRow.style.display = 'flex';
        if (discountEl) discountEl.textContent = `- ${discountAmount} ₽`;
      } else {
        if (discountRow) discountRow.style.display = 'none';
      }

      if (totalAmountEl) totalAmountEl.textContent = `${finalPrice} ₽`;

      state.currentCommission = {
        ...commissionResponse,
        finalPrice,
        serviceCommission,
        bankCommission,
        priceWithoutDiscount,
        discountAmount,
        totalAmount: finalPrice,
        originalAmount: numAmount,
        originalCurrency: currency,
      };

      return state.currentCommission;
    } catch (error) {
      console.error('[BattlePass] Recalculate error:', error);

      const fallbackPriceEl = document.getElementById('price-with-commission');
      const fallbackDiscountRow = document.getElementById('discount-row');
      const fallbackTotalEl = document.getElementById('total-amount');

      if (fallbackPriceEl) fallbackPriceEl.textContent = '0 ₽';
      if (fallbackDiscountRow) fallbackDiscountRow.style.display = 'none';
      if (fallbackTotalEl) fallbackTotalEl.textContent = '0 ₽';

      return null;
    } finally {
      setBalanceInfoLoading(false);
      updatePayButtonState();
    }
  }

  let recalculateTimeout = null;
  function triggerRecalculate() {
    if (recalculateTimeout) clearTimeout(recalculateTimeout);

    recalculateTimeout = setTimeout(() => {
      const amount = document.getElementById('custom-amount')?.value || 0;
      const steamLogin = document.getElementById('steam-login-input')?.value?.trim() || '';

      recalculatePayment({
        amount,
        currency: state.currency,
        methodName: state.selectedMethod?.name,
        promocode: state.promocode,
        promocodeDiscount: state.promocodeDiscount,
        steamLogin,
      });
    }, 300);
  }

  function validateAmount(amount) {
    const amountInput = document.getElementById('custom-amount');
    const amountError = document.getElementById('amount-error');
    const minAmount = state.selectedMethod?.min || 50;
    const maxAmount = state.currency === 'KZT' ? 75000 : 15000;
    const currencySymbol = state.currency === 'KZT' ? '₸' : '₽';

    if (!amount || amount === 0) {
      amountInput.classList.remove('error');
      amountError.style.display = 'none';
      return false;
    }

    if (amount < minAmount) {
      amountInput.classList.add('error');
      amountError.textContent = `Минимальная сумма: ${minAmount} ${currencySymbol}`;
      amountError.style.display = 'block';
      return false;
    }

    if (amount > maxAmount) {
      amountInput.classList.add('error');
      amountError.textContent = `Максимальная сумма: ${maxAmount} ${currencySymbol}`;
      amountError.style.display = 'block';
      return false;
    }

    amountInput.classList.remove('error');
    amountError.style.display = 'none';
    return true;
  }

  function updatePayButtonState() {
    const payBtn = document.getElementById('pay-btn');
    if (!payBtn) return;

    const amount = parseInt(document.getElementById('custom-amount')?.value) || 0;
    const agreeChecked = document.getElementById('agree-terms')?.checked || false;
    const steamLogin = document.getElementById('steam-login-input')?.value?.trim() || '';

    const isAmountValid = validateAmount(amount);
    payBtn.disabled = !(isAmountValid && agreeChecked && steamLogin);
  }

  function createToggleButton() {
    const button = document.createElement('button');
    button.id = 'steam-balance-toggle';
    button.className = 'steam-balance-toggle-btn';
    button.innerHTML = '<span>Пополнить Steam</span>';
    return button;
  }

  async function processPayment() {
    const amount = parseInt(document.getElementById('custom-amount').value);
    const steamLogin = document.getElementById('steam-login-input').value.trim();

    if (!steamLogin) {
      showNotification('Пожалуйста, введите Steam логин', 'error');
      return;
    }

    if (!state.selectedMethod) {
      showNotification('Пожалуйста, выберите способ оплаты', 'error');
      return;
    }

    if (amount < state.selectedMethod.min) {
      showNotification(`Минимальная сумма: ${state.selectedMethod.min} ₽`, 'error');
      return;
    }

    state.steamLogin = steamLogin;

    const payBtn = document.getElementById('pay-btn');
    payBtn.disabled = true;
    payBtn.querySelector('span').textContent = 'Создание заказа...';

    try {
      showNotification('Создание заказа...', 'info');

      const promocodeToSend = state.promocodeValid ? state.promocode : null;
      const invoice = await createOrder(amount, state.selectedMethod.name, state.currency, promocodeToSend);

      if (invoice.paymentUrl) {
        showNotification('Переход на страницу оплаты...', 'info');
        window.location.href = invoice.paymentUrl;
      } else {
        throw new Error('Не получена ссылка на оплату');
      }
    } catch (error) {
      showNotification(error.message || 'Ошибка при создании заказа', 'error', true);
      payBtn.disabled = false;
      payBtn.querySelector('span').textContent = 'Оплатить';
    }
  }

  function showNotification(message, type = 'info', showSupport = false) {
    const existingNotification = document.getElementById('steam-balance-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.id = 'steam-balance-notification';
    notification.className = `bp-notification bp-notification-${type}`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    if (showSupport && type === 'error') {
      const supportLink = document.createElement('a');
      supportLink.href = 'https://t.me/BattlePassSupportBot';
      supportLink.target = '_blank';
      supportLink.textContent = 'Написать в поддержку';
      supportLink.className = 'bp-notification-link';
      notification.appendChild(supportLink);
    }

    document.body.appendChild(notification);

    const timeout = showSupport && type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      notification.classList.add('bp-notification-hide');
      setTimeout(() => notification.remove(), 300);
    }, timeout);
  }

  // ============================================
  // СТРАНИЦА ИГРЫ - КНОПКИ ПОПОЛНЕНИЯ
  // ============================================
  function getPriceFromPurchaseBlock(purchaseBlock) {
    const discountPrice = purchaseBlock.querySelector('.discount_final_price');
    if (discountPrice) {
      const text = discountPrice.textContent;
      const match = text.match(/(\d[\d\s,]*)/);
      if (match) {
        return {
          amount: parseInt(match[1].replace(/[\s,]/g, '')),
          currency: text.includes('₸') || text.includes('KZT') ? 'KZT' : 'RUB',
        };
      }
    }

    const discountBlock = purchaseBlock.querySelector('.discount_block');
    if (discountBlock && discountBlock.dataset.priceFinal) {
      return {
        amount: Math.round(parseInt(discountBlock.dataset.priceFinal) / 100),
        currency: state.steamCurrency || 'RUB',
      };
    }

    const regularPrice = purchaseBlock.querySelector('.game_purchase_price');
    if (regularPrice) {
      const text = regularPrice.textContent;
      const match = text.match(/(\d[\d\s,]*)/);
      if (match) {
        return {
          amount: parseInt(match[1].replace(/[\s,]/g, '')),
          currency: text.includes('₸') || text.includes('KZT') ? 'KZT' : 'RUB',
        };
      }
    }

    return null;
  }

  function addAppPageTopUpButtons() {
    const addToCartBtns = document.querySelectorAll('.btn_addtocart');

    addToCartBtns.forEach((btnContainer) => {
      if (btnContainer.classList.contains('btn_packageinfo')) return;
      if (btnContainer.nextElementSibling?.classList.contains('bp-topup-inline-btn')) return;

      const purchaseBlock = btnContainer.closest('.game_area_purchase_game');
      if (!purchaseBlock) return;

      const topUpBtn = document.createElement('div');
      topUpBtn.className = 'bp-topup-inline-btn btn_addtocart';
      topUpBtn.style.cssText = 'display: inline-block; vertical-align: top;';
      topUpBtn.innerHTML = '<a class="btn_green_steamui btn_medium"><span>Пополнить</span></a>';

      topUpBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const form = document.getElementById('steam-balance-form');
        const amountInput = document.getElementById('custom-amount');

        if (form) {
          form.style.display = 'block';

          if (state.paymentMethods.length === 0) {
            try {
              const methods = await fetchPaymentMethods();
              renderPaymentMethods(methods);
            } catch (error) {
              showNotification('Ошибка загрузки способов оплаты', 'error');
            }
          }

          const priceData = getPriceFromPurchaseBlock(purchaseBlock);
          if (priceData && amountInput) {
            amountInput.value = priceData.amount;

            if (priceData.currency && priceData.currency !== state.currency) {
              state.currency = priceData.currency;
              storageSet({ currency: priceData.currency });
              updateCurrencyUI();
            }

            triggerRecalculate();
          }

          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      btnContainer.insertAdjacentElement('afterend', topUpBtn);
    });
  }

  function updateCurrencyUI() {
    const currencySelector = document.getElementById('currency-selector');
    const currencyLabel = document.getElementById('currency-label');

    if (currencySelector) {
      currencySelector.querySelectorAll('.currency-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.currency === state.currency);
      });
    }
    if (currencyLabel) {
      currencyLabel.textContent = state.currency;
    }
  }

  // ============================================
  // ИНИЦИАЛИЗАЦИЯ
  // ============================================
  async function init() {
    if (document.getElementById('steam-balance-form')) return;

    getSteamUserInfo();

    const formContainer = document.createElement('div');
    formContainer.innerHTML = createPaymentForm();
    document.body.insertBefore(formContainer.firstElementChild, document.body.firstChild);

    if (!isCheckoutPage) {
      const toggleBtn = createToggleButton();
      document.body.insertBefore(toggleBtn, document.body.firstChild);

      const form = document.getElementById('steam-balance-form');
      form.style.display = 'none';

      toggleBtn.addEventListener('click', async () => {
        const isHidden = form.style.display === 'none';
        form.style.display = isHidden ? 'block' : 'none';

        if (isHidden && state.paymentMethods.length === 0) {
          try {
            const methods = await fetchPaymentMethods();
            renderPaymentMethods(methods);
          } catch (error) {
            showNotification('Ошибка загрузки способов оплаты', 'error');
          }
        }

        if (isHidden) {
          const amount = document.getElementById('custom-amount').value;
          if (amount && parseInt(amount) > 0 && state.paymentMethods.length > 0) {
            const promocodeInput = document.getElementById('promocode-input');
            if (promocodeInput && promocodeInput.value.trim()) {
              await validatePromocode(promocodeInput.value.trim());
            }
            triggerRecalculate();
          }
        }
      });

      const closeBtn = document.getElementById('close-form');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          form.style.display = 'none';
        });
      }

      // Закрытие по клику вне формы
      let mouseDownOutside = false;
      document.addEventListener('mousedown', (e) => {
        const isTopUpBtn = e.target.closest('.bp-topup-btn') || e.target.closest('.bp-topup-inline-btn');
        mouseDownOutside = !form.contains(e.target) && !toggleBtn.contains(e.target) && !isTopUpBtn;
      });
      document.addEventListener('click', (e) => {
        const isTopUpBtn = e.target.closest('.bp-topup-btn') || e.target.closest('.bp-topup-inline-btn');
        if (form.style.display === 'block' && mouseDownOutside && !form.contains(e.target) && !toggleBtn.contains(e.target) && !isTopUpBtn) {
          form.style.display = 'none';
        }
        mouseDownOutside = false;
      });
    } else {
      // На checkout сразу загружаем методы
      try {
        const methods = await fetchPaymentMethods();
        renderPaymentMethods(methods);
      } catch (error) {
        console.error('[BattlePass] Error loading methods:', error);
      }
    }

    // Страница корзины
    if (isCartPage) {
      addCartTopUpButton();
      const cartObserver = new MutationObserver(() => addCartTopUpButton());
      cartObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Страница игры
    if (isAppPage || isBundlePage) {
      setTimeout(() => addAppPageTopUpButtons(), 1000);
    }

    // Загружаем сохранённые данные
    const loginInput = document.getElementById('steam-login-input');
    const amountInput = document.getElementById('custom-amount');

    const stored = storageGet(['steam_login', 'amount', 'currency']);

    if (state.steamLogin && loginInput) {
      loginInput.value = state.steamLogin;
    } else if (stored.steam_login && loginInput) {
      loginInput.value = stored.steam_login;
      state.steamLogin = stored.steam_login;
    }

    const pageCurrency = detectSteamCurrency();
    state.currency = stored.currency || pageCurrency;
    updateCurrencyUI();

    if (stored.amount && amountInput) {
      amountInput.value = stored.amount;
    } else if (!amountInput.value) {
      amountInput.value = '100';
    }

    // Обработчики
    setupEventListeners();
  }

  function setupEventListeners() {
    const loginInput = document.getElementById('steam-login-input');
    const amountInput = document.getElementById('custom-amount');
    const promocodeInput = document.getElementById('promocode-input');

    // Login
    let loginTimeout = null;
    function handleLoginChange(newLogin) {
      const trimmed = (newLogin || '').trim();
      state.steamLogin = trimmed;
      storageSet({ steam_login: trimmed });
      updatePayButtonState();

      if (loginTimeout) clearTimeout(loginTimeout);
      loginTimeout = setTimeout(async () => {
        const amount = document.getElementById('custom-amount').value;
        if (amount && parseInt(amount) > 0) {
          if (promocodeInput && promocodeInput.value.trim()) {
            await validatePromocode(promocodeInput.value.trim());
          }
          triggerRecalculate();
        }
      }, 500);
    }

    loginInput?.addEventListener('input', function() { handleLoginChange(this.value); });
    loginInput?.addEventListener('change', function() { handleLoginChange(this.value); });

    // Amount
    function handleAmountChange(newAmount) {
      storageSet({ amount: newAmount, currency: state.currency });
      triggerRecalculate();
    }

    amountInput?.addEventListener('input', function() { handleAmountChange(this.value); });
    amountInput?.addEventListener('change', function() { handleAmountChange(this.value); });

    // Quick amounts
    document.querySelectorAll('.amount-btn').forEach((btn) => {
      btn.addEventListener('click', function() {
        const amount = this.dataset.amount;
        document.getElementById('custom-amount').value = amount;
        handleAmountChange(amount);
      });
    });

    // Currency
    const currencySelector = document.getElementById('currency-selector');
    currencySelector?.querySelectorAll('.currency-btn').forEach((btn) => {
      btn.addEventListener('click', async function() {
        const newCurrency = this.dataset.currency;
        if (newCurrency === state.currency) return;

        const currentAmount = parseInt(amountInput?.value) || 0;

        currencySelector.querySelectorAll('.currency-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');

        const oldCurrency = state.currency;
        state.currency = newCurrency;
        storageSet({ currency: newCurrency });

        const currencyLabel = document.getElementById('currency-label');
        if (currencyLabel) currencyLabel.textContent = newCurrency;

        const minAmount = newCurrency === 'KZT' ? 250 : 50;
        const maxAmount = newCurrency === 'KZT' ? 75000 : 15000;
        if (amountInput) amountInput.placeholder = `От ${minAmount}`;

        const amountHint = document.getElementById('amount-hint');
        if (amountHint) {
          amountHint.textContent = `Минимум: ${minAmount.toLocaleString()} ${newCurrency}. Максимум: ${maxAmount.toLocaleString()} ${newCurrency}`;
        }

        if (currentAmount > 0) {
          try {
            const convertResult = await convertCurrency(currentAmount, oldCurrency, newCurrency);
            const convertedAmount = Math.ceil(convertResult.input || convertResult.amount || currentAmount);
            if (amountInput) amountInput.value = convertedAmount;
            triggerRecalculate();
          } catch (err) {
            console.error('[BattlePass] Convert on currency change error:', err);
            triggerRecalculate();
          }
        }
      });
    });

    // Promocode
    let promocodeTimeout = null;
    async function handlePromocodeChange() {
      const code = promocodeInput?.value?.trim().toUpperCase() || '';
      const statusEl = document.getElementById('promocode-status');
      const hintEl = document.getElementById('promocode-hint');

      state.promocode = code;

      if (!code) {
        state.promocodeDiscount = 0;
        state.promocodeValid = false;
        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'promocode-status'; }
        if (hintEl) hintEl.textContent = 'Промокод даёт скидку на комиссию сервиса';
        triggerRecalculate();
        return;
      }

      if (statusEl) { statusEl.textContent = '...'; statusEl.className = 'promocode-status checking'; }

      const result = await validatePromocode(code);

      if (result.valid && result.discount > 0) {
        if (statusEl) { statusEl.textContent = '✓'; statusEl.className = 'promocode-status valid'; }
        if (hintEl) hintEl.textContent = `Скидка ${result.discount}% на комиссию сервиса`;
      } else {
        if (statusEl) { statusEl.textContent = '✗'; statusEl.className = 'promocode-status invalid'; }
        if (hintEl) hintEl.textContent = 'Промокод недействителен';
      }

      triggerRecalculate();
    }

    promocodeInput?.addEventListener('input', function() {
      if (promocodeTimeout) clearTimeout(promocodeTimeout);
      promocodeTimeout = setTimeout(handlePromocodeChange, 500);
    });

    // Checkbox
    document.getElementById('agree-terms')?.addEventListener('change', updatePayButtonState);

    // Pay button
    document.getElementById('pay-btn')?.addEventListener('click', processPayment);

    // Enter на инпуте суммы
    amountInput?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const payBtn = document.getElementById('pay-btn');
        if (payBtn && !payBtn.disabled) payBtn.click();
      }
    });

    // Валидация промокода при загрузке
    setTimeout(handlePromocodeChange, 1000);
  }

  function addCartTopUpButton() {
    const checkoutButtons = document.querySelectorAll('button._1OKOHubCISYxpyNw0_nSgh');

    checkoutButtons.forEach((checkoutBtn) => {
      if (checkoutBtn.parentElement.querySelector('.bp-topup-btn')) return;

      const topUpBtn = document.createElement('button');
      topUpBtn.type = 'button';
      topUpBtn.className = 'bp-topup-btn';
      topUpBtn.innerHTML = 'Пополнить баланс Steam';

      topUpBtn.addEventListener('click', async () => {
        const form = document.getElementById('steam-balance-form');
        if (form) {
          form.style.display = 'block';

          if (state.paymentMethods.length === 0) {
            try {
              const methods = await fetchPaymentMethods();
              renderPaymentMethods(methods);
            } catch (error) {
              showNotification('Ошибка загрузки способов оплаты', 'error');
            }
          }

          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      checkoutBtn.parentElement.insertBefore(topUpBtn, checkoutBtn.nextSibling);
    });
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // SPA навигация
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
