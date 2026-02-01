// BattlePass Steam Plugin - Webkit Entry
// Выполняется на страницах Steam Store
// Полная копия функционала Chrome extension

const API_BASE = 'https://profile.battlepass.ru';
const ORG = 'extension';

// API endpoints
const API_ENDPOINTS = {
  authSteam: '/api/v2/user/auth/steam',
  bills: `/api/v2/payment/bills/steam?org=${ORG}`,
  commission: `/api/v2/payment/comission?org=${ORG}`,
  createInvoice: `/api/v2/payment/create?org=${ORG}`,
  validatePromocode: `/api/v2/payment/validate?org=${ORG}`,
  convert: `/api/v2/payment/convert?org=${ORG}`,
};

// Состояние приложения
interface State {
  token: string | null;
  user: any;
  steamLogin: string | null;
  steamId64: string | null;
  paymentMethods: any[];
  selectedMethod: any;
  currentCommission: any;
  promocode: string;
  promocodeDiscount: number;
  promocodeValid: boolean;
  currency: string;
  steamCurrency: string | null;
  convertedAmount: number | null;
}

const state: State = {
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
// CSS СТИЛИ (из styles.css)
// ============================================
const styles = `
:root {
  --back-color: #2b323c;
  --main-color: #334056;
  --bg-card-color: rgb(51 64 86 / 60%);
  --dark-color: #23282e;
  --text-color: #cfd4da;
  --white-color: #fff;
  --blue-color: #0396ff;
  --action-bg: var(--blue-color);
  --action-text: var(--white-color);
  --green-color: #48c432;
  --red-color: #eb4242;
  --grid-module: 4px;
}

.steam-balance-toggle-btn {
  position: fixed;
  top: 50px;
  right: 20px;
  z-index: 999999;
  border-radius: 8px;
  border: none;
  padding: 8px 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-decoration: none;
  font-family: Jost, "Segoe UI", Arial, sans-serif;
  background: var(--action-bg);
  color: var(--action-text);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  transition: box-shadow 100ms ease-in-out;
  will-change: box-shadow;
}

.steam-balance-toggle-btn > span {
  display: block;
}

.steam-balance-toggle-btn:hover {
  box-shadow: 0 0 10px var(--action-bg);
}

.steam-balance-container {
  position: fixed;
  top: 110px;
  right: 20px;
  width: 420px;
  max-height: 85vh;
  overflow-y: auto;
  z-index: 999998;
  background: var(--main-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0px 12px 16px 0px rgba(0, 0, 0, 0.24);
  font-family: Jost, "Segoe UI", Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.steam-balance-container.checkout-page {
  position: relative;
  width: 100%;
  max-width: 940px;
  margin: 0 auto 20px;
  top: 32px;
  right: 0;
}

.form-header {
  background: var(--dark-color);
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.form-header h3 {
  margin: 0;
  color: var(--white-color);
  font-size: 18px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-color);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: var(--white-color);
}

.form-content {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.steam-login-section {
  margin-bottom: 16px;
}

.steam-login-section h4,
.payment-methods h4,
.amount-section h4,
.currency-section h4,
.promocode-section h4 {
  color: var(--white-color);
  font-size: 14px;
  margin: 0 0 8px 0;
  font-weight: 700;
  text-transform: none;
}

.login-hint,
.amount-hint,
.promocode-hint {
  display: block;
  color: var(--text-color);
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
}

.methods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.method-btn {
  display: flex;
  align-items: center;
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: normal;
  transition: all 0.2s ease;
  font-family: "Segoe UI", Arial, sans-serif;
  text-align: left;
}

.method-btn:hover {
  background: var(--main-color);
  border-color: var(--blue-color);
  color: var(--white-color);
}

.method-btn.active {
  background: var(--blue-color);
  border-color: var(--blue-color);
  color: var(--white-color);
}

.method-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
  margin-left: 8px;
}

.method-name {
  font-size: 12px;
}

.method-commission {
  display: block;
  font-size: 11px;
  color: var(--text-color);
  margin-top: 2px;
  font-weight: 500;
}

.method-btn.active .method-commission {
  color: var(--white-color);
}

.currency-section {
  margin-bottom: 16px;
}

.currency-selector {
  display: flex;
  gap: 8px;
}

.currency-btn {
  flex: 1;
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
  font-family: Jost, "Segoe UI", Arial, sans-serif;
}

.currency-btn:hover {
  background: var(--main-color);
  color: var(--white-color);
  border-color: var(--blue-color);
}

.currency-btn.active {
  background: var(--blue-color);
  border-color: var(--blue-color);
  color: var(--white-color);
}

.amount-section {
  margin-bottom: 12px;
}

.amount-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--white-color);
  font-size: 14px;
  font-weight: normal;
  font-family: "Segoe UI", Arial, sans-serif;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.amount-input:focus {
  outline: none;
  border-color: var(--blue-color);
  background: var(--dark-color);
}

.amount-input.error {
  border-color: #ff4444 !important;
  background: rgba(255, 68, 68, 0.1);
}

.amount-input::placeholder {
  color: var(--text-color);
  opacity: 0.6;
}

.amount-error {
  display: block;
  font-size: 12px;
  color: #ff4444;
  margin-bottom: 4px;
}

.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.amount-input[type="number"] {
  -moz-appearance: textfield;
}

.quick-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.amount-btn {
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-color);
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: normal;
  transition: all 0.2s ease;
  font-family: "Segoe UI", Arial, sans-serif;
}

.amount-btn:hover {
  background: var(--main-color);
  color: var(--white-color);
  border-color: var(--blue-color);
}

.promocode-section {
  margin-bottom: 16px;
}

.promocode-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.promocode-input-wrapper input {
  flex: 1;
  text-transform: uppercase;
}

.promocode-status {
  position: absolute;
  right: 12px;
  font-size: 16px;
  font-weight: bold;
}

.promocode-status.checking {
  color: var(--text-color);
}

.promocode-status.valid {
  color: var(--green-color);
}

.promocode-status.invalid {
  color: var(--red-color);
}

.balance-info {
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
  position: relative;
  min-height: 80px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  color: var(--text-color);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  line-height: 1.4;
}

.info-row:last-child {
  margin-bottom: 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 700;
  color: var(--white-color);
}

.total-row {
  font-weight: 700;
  color: var(--white-color) !important;
}

.total-row span {
  color: var(--white-color) !important;
}

.discount-row .discount-value {
  color: var(--green-color);
}

.balance-spinner {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  color: #c7d5e0;
  font-size: 13px;
  gap: 10px;
  z-index: 1;
}

.balance-spinner .spinner-circle {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(103, 193, 245, 0.2);
  border-top-color: #67c1f5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.balance-content {
  transition: opacity 0.15s ease;
}

.terms-checkbox {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--dark-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.terms-checkbox label {
  display: flex;
  align-items: flex-start;
  color: var(--text-color);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.5;
}

.terms-checkbox input[type="checkbox"] {
  margin-right: 8px;
  margin-top: 2px;
  cursor: pointer;
  flex-shrink: 0;
}

.terms-checkbox a {
  color: var(--blue-color);
  text-decoration: underline;
}

.terms-checkbox a:hover {
  color: var(--white-color);
}

.support-link-section {
  text-align: center;
  margin-bottom: 12px;
}

.support-link-section small {
  color: var(--text-color);
  font-size: 12px;
  font-weight: 500;
}

.support-link-section .support-link {
  color: var(--blue-color);
  text-decoration: underline;
}

.support-link-section .support-link:hover {
  color: var(--white-color);
}

.pay-button {
  width: 100%;
  border-radius: 8px;
  border: none;
  padding: 8px 16px;
  display: inline-block;
  cursor: pointer;
  text-decoration: none;
  font-family: "Segoe UI", Arial, sans-serif;
  background: var(--action-bg);
  color: var(--action-text);
  font-size: 15px;
  font-weight: 500;
  line-height: 30px;
  text-transform: none;
  transition: box-shadow 100ms ease-in-out;
  will-change: box-shadow;
}

.pay-button > span {
  display: block;
}

.pay-button:hover:not(:disabled) {
  box-shadow: 0 0 10px var(--action-bg);
}

.pay-button:disabled {
  background: rgba(0, 0, 0, 0.2);
  color: #8b929a;
  cursor: default;
  opacity: 0.6;
}

.payment-note {
  margin-top: 12px;
  text-align: center;
}

.payment-note small {
  color: #8b929a;
  font-size: 11px;
}

.loading-methods {
  color: #8b929a;
  text-align: center;
  padding: 20px;
  font-size: 13px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.steam-balance-container:not(.checkout-page) {
  animation: fadeIn 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes slideUp {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, -20px); }
}

.steam-balance-container::-webkit-scrollbar {
  width: 8px;
}

.steam-balance-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.steam-balance-container::-webkit-scrollbar-thumb {
  background: rgba(103, 193, 245, 0.3);
  border-radius: 4px;
}

.steam-balance-container::-webkit-scrollbar-thumb:hover {
  background: rgba(103, 193, 245, 0.5);
}

@media (max-width: 768px) {
  .steam-balance-container:not(.checkout-page) {
    width: calc(100% - 40px);
    right: 20px;
    left: 20px;
    top: 70px;
  }

  .steam-balance-toggle-btn {
    right: 20px;
    top: 10px;
  }

  .methods-grid {
    grid-template-columns: 1fr;
  }

  .quick-amounts {
    grid-template-columns: repeat(2, 1fr);
  }
}

button:focus,
input:focus {
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Inline top-up button on game pages */
.bp-topup-inline-btn {
  display: inline-block;
  vertical-align: top;
}

.bp-topup-btn {
  margin-top: 8px;
  background: var(--action-bg);
  color: var(--action-text);
  border-radius: 8px;
  padding: 12px 16px;
  font-weight: 600;
  text-transform: uppercase;
  transition: box-shadow 100ms ease-in-out;
  border: none;
  font-family: Jost, "Segoe UI", Arial, sans-serif;
}

.bp-topup-btn:hover {
  box-shadow: 0 0 10px var(--action-bg);
}
`;

// ============================================
// API ФУНКЦИИ
// ============================================

// Debug log visible in UI
function debugLog(message: string, isError = false) {
  console.log(`[BattlePass] ${message}`);

  // Create debug panel if not exists
  let debugPanel = document.getElementById('bp-debug-panel');
  if (!debugPanel) {
    debugPanel = document.createElement('div');
    debugPanel.id = 'bp-debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: 400px;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(0,0,0,0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 8px;
      z-index: 9999999;
      border: 1px solid #333;
    `;
    document.body.appendChild(debugPanel);
  }

  const line = document.createElement('div');
  line.style.color = isError ? '#f44' : '#0f0';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  debugPanel.appendChild(line);
  debugPanel.scrollTop = debugPanel.scrollHeight;
}

async function apiRequest(endpoint: string, method = 'GET', body: any = null, token: string | null = null) {
  debugLog(`API ${method} ${endpoint}`);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options: RequestInit = { method, headers };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    debugLog(`Response: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errorText = await res.text();
      debugLog(`Error body: ${errorText.substring(0, 100)}`, true);
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    debugLog(`Success: ${JSON.stringify(data).substring(0, 50)}...`);
    return data;
  } catch (error: any) {
    debugLog(`Fetch error: ${error.message}`, true);
    throw error;
  }
}

// Получить Steam ID64 и логин со страницы
function getSteamUserInfo() {
  // Попытка 1: Из глобального объекта g_steamID
  if (typeof (window as any).g_steamID !== 'undefined' && (window as any).g_steamID) {
    state.steamId64 = (window as any).g_steamID;
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
    const match = script.textContent?.match(/g_steamID\s*=\s*"(\d{17})"/);
    if (match) {
      state.steamId64 = match[1];
    }
  });

  // Получаем логин
  const accountNameSpan = document.querySelector('.account_name');
  if (accountNameSpan) {
    state.steamLogin = accountNameSpan.textContent?.trim() || null;
  }

  if (!state.steamLogin) {
    const accountLink = document.querySelector('a[href*="/account/"]');
    if (accountLink) {
      const accountText = accountLink.textContent?.trim() || '';
      const match = accountText.match(/:\s*(.+)$/);
      if (match) {
        state.steamLogin = match[1].trim();
      }
    }
  }

  if (!state.steamLogin) {
    const accountName = document.querySelector('#account_pulldown, .persona_name, .playerAvatar + a');
    if (accountName) {
      state.steamLogin = accountName.textContent?.trim() || null;
    }
  }

  console.log('[BattlePass] Steam info:', { steamId64: state.steamId64, steamLogin: state.steamLogin });
  return { steamId64: state.steamId64, steamLogin: state.steamLogin };
}

// Авторизация через Steam
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

// Получить способы оплаты
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

// Рассчитать комиссию
async function calculateCommission(amount: number, methodName: string, currency = 'rub', promocode: string | null = null) {
  if (!state.token) {
    await authWithSteam();
  }

  try {
    const requestBody = {
      amount: parseInt(String(amount)),
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

// Валидация промокода
async function validatePromocode(code: string) {
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

    console.log('[BattlePass] Promocode validated:', { code: upperCode, discount });
    return { valid: state.promocodeValid, discount };
  } catch (error) {
    console.error('[BattlePass] Promocode validation error:', error);
    state.promocodeDiscount = 0;
    state.promocodeValid = false;
    return { valid: false, discount: 0 };
  }
}

// Определить валюту Steam аккаунта
function detectSteamCurrency() {
  const priceElements = document.querySelectorAll('.game_purchase_price, .discount_final_price, .price, [data-price-final]');

  for (const el of priceElements) {
    const text = el.textContent || '';

    if (text.includes('₸') || text.includes('KZT') || text.match(/\d+[,\s]?\d*\s*тг/i)) {
      state.steamCurrency = 'KZT';
      console.log('[BattlePass] Detected Steam currency: KZT');
      return 'KZT';
    }

    if (text.includes('₽') || text.includes('руб') || text.includes('pуб')) {
      state.steamCurrency = 'RUB';
      console.log('[BattlePass] Detected Steam currency: RUB');
      return 'RUB';
    }
  }

  state.steamCurrency = 'RUB';
  console.log('[BattlePass] Steam currency not detected, defaulting to RUB');
  return 'RUB';
}

// Конвертация валюты
async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  if (!state.token) {
    await authWithSteam();
  }

  if (fromCurrency === toCurrency) {
    return { amount: amount, rate: 1 };
  }

  try {
    const result = await apiRequest(API_ENDPOINTS.convert, 'POST', {
      amount: parseInt(String(amount)),
      account: state.steamLogin || 'test',
      type: 1,
      isIncludeCommission: true,
      billType: 1,
      inputCurrency: fromCurrency.toLowerCase(),
      outputCurrency: toCurrency.toLowerCase(),
    }, state.token);

    console.log('[BattlePass] Convert result:', result);
    state.convertedAmount = result.input || result.amount;
    return result;
  } catch (error) {
    console.error('[BattlePass] Convert error:', error);
    throw error;
  }
}

// Создать заказ
async function createOrder(amount: number, methodName: string, currency: string, promocode: string | null = null) {
  if (!state.token) {
    await authWithSteam();
  }

  if (!state.steamLogin) {
    throw new Error('Не удалось получить Steam логин');
  }

  const region = { name: 'Россия', value: 'RU' };

  console.log('[BattlePass] Creating order:', { amount, currency, methodName, region, promocode });

  try {
    const inputValues: any[] = [
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
          <input type="number" id="custom-amount" placeholder="От 50" min="50" class="amount-input" value="100">
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
          <small>🔒 Платежи обрабатываются через защищенное соединение BattlePass</small>
        </div>
      </div>
    </div>
  `;
}

// Рендер способов оплаты
function renderPaymentMethods(methods: any[]) {
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
    btn.addEventListener('click', function(this: HTMLElement) {
      grid.querySelectorAll('.method-btn').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');

      const methodName = this.dataset.method;
      state.selectedMethod = methods.find((m) => m.name === methodName);
      triggerRecalculate();
    });
  });

  const amount = (document.getElementById('custom-amount') as HTMLInputElement)?.value;
  if (amount && parseInt(amount) > 0) {
    triggerRecalculate();
  }
}

// ============================================
// ЕДИНАЯ ФУНКЦИЯ ПЕРЕСЧЁТА
// ============================================

function setBalanceInfoLoading(isLoading: boolean) {
  const balanceInfo = document.querySelector('.balance-info');
  if (!balanceInfo) return;

  let spinner = balanceInfo.querySelector('.balance-spinner') as HTMLElement;
  let content = balanceInfo.querySelector('.balance-content') as HTMLElement;

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

interface RecalculateParams {
  amount: string | number;
  currency: string;
  methodName?: string;
  promocode?: string;
  promocodeDiscount?: number;
  steamLogin?: string;
}

async function recalculatePayment(params: RecalculateParams) {
  const { amount, currency, methodName, promocode, promocodeDiscount } = params;

  const numAmount = parseInt(String(amount)) || 0;
  const convertRow = document.getElementById('convert-row');
  const convertInfo = document.getElementById('convert-info');

  const actualMethodName = methodName || state.selectedMethod?.name;
  if (!actualMethodName || !state.selectedMethod) {
    return null;
  }

  const minAmount = state.selectedMethod.min || 50;
  if (numAmount < minAmount) {
    const priceEl = document.getElementById('price-with-commission');
    const discountRow = document.getElementById('discount-row');
    const totalEl = document.getElementById('total-amount');
    if (priceEl) priceEl.textContent = '0 ₽';
    if (discountRow) discountRow.style.display = 'none';
    if (totalEl) totalEl.textContent = '0 ₽';
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

    const commissionResponse = await calculateCommission(amountForCommission, actualMethodName, 'rub', promocode || null);

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

    if (priceWithCommissionEl) {
      priceWithCommissionEl.textContent = `${priceWithoutDiscount} ₽`;
    }

    if (discountAmount > 0) {
      if (discountRow) discountRow.style.display = 'flex';
      if (discountEl) discountEl.textContent = `- ${discountAmount} ₽`;
    } else {
      if (discountRow) discountRow.style.display = 'none';
    }

    if (totalAmountEl) {
      totalAmountEl.textContent = `${finalPrice} ₽`;
    }

    const result = {
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
    state.currentCommission = result;

    return result;
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

let recalculateTimeout: number | null = null;
function triggerRecalculate() {
  if (recalculateTimeout) {
    clearTimeout(recalculateTimeout);
  }

  recalculateTimeout = window.setTimeout(() => {
    const amount = (document.getElementById('custom-amount') as HTMLInputElement)?.value || '0';
    const steamLogin = (document.getElementById('steam-login-input') as HTMLInputElement)?.value?.trim() || '';

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

// Валидация суммы
function validateAmount(amount: number) {
  const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
  const amountError = document.getElementById('amount-error');
  const minAmount = state.selectedMethod?.min || 50;
  const maxAmount = state.currency === 'KZT' ? 75000 : 15000;
  const currencySymbol = state.currency === 'KZT' ? '₸' : '₽';

  if (!amount || amount === 0) {
    amountInput?.classList.remove('error');
    if (amountError) amountError.style.display = 'none';
    return false;
  }

  if (amount < minAmount) {
    amountInput?.classList.add('error');
    if (amountError) {
      amountError.textContent = `Минимальная сумма для этого способа оплаты: ${minAmount} ${currencySymbol}`;
      amountError.style.display = 'block';
    }
    return false;
  }

  if (amount > maxAmount) {
    amountInput?.classList.add('error');
    if (amountError) {
      amountError.textContent = `Максимальная сумма: ${maxAmount} ${currencySymbol}`;
      amountError.style.display = 'block';
    }
    return false;
  }

  amountInput?.classList.remove('error');
  if (amountError) amountError.style.display = 'none';
  return true;
}

// Обновление состояния кнопки оплаты
function updatePayButtonState() {
  const payBtn = document.getElementById('pay-btn') as HTMLButtonElement;
  const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
  const agreeCheckbox = document.getElementById('agree-terms') as HTMLInputElement;
  const loginInput = document.getElementById('steam-login-input') as HTMLInputElement;

  const amount = parseInt(amountInput?.value) || 0;
  const agreeChecked = agreeCheckbox?.checked || false;
  const steamLogin = loginInput?.value?.trim() || '';

  const isAmountValid = validateAmount(amount);

  if (payBtn) {
    payBtn.disabled = !(isAmountValid && agreeChecked && steamLogin);
  }
}

// Создаем кнопку для открытия формы
function createToggleButton() {
  const button = document.createElement('button');
  button.id = 'steam-balance-toggle';
  button.className = 'steam-balance-toggle-btn';

  const span = document.createElement('span');
  span.textContent = 'Пополнить Steam';
  button.appendChild(span);

  return button;
}

// Обработка платежа
async function processPayment() {
  const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
  const loginInput = document.getElementById('steam-login-input') as HTMLInputElement;
  const amount = parseInt(amountInput?.value) || 0;
  const steamLogin = loginInput?.value?.trim() || '';

  if (!steamLogin) {
    showNotification('Пожалуйста, введите Steam логин', 'error');
    return;
  }

  if (!state.selectedMethod) {
    showNotification('Пожалуйста, выберите способ оплаты', 'error');
    return;
  }

  if (amount < state.selectedMethod.min) {
    showNotification(`Минимальная сумма для этого способа: ${state.selectedMethod.min} ₽`, 'error');
    return;
  }

  state.steamLogin = steamLogin;

  const payBtn = document.getElementById('pay-btn') as HTMLButtonElement;
  const payBtnSpan = payBtn?.querySelector('span');
  if (payBtn) payBtn.disabled = true;
  if (payBtnSpan) payBtnSpan.textContent = 'Создание заказа...';

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
  } catch (error: any) {
    showNotification(error.message || 'Ошибка при создании заказа', 'error', true);
    if (payBtn) payBtn.disabled = false;
    if (payBtnSpan) payBtnSpan.textContent = 'Оплатить';
  }
}

// Функция показа уведомлений
const SUPPORT_TG_URL = 'https://t.me/BattlePassSupportBot';

function showNotification(message: string, type = 'info', showSupport = false) {
  const existingNotification = document.getElementById('steam-balance-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'steam-balance-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999999;
    background: ${type === 'error' ? 'var(--red-color)' : 'var(--blue-color)'};
    color: var(--white-color);
    padding: 14px 24px;
    border-radius: 8px;
    box-shadow: 0px 12px 16px 0px rgba(0,0,0,0.24);
    font-family: Jost, "Segoe UI", Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    animation: slideDown 0.3s ease-out;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  `;

  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  notification.appendChild(messageSpan);

  if (showSupport && type === 'error') {
    const supportLink = document.createElement('a');
    supportLink.href = SUPPORT_TG_URL;
    supportLink.target = '_blank';
    supportLink.textContent = 'Написать в поддержку';
    supportLink.style.cssText = `
      color: var(--white-color);
      text-decoration: underline;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      opacity: 0.9;
    `;
    notification.appendChild(supportLink);
  }

  document.body.appendChild(notification);

  const timeout = showSupport && type === 'error' ? 5000 : 3000;
  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, timeout);
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

async function init() {
  debugLog('init() called');

  if (document.getElementById('steam-balance-form')) {
    debugLog('Form already exists, skipping');
    return;
  }

  // Добавляем стили
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  debugLog('Styles added');

  // Получаем информацию о Steam пользователе
  getSteamUserInfo();
  debugLog(`Steam info: login=${state.steamLogin}, id=${state.steamId64}`);

  // Создаем контейнер для формы
  const formContainer = document.createElement('div');
  formContainer.innerHTML = createPaymentForm();
  document.body.insertBefore(formContainer.firstElementChild!, document.body.firstChild);

  // Если это не страница checkout, создаем кнопку
  if (!isCheckoutPage) {
    const toggleBtn = createToggleButton();
    document.body.insertBefore(toggleBtn, document.body.firstChild);

    const form = document.getElementById('steam-balance-form');
    if (form) form.style.display = 'none';

    toggleBtn.addEventListener('click', async () => {
      debugLog('Toggle button clicked');
      if (!form) return;
      const isHidden = form.style.display === 'none';
      form.style.display = isHidden ? 'block' : 'none';
      debugLog(`Form visibility: ${isHidden ? 'shown' : 'hidden'}`);

      if (isHidden) {
        if (state.paymentMethods.length === 0) {
          debugLog('Loading payment methods...');
          try {
            const methods = await fetchPaymentMethods();
            debugLog(`Loaded ${methods.length} payment methods`);
            renderPaymentMethods(methods);
          } catch (error: any) {
            debugLog(`Failed to load methods: ${error.message}`, true);
            showNotification('Ошибка загрузки способов оплаты', 'error');
          }
        }

        const amount = (document.getElementById('custom-amount') as HTMLInputElement)?.value;
        if (amount && parseInt(amount) > 0 && state.paymentMethods.length > 0) {
          try {
            const promocodeInput = document.getElementById('promocode-input') as HTMLInputElement;
            if (promocodeInput && promocodeInput.value.trim()) {
              await validatePromocode(promocodeInput.value.trim());
            }
            triggerRecalculate();
          } catch (err) {
            console.error('[BattlePass] Error recalculating on open:', err);
          }
        }
      }
    });

    const closeBtn = document.getElementById('close-form');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (form) form.style.display = 'none';
        const termsCheckbox = document.getElementById('agree-terms') as HTMLInputElement;
        if (termsCheckbox) termsCheckbox.checked = false;
      });
    }

    // Закрытие по клику вне формы
    let mouseDownOutside = false;
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      const isTopUpBtn = target.closest('.bp-topup-btn') || target.closest('.bp-topup-inline-btn');
      mouseDownOutside = form ? !form.contains(target) && !toggleBtn.contains(target) && !isTopUpBtn : false;
    });
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const isTopUpBtn = target.closest('.bp-topup-btn') || target.closest('.bp-topup-inline-btn');
      if (form && form.style.display === 'block' && mouseDownOutside && !form.contains(target) && !toggleBtn.contains(target) && !isTopUpBtn) {
        form.style.display = 'none';
        const termsCheckbox = document.getElementById('agree-terms') as HTMLInputElement;
        if (termsCheckbox) termsCheckbox.checked = false;
      }
      mouseDownOutside = false;
    });
  } else {
    // На странице checkout сразу загружаем способы оплаты
    try {
      const methods = await fetchPaymentMethods();
      renderPaymentMethods(methods);
    } catch (error) {
      console.error('[BattlePass] Error loading methods:', error);
    }
  }

  // Устанавливаем логин если он известен
  const loginInput = document.getElementById('steam-login-input') as HTMLInputElement;
  if (state.steamLogin && loginInput) {
    loginInput.value = state.steamLogin;
  }

  // Определяем валюту страницы
  const pageCurrency = detectSteamCurrency();
  state.currency = pageCurrency;

  // Обновляем UI селектора валюты
  const currencySelector = document.getElementById('currency-selector');
  const currencyLabel = document.getElementById('currency-label');

  if (currencySelector) {
    currencySelector.querySelectorAll('.currency-btn').forEach((btn) => {
      const btnEl = btn as HTMLElement;
      btnEl.classList.toggle('active', btnEl.dataset.currency === state.currency);
    });

    if (currencyLabel) {
      currencyLabel.textContent = state.currency;
    }

    // Обработчики для кнопок валюты
    currencySelector.querySelectorAll('.currency-btn').forEach((btn) => {
      btn.addEventListener('click', async function(this: HTMLElement) {
        const newCurrency = this.dataset.currency || 'RUB';
        const oldCurrency = state.currency;
        if (newCurrency === oldCurrency) return;

        const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
        const currentAmount = parseInt(amountInput?.value) || 0;

        currencySelector.querySelectorAll('.currency-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');

        state.currency = newCurrency;
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
            if (amountInput) amountInput.value = String(convertedAmount);
            triggerRecalculate();
          } catch (err) {
            console.error('[BattlePass] Convert on currency change error:', err);
            triggerRecalculate();
          }
        }
      });
    });
  }

  // Обработчик для логина
  let loginTimeout: number | null = null;

  function handleLoginChange(newLogin: string) {
    const trimmedLogin = (newLogin || '').trim();
    state.steamLogin = trimmedLogin;
    updatePayButtonState();

    if (loginTimeout) clearTimeout(loginTimeout);
    loginTimeout = window.setTimeout(async () => {
      const amount = (document.getElementById('custom-amount') as HTMLInputElement)?.value;
      if (amount && parseInt(amount) > 0) {
        try {
          const promocodeInput = document.getElementById('promocode-input') as HTMLInputElement;
          if (promocodeInput && promocodeInput.value.trim()) {
            await validatePromocode(promocodeInput.value.trim());
          }
          triggerRecalculate();
        } catch (err) {
          console.error('[BattlePass] Error recalculating on login change:', err);
        }
      }
    }, 500);
  }

  if (loginInput) {
    loginInput.addEventListener('input', function() { handleLoginChange(this.value); });
    loginInput.addEventListener('change', function() { handleLoginChange(this.value); });
    loginInput.addEventListener('blur', function() { handleLoginChange(this.value); });
  }

  // Обработчики для быстрых сумм
  document.querySelectorAll('.amount-btn').forEach((btn) => {
    btn.addEventListener('click', function(this: HTMLElement) {
      const amount = this.dataset.amount || '100';
      const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
      if (amountInput) amountInput.value = amount;
      triggerRecalculate();
    });
  });

  // Обработчик для ввода суммы
  const amountInput = document.getElementById('custom-amount') as HTMLInputElement;
  if (amountInput) {
    const handleAmountChange = () => triggerRecalculate();
    amountInput.addEventListener('input', handleAmountChange);
    amountInput.addEventListener('change', handleAmountChange);
    amountInput.addEventListener('blur', handleAmountChange);
  }

  // Обработчик для промокода
  const promocodeInput = document.getElementById('promocode-input') as HTMLInputElement;
  let promocodeTimeout: number | null = null;

  async function handlePromocodeChange() {
    const code = promocodeInput?.value?.trim().toUpperCase() || '';
    const statusEl = document.getElementById('promocode-status');
    const hintEl = document.getElementById('promocode-hint');

    state.promocode = code;

    if (!code) {
      state.promocodeDiscount = 0;
      state.promocodeValid = false;
      if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'promocode-status';
      }
      if (hintEl) hintEl.textContent = 'Промокод даёт скидку на комиссию сервиса';
      triggerRecalculate();
      return;
    }

    if (statusEl) {
      statusEl.textContent = '...';
      statusEl.className = 'promocode-status checking';
    }

    const result = await validatePromocode(code);

    if (result.valid && result.discount > 0) {
      if (statusEl) {
        statusEl.textContent = '✓';
        statusEl.className = 'promocode-status valid';
      }
      if (hintEl) hintEl.textContent = `Скидка ${result.discount}% на комиссию сервиса`;
    } else {
      if (statusEl) {
        statusEl.textContent = '✗';
        statusEl.className = 'promocode-status invalid';
      }
      if (hintEl) hintEl.textContent = 'Промокод недействителен';
    }

    triggerRecalculate();
  }

  function triggerPromocodeValidation() {
    if (promocodeTimeout) clearTimeout(promocodeTimeout);
    promocodeTimeout = window.setTimeout(handlePromocodeChange, 500);
  }

  if (promocodeInput) {
    promocodeInput.addEventListener('input', triggerPromocodeValidation);
    promocodeInput.addEventListener('change', triggerPromocodeValidation);
    promocodeInput.addEventListener('blur', triggerPromocodeValidation);
  }

  // Валидируем дефолтный промокод HELLO при загрузке
  setTimeout(handlePromocodeChange, 1000);

  // Обработчик для чекбокса
  const agreeCheckbox = document.getElementById('agree-terms');
  if (agreeCheckbox) {
    agreeCheckbox.addEventListener('change', updatePayButtonState);
  }

  // Обработчик для кнопки оплаты
  const payBtn = document.getElementById('pay-btn');
  if (payBtn) {
    payBtn.addEventListener('click', processPayment);
  }

  // Enter на инпуте суммы
  if (amountInput) {
    amountInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const payBtn = document.getElementById('pay-btn') as HTMLButtonElement;
        if (payBtn && !payBtn.disabled) {
          payBtn.click();
        }
      }
    });
  }

  console.log('[BattlePass] UI initialized');
}

// ============================================
// ЗАПУСК
// ============================================

export default async function WebkitMain() {
  console.log('[BattlePass] Starting on:', window.location.href);

  // Ждём body
  while (!document.body) {
    await new Promise((r) => setTimeout(r, 100));
  }

  // Только на страницах Steam
  if (window.location.href.includes('store.steampowered.com') ||
      window.location.href.includes('checkout.steampowered.com') ||
      window.location.href.includes('steamcommunity.com')) {
    init();
    console.log('[BattlePass] UI created');
  }
}
