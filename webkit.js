// BattlePass Steam Balance Helper - Millennium Plugin
// Адаптированная версия для Steam Desktop Client
// ============================================

// ТЕСТ: Визуальный индикатор что скрипт загрузился
(function() {
  const testDiv = document.createElement('div');
  testDiv.id = 'bp-load-indicator';
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: #00ff00;
    color: #000;
    padding: 10px 20px;
    z-index: 99999999;
    font-size: 16px;
    font-weight: bold;
    border-radius: 8px;
    font-family: Arial, sans-serif;
  `;
  testDiv.textContent = '✓ BattlePass LOADED! URL: ' + window.location.href.substring(0, 50);

  if (document.body) {
    document.body.appendChild(testDiv);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(testDiv);
    });
  }

  // Убираем через 10 секунд
  setTimeout(() => {
    const el = document.getElementById('bp-load-indicator');
    if (el) el.remove();
  }, 10000);
})();

(function() {
  'use strict';

  // Проверяем, не инициализирован ли уже плагин
  if (window.__battlepassInitialized) return;
  window.__battlepassInitialized = true;

  // ============================================
  // КАСТОМНАЯ КОНСОЛЬ ДЛЯ ОТЛАДКИ
  // ============================================
  function createDebugConsole() {
    if (document.getElementById('bp-debug-console')) return;

    const consoleHTML = `
      <div id="bp-debug-console" style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 200px;
        background: rgba(0, 0, 0, 0.95);
        border-top: 2px solid #0396ff;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        z-index: 9999999;
        display: flex;
        flex-direction: column;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 8px;
          background: #1a1a2e;
          border-bottom: 1px solid #333;
        ">
          <span style="color: #0396ff; font-weight: bold;">🔧 BattlePass Debug Console</span>
          <div>
            <button id="bp-console-clear" style="
              background: #333;
              color: #fff;
              border: none;
              padding: 2px 8px;
              margin-right: 4px;
              cursor: pointer;
              border-radius: 3px;
            ">Clear</button>
            <button id="bp-console-toggle" style="
              background: #333;
              color: #fff;
              border: none;
              padding: 2px 8px;
              cursor: pointer;
              border-radius: 3px;
            ">_</button>
            <button id="bp-console-close" style="
              background: #eb4242;
              color: #fff;
              border: none;
              padding: 2px 8px;
              margin-left: 4px;
              cursor: pointer;
              border-radius: 3px;
            ">✕</button>
          </div>
        </div>
        <div id="bp-console-output" style="
          flex: 1;
          overflow-y: auto;
          padding: 8px;
          color: #ccc;
        "></div>
        <div style="
          display: flex;
          border-top: 1px solid #333;
        ">
          <span style="color: #0396ff; padding: 8px;">›</span>
          <input id="bp-console-input" type="text" placeholder="Введите JS код и нажмите Enter..." style="
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            padding: 8px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            outline: none;
          ">
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = consoleHTML;
    document.body.appendChild(container.firstElementChild);

    const output = document.getElementById('bp-console-output');
    const input = document.getElementById('bp-console-input');
    const consoleEl = document.getElementById('bp-debug-console');

    // Функция вывода в консоль
    window.__bpLog = function(type, ...args) {
      const colors = {
        log: '#ccc',
        info: '#0396ff',
        warn: '#ffa500',
        error: '#eb4242',
        debug: '#888'
      };
      const time = new Date().toLocaleTimeString();
      const text = args.map(a => {
        if (typeof a === 'object') {
          try { return JSON.stringify(a, null, 2); }
          catch { return String(a); }
        }
        return String(a);
      }).join(' ');

      const line = document.createElement('div');
      line.style.cssText = `
        color: ${colors[type] || '#ccc'};
        margin-bottom: 4px;
        word-break: break-all;
        white-space: pre-wrap;
      `;
      line.innerHTML = `<span style="color: #666;">[${time}]</span> <span style="color: ${colors[type]};">[${type.toUpperCase()}]</span> ${escapeHtml(text)}`;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    };

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Перехват console
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    console.log = function(...args) {
      originalConsole.log.apply(console, args);
      window.__bpLog('log', ...args);
    };
    console.info = function(...args) {
      originalConsole.info.apply(console, args);
      window.__bpLog('info', ...args);
    };
    console.warn = function(...args) {
      originalConsole.warn.apply(console, args);
      window.__bpLog('warn', ...args);
    };
    console.error = function(...args) {
      originalConsole.error.apply(console, args);
      window.__bpLog('error', ...args);
    };
    console.debug = function(...args) {
      originalConsole.debug.apply(console, args);
      window.__bpLog('debug', ...args);
    };

    // Перехват ошибок
    window.addEventListener('error', (e) => {
      window.__bpLog('error', `Uncaught Error: ${e.message} at ${e.filename}:${e.lineno}`);
    });

    window.addEventListener('unhandledrejection', (e) => {
      window.__bpLog('error', `Unhandled Promise Rejection: ${e.reason}`);
    });

    // Выполнение JS кода
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const code = input.value.trim();
        if (!code) return;

        window.__bpLog('info', `> ${code}`);
        try {
          const result = eval(code);
          window.__bpLog('log', result);
        } catch (err) {
          window.__bpLog('error', err.message);
        }
        input.value = '';
      }
    });

    // Кнопки управления
    document.getElementById('bp-console-clear').addEventListener('click', () => {
      output.innerHTML = '';
    });

    let minimized = false;
    document.getElementById('bp-console-toggle').addEventListener('click', () => {
      minimized = !minimized;
      consoleEl.style.height = minimized ? '30px' : '200px';
      output.style.display = minimized ? 'none' : 'block';
      input.parentElement.style.display = minimized ? 'none' : 'flex';
    });

    document.getElementById('bp-console-close').addEventListener('click', () => {
      consoleEl.style.display = 'none';
    });

    // Начальное сообщение
    window.__bpLog('info', 'BattlePass Debug Console initialized');
    window.__bpLog('info', `Current URL: ${window.location.href}`);
    window.__bpLog('info', `Document ready state: ${document.readyState}`);
    window.__bpLog('info', 'Press Ctrl+Shift+D to toggle console');

    // Горячая клавиша Ctrl+Shift+D для показа/скрытия консоли
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const consoleEl = document.getElementById('bp-debug-console');
        if (consoleEl) {
          consoleEl.style.display = consoleEl.style.display === 'none' ? 'flex' : 'none';
        }
      }
    });
  }

  // Создаём консоль сразу
  if (document.body) {
    createDebugConsole();
  } else {
    document.addEventListener('DOMContentLoaded', createDebugConsole);
  }

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

  // Проверяем тип страницы (учитываем разные форматы URL в Steam Desktop Client)
  const currentUrl = window.location.href;
  const isCheckoutPage = currentUrl.includes('checkout.steampowered.com') || currentUrl.includes('/checkout');
  const isCartPage = currentUrl.includes('store.steampowered.com/cart') || currentUrl.includes('/cart') || currentUrl.endsWith('/cart');
  const isAppPage = currentUrl.includes('store.steampowered.com/app/') || currentUrl.includes('/app/');
  const isBundlePage = currentUrl.includes('store.steampowered.com/bundle/') || currentUrl.includes('/bundle/');
  const isAddFundsPage = currentUrl.includes('store.steampowered.com/steamaccount/addfunds') || currentUrl.includes('/steamaccount/addfunds');
  const isSteamPage = currentUrl.includes('steampowered.com') || currentUrl.includes('steamcommunity.com') || currentUrl.includes('localhost');

  console.log('[BattlePass] Page detection:', {
    currentUrl,
    isCheckoutPage,
    isCartPage,
    isAppPage,
    isBundlePage,
    isAddFundsPage,
    isSteamPage
  });

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
    console.log('[BattlePass] Init started');
    console.log('[BattlePass] document.body exists:', !!document.body);
    console.log('[BattlePass] document.readyState:', document.readyState);

    if (document.getElementById('steam-balance-form')) {
      console.log('[BattlePass] Form already exists, skipping init');
      return;
    }

    console.log('[BattlePass] Getting Steam user info...');
    getSteamUserInfo();

    console.log('[BattlePass] Creating payment form...');
    const formContainer = document.createElement('div');
    formContainer.innerHTML = createPaymentForm();

    if (!document.body) {
      console.error('[BattlePass] document.body is null!');
      return;
    }

    document.body.insertBefore(formContainer.firstElementChild, document.body.firstChild);
    console.log('[BattlePass] Form inserted into body');

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
    console.log('[BattlePass] isCartPage:', isCartPage);
    if (isCartPage) {
      console.log('[BattlePass] Cart page detected, adding top-up button...');
      setTimeout(() => {
        addCartTopUpButton();
        console.log('[BattlePass] Cart button add attempt completed');
      }, 1000);

      // Throttle MutationObserver
      let cartObserverTimeout = null;
      const cartObserver = new MutationObserver(() => {
        if (cartObserverTimeout) clearTimeout(cartObserverTimeout);
        cartObserverTimeout = setTimeout(() => {
          addCartTopUpButton();
        }, 500);
      });
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

  // Получить цену и валюту из корзины Steam
  function getCartTotal() {
    // Способ 1: Новый интерфейс Steam - ищем по тексту "Общая стоимость" или "Estimated total"
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const text = el.textContent || '';
      if ((text.includes('Общая стоимость') || text.includes('Estimated total') || text.includes('Total')) && el.children.length === 0) {
        // Нашли label, ищем цену рядом
        const parent = el.parentElement;
        if (parent) {
          const priceEl = parent.querySelector('[class*="price"], [class*="Price"], [class*="total"], [class*="Total"]') ||
                          parent.lastElementChild;
          if (priceEl && priceEl !== el) {
            const priceText = priceEl.textContent || '';
            const match = priceText.match(/(\d[\d\s,\.]*)/);
            if (match) {
              const amount = parseInt(match[1].replace(/[\s,\.]/g, ''));
              let currency = 'RUB';
              if (priceText.includes('₸') || priceText.includes('тг') || priceText.includes('KZT')) {
                currency = 'KZT';
              }
              return { amount, currency };
            }
          }
        }
      }
    }

    // Способ 2: Ищем по классам нового интерфейса
    const priceSelectors = [
      '._2DjadWLFH3keW9rGWZKxSk', // старый класс
      '[class*="CartTotal"]',
      '[class*="cart_total"]',
      '[class*="TotalPrice"]',
      '[class*="total_price"]',
      '[class*="EstimatedTotal"]'
    ];

    for (const selector of priceSelectors) {
      const rows = document.querySelectorAll(selector);
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes('Общая') || text.includes('Total') || text.includes('Итого')) {
          const match = text.match(/(\d[\d\s,\.]*)/);
          if (match) {
            const amount = parseInt(match[1].replace(/[\s,\.]/g, ''));
            let currency = 'RUB';
            if (text.includes('₸') || text.includes('тг') || text.includes('KZT')) {
              currency = 'KZT';
            }
            return { amount, currency };
          }
        }
      }
    }

    // Способ 3: Ищем любой элемент с ценой в области корзины
    const cartArea = document.querySelector('[class*="cart"], [class*="Cart"], #cart_area, .cart_area');
    if (cartArea) {
      const priceElements = cartArea.querySelectorAll('[class*="price"], [class*="Price"], [class*="total"], [class*="Total"]');
      for (const el of priceElements) {
        const text = el.textContent || '';
        const match = text.match(/(\d[\d\s,\.]*)\s*[₽₸руб]/);
        if (match) {
          const amount = parseInt(match[1].replace(/[\s,\.]/g, ''));
          let currency = 'RUB';
          if (text.includes('₸') || text.includes('тг') || text.includes('KZT')) {
            currency = 'KZT';
          }
          return { amount, currency };
        }
      }
    }

    return null;
  }

  function addCartTopUpButton() {
    console.log('[BattlePass] addCartTopUpButton() called');

    // Логируем все кнопки на странице для отладки
    const allButtons = document.querySelectorAll('button');
    console.log('[BattlePass] Total buttons on page:', allButtons.length);
    allButtons.forEach((btn, i) => {
      if (i < 10) { // Первые 10
        console.log(`[BattlePass] Button ${i}:`, btn.className, btn.textContent.trim().substring(0, 50));
      }
    });

    // Селекторы для кнопки оплаты в разных версиях интерфейса Steam
    const checkoutSelectors = [
      'button._1OKOHubCISYxpyNw0_nSgh', // старый класс
      'button[class*="checkout"]',
      'button[class*="Checkout"]',
      'button[class*="purchase"]',
      'button[class*="Purchase"]',
      'a[class*="checkout"]',
      'a[class*="Checkout"]',
      '.btn_green_steamui.btn_medium', // стандартная зелёная кнопка Steam
      '#btn_purchase_self',
      '[class*="CheckoutButton"]',
      '[class*="checkout_btn"]',
      '[class*="PurchaseButton"]'
    ];

    let checkoutButtons = [];
    for (const selector of checkoutSelectors) {
      const buttons = document.querySelectorAll(selector);
      console.log(`[BattlePass] Selector "${selector}" found:`, buttons.length);
      if (buttons.length > 0) {
        checkoutButtons = Array.from(buttons).filter(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return text.includes('оплат') || text.includes('checkout') || text.includes('purchase') ||
                 text.includes('купить') || text.includes('перейти') || text.includes('continue');
        });
        console.log(`[BattlePass] After text filter:`, checkoutButtons.length);
        if (checkoutButtons.length > 0) break;
      }
    }

    // Fallback: ищем любую зелёную кнопку в области корзины
    if (checkoutButtons.length === 0) {
      console.log('[BattlePass] No checkout buttons found, trying fallback...');
      const cartArea = document.querySelector('[class*="cart"], [class*="Cart"], #cart_area, .cart_area, [class*="checkout"], [class*="Checkout"]');
      console.log('[BattlePass] Cart area found:', !!cartArea);
      if (cartArea) {
        console.log('[BattlePass] Cart area classes:', cartArea.className);
        const greenButtons = cartArea.querySelectorAll('button, a.btn_green_steamui, [class*="Primary"], [class*="primary"]');
        console.log('[BattlePass] Green buttons in cart area:', greenButtons.length);
        checkoutButtons = Array.from(greenButtons).filter(btn => {
          const text = (btn.textContent || '').toLowerCase();
          return text.includes('оплат') || text.includes('checkout') || text.includes('purchase') ||
                 text.includes('купить') || text.includes('перейти') || text.includes('continue') ||
                 text.includes('к оплате');
        });
      }
    }

    console.log('[BattlePass] Final checkout buttons count:', checkoutButtons.length);

    checkoutButtons.forEach((checkoutBtn) => {
      // Проверяем, не добавлена ли уже кнопка
      const parent = checkoutBtn.parentElement;
      if (!parent || parent.querySelector('.bp-topup-btn')) return;

      const topUpBtn = document.createElement('button');
      topUpBtn.type = 'button';
      topUpBtn.className = 'bp-topup-btn';
      topUpBtn.innerHTML = 'Пополнить баланс Steam';

      topUpBtn.addEventListener('click', async () => {
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

          // Получаем сумму из корзины и подставляем
          const cartData = getCartTotal();
          if (cartData && amountInput) {
            amountInput.value = cartData.amount;

            if (cartData.currency && cartData.currency !== state.currency) {
              state.currency = cartData.currency;
              storageSet({ currency: cartData.currency });
              updateCurrencyUI();
            }

            triggerRecalculate();
          }

          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      parent.insertBefore(topUpBtn, checkoutBtn.nextSibling);
    });

    // Если не нашли кнопки оплаты, пробуем добавить в область корзины
    if (checkoutButtons.length === 0) {
      const cartContainers = document.querySelectorAll('[class*="cart_area"], [class*="CartArea"], [class*="checkout_content"], [class*="CheckoutContent"], #cart_area');
      cartContainers.forEach(container => {
        if (container.querySelector('.bp-topup-btn')) return;

        const topUpBtn = document.createElement('button');
        topUpBtn.type = 'button';
        topUpBtn.className = 'bp-topup-btn';
        topUpBtn.style.marginTop = '16px';
        topUpBtn.innerHTML = 'Пополнить баланс Steam';

        topUpBtn.addEventListener('click', async () => {
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

            const cartData = getCartTotal();
            if (cartData && amountInput) {
              amountInput.value = cartData.amount;

              if (cartData.currency && cartData.currency !== state.currency) {
                state.currency = cartData.currency;
                storageSet({ currency: cartData.currency });
                updateCurrencyUI();
              }

              triggerRecalculate();
            }

            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });

        container.appendChild(topUpBtn);
      });
    }
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
