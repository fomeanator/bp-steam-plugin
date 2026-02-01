// BattlePass Steam Plugin - Webkit Entry
// Пополнение баланса Steam через BattlePass API

const PROXY_URL = 'http://127.0.0.1:8793/proxy/';
const API_BASE = 'profile.battlepass.ru';
const ORG = 'extension';

const API_ENDPOINTS = {
  authSteam: '/api/v2/user/auth/steam',
  bills: `/api/v2/payment/bills/steam?org=${ORG}`,
  commission: `/api/v2/payment/comission?org=${ORG}`,
  createInvoice: `/api/v2/payment/create?org=${ORG}`,
  validatePromocode: `/api/v2/payment/validate?org=${ORG}`,
  convert: `/api/v2/payment/convert?org=${ORG}`,
};

// State
const state = {
  token: null as string | null,
  user: null as any,
  steamLogin: null as string | null,
  steamId64: null as string | null,
  paymentMethods: [] as any[],
  selectedMethod: null as any,
  currentCommission: null as any,
  promocode: 'HELLO',
  promocodeDiscount: 0,
  promocodeValid: false,
  currency: 'RUB',
  steamCurrency: null as string | null,
  convertedAmount: null as number | null,
};

// API Request via CORS proxy
async function apiRequest(endpoint: string, method = 'GET', body: any = null, token: string | null = null) {
  const url = `${PROXY_URL}${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Storage helpers
function storageSet(data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(`bp_${key}`, value);
  }
}

function storageGet(keys: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = localStorage.getItem(`bp_${key}`);
  }
  return result;
}

// Get Steam user info from page
function getSteamUserInfo() {
  // Try g_steamID
  if (typeof (window as any).g_steamID !== 'undefined' && (window as any).g_steamID) {
    state.steamId64 = (window as any).g_steamID;
  }

  // Try data-miniprofile
  const profileLink = document.querySelector('[data-miniprofile]');
  if (profileLink) {
    const miniprofile = profileLink.getAttribute('data-miniprofile');
    if (miniprofile) {
      state.steamId64 = (BigInt('76561197960265728') + BigInt(miniprofile)).toString();
    }
  }

  // Try scripts
  const scripts = document.querySelectorAll('script');
  scripts.forEach((script) => {
    const match = script.textContent?.match(/g_steamID\s*=\s*"(\d{17})"/);
    if (match) {
      state.steamId64 = match[1];
    }
  });

  // Get login
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

  console.log('[BattlePass] Steam info:', { steamId64: state.steamId64, steamLogin: state.steamLogin });
  return { steamId64: state.steamId64, steamLogin: state.steamLogin };
}

// Auth with Steam
async function authWithSteam() {
  if (!state.steamId64) {
    getSteamUserInfo();
  }
  if (!state.steamId64) {
    state.steamId64 = '76561198000000000';
  }

  const data = await apiRequest(API_ENDPOINTS.authSteam, 'POST', {
    steamId64: state.steamId64,
    username: state.steamLogin || '',
  });

  state.token = data.access_token;
  state.user = data.user;
  console.log('[BattlePass] Auth success');
  return data;
}

// Fetch payment methods
async function fetchPaymentMethods() {
  if (!state.token) {
    await authWithSteam();
  }

  state.paymentMethods = await apiRequest(API_ENDPOINTS.bills, 'GET', null, state.token);
  console.log('[BattlePass] Payment methods:', state.paymentMethods);
  return state.paymentMethods;
}

// Calculate commission
async function calculateCommission(amount: number, methodName: string, currency = 'rub', promocode: string | null = null) {
  if (!state.token) {
    await authWithSteam();
  }

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
}

// Validate promocode
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
    } catch {
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
  } catch {
    state.promocodeDiscount = 0;
    state.promocodeValid = false;
    return { valid: false, discount: 0 };
  }
}

// Convert currency
async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string) {
  if (!state.token) {
    await authWithSteam();
  }

  if (fromCurrency === toCurrency) {
    return { amount, rate: 1 };
  }

  const result = await apiRequest(API_ENDPOINTS.convert, 'POST', {
    amount: parseInt(String(amount)),
    account: state.steamLogin || 'test',
    type: 1,
    isIncludeCommission: true,
    billType: 1,
    inputCurrency: fromCurrency.toLowerCase(),
    outputCurrency: toCurrency.toLowerCase(),
  }, state.token);

  state.convertedAmount = result.input || result.amount;
  return result;
}

// Create order
async function createOrder(amount: number, methodName: string, currency: string, promocode: string | null = null) {
  if (!state.token) {
    await authWithSteam();
  }

  if (!state.steamLogin) {
    throw new Error('Не удалось получить Steam логин');
  }

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
    region: { name: 'Россия', value: 'RU' },
    inputValues,
  };

  const invoice = await apiRequest(API_ENDPOINTS.createInvoice, 'POST', requestBody, state.token);
  console.log('[BattlePass] Invoice created:', invoice);
  return invoice;
}

// Styles
const styles = `
:root {
  --bp-bg: #1b2838;
  --bp-bg-dark: #171a21;
  --bp-text: #c7d5e0;
  --bp-text-muted: #8f98a0;
  --bp-blue: #0396ff;
  --bp-green: #5ba32b;
  --bp-red: #ff4444;
  --bp-border: #2a3f5f;
}

.bp-toggle-btn {
  position: fixed;
  top: 50px;
  right: 20px;
  z-index: 999999;
  background: var(--bp-blue);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: Arial, sans-serif;
  box-shadow: 0 4px 15px rgba(3,150,255,0.4);
  transition: all 0.2s;
}
.bp-toggle-btn:hover {
  box-shadow: 0 4px 25px rgba(3,150,255,0.6);
  transform: translateY(-2px);
}

.bp-form {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 380px;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bp-bg);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  font-family: Arial, sans-serif;
  z-index: 999998;
  display: none;
  color: var(--bp-text);
}
.bp-form.visible { display: block; }

.bp-header {
  background: var(--bp-bg-dark);
  padding: 15px 20px;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1;
}
.bp-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}
.bp-close {
  background: none;
  border: none;
  color: var(--bp-text-muted);
  font-size: 20px;
  cursor: pointer;
}
.bp-close:hover { color: #fff; }

.bp-content { padding: 20px; }
.bp-section { margin-bottom: 16px; }
.bp-label {
  display: block;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}
.bp-hint {
  display: block;
  color: var(--bp-text-muted);
  font-size: 12px;
  margin-top: 4px;
}

.bp-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bp-bg-dark);
  border: 1px solid var(--bp-border);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
}
.bp-input:focus {
  outline: none;
  border-color: var(--bp-blue);
}
.bp-input.error {
  border-color: var(--bp-red);
}

.bp-methods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.bp-method-btn {
  background: var(--bp-bg-dark);
  border: 1px solid var(--bp-border);
  border-radius: 8px;
  padding: 12px;
  color: var(--bp-text);
  cursor: pointer;
  font-size: 12px;
  text-align: left;
  transition: all 0.2s;
}
.bp-method-btn:hover {
  border-color: var(--bp-blue);
  color: #fff;
}
.bp-method-btn.active {
  background: var(--bp-blue);
  border-color: var(--bp-blue);
  color: #fff;
}
.bp-method-name { font-weight: 600; }
.bp-method-commission {
  display: block;
  font-size: 11px;
  color: var(--bp-text-muted);
  margin-top: 2px;
}
.bp-method-btn.active .bp-method-commission { color: rgba(255,255,255,0.8); }

.bp-currency-selector {
  display: flex;
  gap: 8px;
}
.bp-currency-btn {
  flex: 1;
  background: var(--bp-bg-dark);
  border: 1px solid var(--bp-border);
  color: var(--bp-text);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.bp-currency-btn:hover {
  border-color: var(--bp-blue);
  color: #fff;
}
.bp-currency-btn.active {
  background: var(--bp-blue);
  border-color: var(--bp-blue);
  color: #fff;
}

.bp-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 8px;
}
.bp-amount-btn {
  background: var(--bp-bg-dark);
  border: 1px solid var(--bp-border);
  border-radius: 6px;
  padding: 8px;
  color: var(--bp-text);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.bp-amount-btn:hover {
  border-color: var(--bp-blue);
  color: #fff;
}

.bp-promocode-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.bp-promocode-wrapper input {
  flex: 1;
  text-transform: uppercase;
}
.bp-promocode-status {
  position: absolute;
  right: 12px;
  font-size: 16px;
  font-weight: bold;
}
.bp-promocode-status.checking { color: var(--bp-text-muted); }
.bp-promocode-status.valid { color: var(--bp-green); }
.bp-promocode-status.invalid { color: var(--bp-red); }

.bp-balance-info {
  background: var(--bp-bg-dark);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}
.bp-info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
}
.bp-info-row.total {
  border-top: 1px solid var(--bp-border);
  margin-top: 6px;
  padding-top: 10px;
  font-weight: 700;
  color: #fff;
}
.bp-discount { color: var(--bp-green); }

.bp-spinner {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--bp-text-muted);
}
.bp-spinner.visible { display: flex; }
.bp-spinner-circle {
  width: 16px;
  height: 16px;
  border: 2px solid var(--bp-border);
  border-top-color: var(--bp-blue);
  border-radius: 50%;
  animation: bp-spin 0.8s linear infinite;
}
@keyframes bp-spin {
  to { transform: rotate(360deg); }
}

.bp-terms {
  margin-bottom: 16px;
  font-size: 12px;
}
.bp-terms label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}
.bp-terms input {
  margin-top: 2px;
}
.bp-terms a {
  color: var(--bp-blue);
  text-decoration: none;
}
.bp-terms a:hover { text-decoration: underline; }

.bp-support {
  text-align: center;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--bp-text-muted);
}
.bp-support a {
  color: var(--bp-blue);
  text-decoration: underline;
}

.bp-pay-btn {
  width: 100%;
  background: var(--bp-blue);
  border: none;
  border-radius: 8px;
  padding: 14px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.bp-pay-btn:hover:not(:disabled) { background: #0aa8ff; }
.bp-pay-btn:disabled {
  background: var(--bp-border);
  cursor: not-allowed;
  color: var(--bp-text-muted);
}

.bp-note {
  text-align: center;
  color: var(--bp-text-muted);
  font-size: 11px;
  margin-top: 12px;
}

.bp-error {
  color: var(--bp-red);
  font-size: 12px;
  margin-top: 4px;
  display: none;
}
.bp-error.visible { display: block; }

.bp-loading {
  text-align: center;
  padding: 20px;
  color: var(--bp-text-muted);
}

.bp-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999999;
  padding: 14px 24px;
  border-radius: 8px;
  box-shadow: 0 12px 16px rgba(0,0,0,0.24);
  font-size: 14px;
  font-weight: 600;
  animation: bp-slide-down 0.3s ease-out;
}
.bp-notification.info { background: var(--bp-blue); color: #fff; }
.bp-notification.error { background: var(--bp-red); color: #fff; }
@keyframes bp-slide-down {
  from { opacity: 0; transform: translate(-50%, -20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
`;

function createFormHTML(): string {
  return `
    <div id="bp-form" class="bp-form">
      <div class="bp-header">
        <h3>Пополнение баланса Steam</h3>
        <button class="bp-close" id="bp-close">×</button>
      </div>
      <div class="bp-content">
        <div class="bp-section">
          <label class="bp-label">Ваш Steam логин:</label>
          <input type="text" class="bp-input" id="bp-login" placeholder="Введите логин Steam">
          <small class="bp-hint">Логин от аккаунта Steam (не email)</small>
        </div>

        <div class="bp-section">
          <label class="bp-label">Способ оплаты:</label>
          <div class="bp-methods-grid" id="bp-methods">
            <div class="bp-loading">Загрузка...</div>
          </div>
        </div>

        <div class="bp-section">
          <label class="bp-label">Валюта Steam:</label>
          <div class="bp-currency-selector" id="bp-currency">
            <button class="bp-currency-btn active" data-currency="RUB">RUB ₽</button>
            <button class="bp-currency-btn" data-currency="KZT">KZT ₸</button>
          </div>
        </div>

        <div class="bp-section">
          <label class="bp-label">Сумма (<span id="bp-currency-label">RUB</span>):</label>
          <input type="number" class="bp-input" id="bp-amount" placeholder="От 50" min="50" value="100">
          <div class="bp-error" id="bp-amount-error"></div>
          <small class="bp-hint" id="bp-amount-hint">Минимум: 50 RUB. Максимум: 15 000 RUB</small>
          <div class="bp-amounts">
            <button class="bp-amount-btn" data-amount="500">500</button>
            <button class="bp-amount-btn" data-amount="1000">1000</button>
            <button class="bp-amount-btn" data-amount="5000">5000</button>
          </div>
        </div>

        <div class="bp-section">
          <label class="bp-label">Промокод:</label>
          <div class="bp-promocode-wrapper">
            <input type="text" class="bp-input" id="bp-promocode" placeholder="Введите промокод" value="HELLO">
            <span class="bp-promocode-status" id="bp-promocode-status"></span>
          </div>
          <small class="bp-hint" id="bp-promocode-hint">Промокод даёт скидку на комиссию сервиса</small>
        </div>

        <div class="bp-balance-info" id="bp-balance-info">
          <div class="bp-spinner" id="bp-spinner">
            <div class="bp-spinner-circle"></div>
            <span>Расчёт...</span>
          </div>
          <div id="bp-balance-content">
            <div class="bp-info-row" id="bp-convert-row" style="display: none;">
              <span>Конвертация:</span>
              <span id="bp-convert-info">-</span>
            </div>
            <div class="bp-info-row">
              <span>Стоимость товара</span>
              <span id="bp-price">0 ₽</span>
            </div>
            <div class="bp-info-row" id="bp-discount-row" style="display: none;">
              <span>Скидка</span>
              <span id="bp-discount" class="bp-discount">- 0 ₽</span>
            </div>
            <div class="bp-info-row total">
              <span>Итого</span>
              <span id="bp-total">0 ₽</span>
            </div>
          </div>
        </div>

        <div class="bp-terms">
          <label>
            <input type="checkbox" id="bp-agree">
            <span>Я ознакомлен с <a href="https://battlepass.ru/info/agreement" target="_blank">Соглашением</a> и <a href="https://battlepass.ru/info/privacypolicy" target="_blank">Политикой конфиденциальности</a></span>
          </label>
        </div>

        <div class="bp-support">
          <small>Возникли вопросы? <a href="https://t.me/BattlePassSupportBot" target="_blank">Написать в поддержку</a></small>
        </div>

        <button class="bp-pay-btn" id="bp-pay" disabled>Оплатить</button>

        <div class="bp-note">🔒 Платежи обрабатываются через защищенное соединение BattlePass</div>
      </div>
    </div>
  `;
}

function showNotification(message: string, type: 'info' | 'error' = 'info') {
  const existing = document.getElementById('bp-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.id = 'bp-notification';
  notification.className = `bp-notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'bp-slide-down 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function setLoading(isLoading: boolean) {
  const spinner = document.getElementById('bp-spinner');
  const content = document.getElementById('bp-balance-content');
  if (spinner) spinner.classList.toggle('visible', isLoading);
  if (content) content.style.opacity = isLoading ? '0.3' : '1';
}

function updatePayButtonState() {
  const payBtn = document.getElementById('bp-pay') as HTMLButtonElement;
  const amount = parseInt((document.getElementById('bp-amount') as HTMLInputElement).value) || 0;
  const agreeChecked = (document.getElementById('bp-agree') as HTMLInputElement).checked;
  const steamLogin = (document.getElementById('bp-login') as HTMLInputElement).value.trim();
  const minAmount = state.selectedMethod?.min || 50;

  payBtn.disabled = !(amount >= minAmount && agreeChecked && steamLogin);
}

function validateAmount(amount: number): boolean {
  const amountInput = document.getElementById('bp-amount') as HTMLInputElement;
  const amountError = document.getElementById('bp-amount-error') as HTMLElement;
  const minAmount = state.selectedMethod?.min || 50;
  const maxAmount = state.currency === 'KZT' ? 75000 : 15000;

  if (!amount || amount === 0) {
    amountInput.classList.remove('error');
    amountError.classList.remove('visible');
    return false;
  }

  if (amount < minAmount) {
    amountInput.classList.add('error');
    amountError.textContent = `Минимальная сумма: ${minAmount} ${state.currency}`;
    amountError.classList.add('visible');
    return false;
  }

  if (amount > maxAmount) {
    amountInput.classList.add('error');
    amountError.textContent = `Максимальная сумма: ${maxAmount} ${state.currency}`;
    amountError.classList.add('visible');
    return false;
  }

  amountInput.classList.remove('error');
  amountError.classList.remove('visible');
  return true;
}

let recalculateTimeout: ReturnType<typeof setTimeout> | null = null;

async function recalculatePayment() {
  const amount = parseInt((document.getElementById('bp-amount') as HTMLInputElement).value) || 0;
  const methodName = state.selectedMethod?.name;

  if (!methodName || !state.selectedMethod) return;

  const minAmount = state.selectedMethod.min || 50;
  if (amount < minAmount) {
    (document.getElementById('bp-price') as HTMLElement).textContent = '0 ₽';
    (document.getElementById('bp-discount-row') as HTMLElement).style.display = 'none';
    (document.getElementById('bp-total') as HTMLElement).textContent = '0 ₽';
    (document.getElementById('bp-convert-row') as HTMLElement).style.display = 'none';
    updatePayButtonState();
    return;
  }

  setLoading(true);

  try {
    let amountForCommission = amount;
    const convertRow = document.getElementById('bp-convert-row') as HTMLElement;
    const convertInfo = document.getElementById('bp-convert-info') as HTMLElement;

    if (state.currency === 'KZT') {
      convertRow.style.display = 'flex';
      convertInfo.textContent = 'Расчёт...';

      try {
        const convertResult = await convertCurrency(amount, 'KZT', 'RUB');
        const convertedAmount = convertResult.input || convertResult.amount || amount;
        amountForCommission = Math.round(convertedAmount);
        convertInfo.textContent = `${amount} KZT = ${amountForCommission} RUB`;
        state.convertedAmount = amountForCommission;
      } catch {
        convertInfo.textContent = 'Ошибка конвертации';
        setLoading(false);
        return;
      }
    } else {
      convertRow.style.display = 'none';
      state.convertedAmount = null;
    }

    const commissionResponse = await calculateCommission(
      amountForCommission,
      methodName,
      'rub',
      state.promocode
    );

    const walletAmountInRouble = commissionResponse.amountInRouble || amountForCommission;
    const bankCommission = commissionResponse.bankComission || 0;
    const baseSteamRate = commissionResponse.steamRate || 12;
    const actualSteamRate = Math.max(0, baseSteamRate - (state.promocodeDiscount || 0));
    const serviceCommission = Math.round(walletAmountInRouble * (actualSteamRate / 100));
    const finalPrice = Math.round(walletAmountInRouble + bankCommission + serviceCommission);
    const baseServiceCommission = Math.round(walletAmountInRouble * (baseSteamRate / 100));
    const priceWithoutDiscount = Math.round(walletAmountInRouble + bankCommission + baseServiceCommission);
    const discountAmount = priceWithoutDiscount - finalPrice;

    (document.getElementById('bp-price') as HTMLElement).textContent = `${priceWithoutDiscount} ₽`;

    const discountRow = document.getElementById('bp-discount-row') as HTMLElement;
    const discountEl = document.getElementById('bp-discount') as HTMLElement;
    if (discountAmount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `- ${discountAmount} ₽`;
    } else {
      discountRow.style.display = 'none';
    }

    (document.getElementById('bp-total') as HTMLElement).textContent = `${finalPrice} ₽`;

    state.currentCommission = {
      ...commissionResponse,
      finalPrice,
      serviceCommission,
      bankCommission,
      priceWithoutDiscount,
      discountAmount,
    };

  } catch (error) {
    console.error('[BattlePass] Recalculate error:', error);
    (document.getElementById('bp-price') as HTMLElement).textContent = '0 ₽';
    (document.getElementById('bp-discount-row') as HTMLElement).style.display = 'none';
    (document.getElementById('bp-total') as HTMLElement).textContent = '0 ₽';
  } finally {
    setLoading(false);
    updatePayButtonState();
  }
}

function triggerRecalculate() {
  if (recalculateTimeout) clearTimeout(recalculateTimeout);
  recalculateTimeout = setTimeout(recalculatePayment, 300);
}

function renderPaymentMethods(methods: any[]) {
  const grid = document.getElementById('bp-methods');
  if (!grid) return;

  if (!methods || methods.length === 0) {
    grid.innerHTML = '<div class="bp-loading">Способы оплаты недоступны</div>';
    return;
  }

  grid.innerHTML = methods.map((method, index) => `
    <button class="bp-method-btn ${index === 0 ? 'active' : ''}" data-method="${method.name}" data-min="${method.min}">
      <span class="bp-method-name">${method.display_name.replace(/От \d+\.?\d* рублей?/, '')}</span>
      <span class="bp-method-commission">${method.commission}%</span>
    </button>
  `).join('');

  if (methods.length > 0) {
    state.selectedMethod = methods[0];
  }

  grid.querySelectorAll('.bp-method-btn').forEach((btn) => {
    btn.addEventListener('click', function(this: HTMLElement) {
      grid.querySelectorAll('.bp-method-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const methodName = this.dataset.method;
      state.selectedMethod = methods.find(m => m.name === methodName);
      triggerRecalculate();
    });
  });

  const amount = (document.getElementById('bp-amount') as HTMLInputElement)?.value;
  if (amount && parseInt(amount) > 0) {
    triggerRecalculate();
  }
}

async function processPayment() {
  const amount = parseInt((document.getElementById('bp-amount') as HTMLInputElement).value);
  const steamLogin = (document.getElementById('bp-login') as HTMLInputElement).value.trim();

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

  const payBtn = document.getElementById('bp-pay') as HTMLButtonElement;
  payBtn.disabled = true;
  payBtn.textContent = 'Создание заказа...';

  try {
    showNotification('Создание заказа...', 'info');

    const promocodeToSend = state.promocodeValid ? state.promocode : null;
    const invoice = await createOrder(amount, state.selectedMethod.name, state.currency, promocodeToSend);

    if (invoice.paymentUrl) {
      showNotification('Переход на страницу оплаты...', 'info');
      window.open(invoice.paymentUrl, '_blank');
    } else {
      throw new Error('Не получена ссылка на оплату');
    }
  } catch (error: any) {
    showNotification(error.message || 'Ошибка при создании заказа', 'error');
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = 'Оплатить';
    updatePayButtonState();
  }
}

async function handlePromocodeChange() {
  const promocodeInput = document.getElementById('bp-promocode') as HTMLInputElement;
  const statusEl = document.getElementById('bp-promocode-status') as HTMLElement;
  const hintEl = document.getElementById('bp-promocode-hint') as HTMLElement;
  const code = promocodeInput.value.trim().toUpperCase();

  state.promocode = code;

  if (!code) {
    state.promocodeDiscount = 0;
    state.promocodeValid = false;
    statusEl.textContent = '';
    statusEl.className = 'bp-promocode-status';
    hintEl.textContent = 'Промокод даёт скидку на комиссию сервиса';
    triggerRecalculate();
    return;
  }

  statusEl.textContent = '...';
  statusEl.className = 'bp-promocode-status checking';

  const result = await validatePromocode(code);

  if (result.valid && result.discount > 0) {
    statusEl.textContent = '✓';
    statusEl.className = 'bp-promocode-status valid';
    hintEl.textContent = `Скидка ${result.discount}% на комиссию сервиса`;
  } else {
    statusEl.textContent = '✗';
    statusEl.className = 'bp-promocode-status invalid';
    hintEl.textContent = 'Промокод недействителен';
  }

  triggerRecalculate();
}

function createUI() {
  // Add styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Add toggle button
  const btn = document.createElement('button');
  btn.className = 'bp-toggle-btn';
  btn.textContent = 'Пополнить Steam';
  document.body.appendChild(btn);

  // Add form
  const formContainer = document.createElement('div');
  formContainer.innerHTML = createFormHTML();
  document.body.appendChild(formContainer.firstElementChild!);

  const form = document.getElementById('bp-form')!;

  // Toggle form
  btn.onclick = async () => {
    const isVisible = form.classList.contains('visible');
    form.classList.toggle('visible');

    if (!isVisible && state.paymentMethods.length === 0) {
      try {
        const methods = await fetchPaymentMethods();
        renderPaymentMethods(methods);
      } catch {
        showNotification('Ошибка загрузки способов оплаты', 'error');
      }
    }
  };

  // Close button
  document.getElementById('bp-close')!.addEventListener('click', () => {
    form.classList.remove('visible');
  });

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (form.classList.contains('visible') && !form.contains(e.target as Node) && !btn.contains(e.target as Node)) {
      form.classList.remove('visible');
    }
  });

  // Login input
  const loginInput = document.getElementById('bp-login') as HTMLInputElement;
  const saved = storageGet(['steam_login']);
  if (saved.steam_login) {
    loginInput.value = saved.steam_login;
    state.steamLogin = saved.steam_login;
  } else if (state.steamLogin) {
    loginInput.value = state.steamLogin;
  }

  loginInput.addEventListener('input', function() {
    state.steamLogin = this.value.trim();
    storageSet({ steam_login: state.steamLogin });
    updatePayButtonState();
  });

  // Amount input
  const amountInput = document.getElementById('bp-amount') as HTMLInputElement;
  amountInput.addEventListener('input', function() {
    validateAmount(parseInt(this.value) || 0);
    triggerRecalculate();
  });

  // Quick amounts
  document.querySelectorAll('.bp-amount-btn').forEach(btn => {
    btn.addEventListener('click', function(this: HTMLElement) {
      amountInput.value = this.dataset.amount || '500';
      validateAmount(parseInt(amountInput.value));
      triggerRecalculate();
    });
  });

  // Currency selector
  document.querySelectorAll('.bp-currency-btn').forEach(btn => {
    btn.addEventListener('click', async function(this: HTMLElement) {
      const newCurrency = this.dataset.currency!;
      if (newCurrency === state.currency) return;

      document.querySelectorAll('.bp-currency-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      state.currency = newCurrency;
      (document.getElementById('bp-currency-label') as HTMLElement).textContent = newCurrency;

      const minAmount = newCurrency === 'KZT' ? 250 : 50;
      const maxAmount = newCurrency === 'KZT' ? 75000 : 15000;
      (document.getElementById('bp-amount-hint') as HTMLElement).textContent =
        `Минимум: ${minAmount.toLocaleString()} ${newCurrency}. Максимум: ${maxAmount.toLocaleString()} ${newCurrency}`;

      triggerRecalculate();
    });
  });

  // Promocode
  let promocodeTimeout: ReturnType<typeof setTimeout> | null = null;
  const promocodeInput = document.getElementById('bp-promocode') as HTMLInputElement;
  promocodeInput.addEventListener('input', function() {
    if (promocodeTimeout) clearTimeout(promocodeTimeout);
    promocodeTimeout = setTimeout(handlePromocodeChange, 500);
  });

  // Validate default promocode
  setTimeout(handlePromocodeChange, 1000);

  // Terms checkbox
  document.getElementById('bp-agree')!.addEventListener('change', updatePayButtonState);

  // Pay button
  document.getElementById('bp-pay')!.addEventListener('click', processPayment);
}

export default async function WebkitMain() {
  console.log('[BattlePass] Starting...');

  // Wait for body
  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  // Check if on Steam pages
  if (window.location.href.includes('store.steampowered.com') ||
      window.location.href.includes('steamcommunity.com')) {

    // Get Steam user info
    getSteamUserInfo();

    // Create UI
    createUI();
    console.log('[BattlePass] UI ready');
  }
}
