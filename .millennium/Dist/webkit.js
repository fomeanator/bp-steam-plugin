const MILLENNIUM_IS_CLIENT_MODULE = false;
const pluginName = "battlepass-test";
function InitializePlugins() {
    var _a, _b;
    /**
     * This function is called n times depending on n plugin count,
     * Create the plugin list if it wasn't already created
     */
    (_a = (window.PLUGIN_LIST || (window.PLUGIN_LIST = {})))[pluginName] || (_a[pluginName] = {});
    (_b = (window.MILLENNIUM_PLUGIN_SETTINGS_STORE || (window.MILLENNIUM_PLUGIN_SETTINGS_STORE = {})))[pluginName] || (_b[pluginName] = {});
    window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS || (window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS = {});
    /**
     * Accepted IPC message types from Millennium backend.
     */
    let IPCType;
    (function (IPCType) {
        IPCType[IPCType["CallServerMethod"] = 0] = "CallServerMethod";
    })(IPCType || (IPCType = {}));
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    let IPCMessageId = `Millennium.Internal.IPC.[${pluginName}]`;
    let isClientModule = MILLENNIUM_IS_CLIENT_MODULE;
    const ComponentTypeMap = {
        DropDown: ['string', 'number', 'boolean'],
        NumberTextInput: ['number'],
        StringTextInput: ['string'],
        FloatTextInput: ['number'],
        CheckBox: ['boolean'],
        NumberSlider: ['number'],
        FloatSlider: ['number'],
    };
    MillenniumStore.ignoreProxyFlag = false;
    function DelegateToBackend(pluginName, name, value) {
        return MILLENNIUM_BACKEND_IPC.postMessage(IPCType.CallServerMethod, {
            pluginName,
            methodName: '__builtins__.__update_settings_value__',
            argumentList: { name, value },
        });
    }
    async function ClientInitializeIPC() {
        /** Wait for the MainWindowBrowser to not be undefined */
        while (typeof MainWindowBrowserManager === 'undefined') {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        MainWindowBrowserManager?.m_browser?.on('message', (messageId, data) => {
            if (messageId !== IPCMessageId) {
                return;
            }
            const { name, value } = JSON.parse(data);
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[name] = value;
            DelegateToBackend(pluginName, name, value);
            MillenniumStore.ignoreProxyFlag = false;
        });
    }
    if (isClientModule) {
        ClientInitializeIPC();
    }
    const StartSettingPropagation = (name, value) => {
        if (MillenniumStore.ignoreProxyFlag) {
            return;
        }
        if (isClientModule) {
            DelegateToBackend(pluginName, name, value);
            /** If the browser doesn't exist yet, no use sending anything to it. */
            if (typeof MainWindowBrowserManager !== 'undefined') {
                MainWindowBrowserManager?.m_browser?.PostMessage(IPCMessageId, JSON.stringify({ name, value }));
            }
        }
        else {
            /** Send the message to the SharedJSContext */
            SteamClient.BrowserView.PostMessageToParent(IPCMessageId, JSON.stringify({ name, value }));
        }
    };
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    const DefinePluginSetting = (obj) => {
        return new Proxy(obj, {
            set(target, property, value) {
                if (!(property in target)) {
                    throw new TypeError(`Property ${String(property)} does not exist on plugin settings`);
                }
                const settingType = ComponentTypeMap[target[property].type];
                const range = target[property]?.range;
                /** Clamp the value between the given range */
                if (settingType.includes('number') && typeof value === 'number') {
                    if (range) {
                        value = clamp(value, range[0], range[1]);
                    }
                    value || (value = 0); // Fallback to 0 if the value is undefined or null
                }
                /** Check if the value is of the proper type */
                if (!settingType.includes(typeof value)) {
                    throw new TypeError(`Expected ${settingType.join(' or ')}, got ${typeof value}`);
                }
                target[property].value = value;
                StartSettingPropagation(String(property), value);
                return true;
            },
            get(target, property) {
                if (property === '__raw_get_internals__') {
                    return target;
                }
                if (property in target) {
                    return target[property].value;
                }
                return undefined;
            },
        });
    };
    MillenniumStore.DefinePluginSetting = DefinePluginSetting;
    MillenniumStore.settingsStore = DefinePluginSetting({});
}
InitializePlugins()
const __call_server_method__ = (methodName, kwargs) => Millennium.callServerMethod(pluginName, methodName, kwargs)
function __wrapped_callable__(route) {
    if (route.startsWith('webkit:')) {
        return MILLENNIUM_API.callable((methodName, kwargs) => MILLENNIUM_API.__INTERNAL_CALL_WEBKIT_METHOD__(pluginName, methodName, kwargs), route.replace(/^webkit:/, ''));
    }
    return MILLENNIUM_API.callable(__call_server_method__, route);
}
let PluginEntryPointMain = function() { var millennium_main = (function (exports) {
  'use strict';

  // BattlePass Steam Plugin - Webkit Entry
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
      convertedAmount: null,
  };
  async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
      const url = `${PROXY_URL}${API_BASE}${endpoint}`;
      const headers = { 'Content-Type': 'application/json' };
      if (token)
          headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : null,
      });
      if (!response.ok)
          throw new Error(`API Error: ${response.status}`);
      return response.json();
  }
  function storageSet(data) {
      for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(`bp_${key}`, value);
      }
  }
  function storageGet(keys) {
      const result = {};
      for (const key of keys)
          result[key] = localStorage.getItem(`bp_${key}`);
      return result;
  }
  function getSteamUserInfo() {
      if (typeof window.g_steamID !== 'undefined') {
          state.steamId64 = window.g_steamID;
      }
      const profileLink = document.querySelector('[data-miniprofile]');
      if (profileLink) {
          const miniprofile = profileLink.getAttribute('data-miniprofile');
          if (miniprofile) {
              state.steamId64 = (BigInt('76561197960265728') + BigInt(miniprofile)).toString();
          }
      }
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script) => {
          const match = script.textContent?.match(/g_steamID\s*=\s*"(\d{17})"/);
          if (match)
              state.steamId64 = match[1];
      });
      const accountNameSpan = document.querySelector('.account_name');
      if (accountNameSpan) {
          state.steamLogin = accountNameSpan.textContent?.trim() || null;
      }
      if (!state.steamLogin) {
          const accountLink = document.querySelector('a[href*="/account/"]');
          if (accountLink) {
              const match = accountLink.textContent?.trim()?.match(/:\s*(.+)$/);
              if (match)
                  state.steamLogin = match[1].trim();
          }
      }
      return { steamId64: state.steamId64, steamLogin: state.steamLogin };
  }
  async function authWithSteam() {
      if (!state.steamId64)
          getSteamUserInfo();
      if (!state.steamId64)
          state.steamId64 = '76561198000000000';
      const data = await apiRequest(API_ENDPOINTS.authSteam, 'POST', {
          steamId64: state.steamId64,
          username: state.steamLogin || '',
      });
      state.token = data.access_token;
      state.user = data.user;
      return data;
  }
  async function fetchPaymentMethods() {
      if (!state.token)
          await authWithSteam();
      state.paymentMethods = await apiRequest(API_ENDPOINTS.bills, 'GET', null, state.token);
      return state.paymentMethods;
  }
  async function calculateCommission(amount, methodName, currency = 'rub', promocode = null) {
      if (!state.token)
          await authWithSteam();
      state.currentCommission = await apiRequest(API_ENDPOINTS.commission, 'POST', {
          amount: parseInt(String(amount)),
          account: state.steamLogin || '',
          currency: currency.toLowerCase(),
          type: 0,
          isIncludeCommission: false,
          billType: 0,
          tag: methodName,
          promocode: promocode || '',
      }, state.token);
      return state.currentCommission;
  }
  async function validatePromocode(code) {
      if (!code?.trim()) {
          state.promocodeDiscount = 0;
          state.promocodeValid = false;
          state.promocode = '';
          return { valid: false, discount: 0 };
      }
      const upperCode = code.toUpperCase();
      if (!state.token) {
          try {
              await authWithSteam();
          }
          catch {
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
      }
      catch {
          state.promocodeDiscount = 0;
          state.promocodeValid = false;
          return { valid: false, discount: 0 };
      }
  }
  async function convertCurrency(amount, fromCurrency, toCurrency) {
      if (!state.token)
          await authWithSteam();
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
  async function createOrder(amount, methodName, currency, promocode = null) {
      if (!state.token)
          await authWithSteam();
      if (!state.steamLogin)
          throw new Error('Steam login required');
      const inputValues = [
          { name: 'account', value: state.steamLogin },
          { name: 'amount', value: String(amount) },
      ];
      if (promocode?.trim()) {
          inputValues.push({ name: 'promocode', value: promocode.trim().toUpperCase() });
      }
      inputValues.push({ name: 'currency', value: currency.toLowerCase() });
      const invoice = await apiRequest(API_ENDPOINTS.createInvoice, 'POST', {
          productId: '1',
          tag: methodName,
          service: 'steam',
          productType: 'DIRECT_PAYMENT',
          region: { name: 'Russia', value: 'RU' },
          inputValues,
      }, state.token);
      return invoice;
  }
  const styles = `
.bp-btn{position:fixed;top:50px;right:20px;z-index:999999;background:#0396ff;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;font-family:Arial,sans-serif;box-shadow:0 4px 15px rgba(3,150,255,0.4)}
.bp-btn:hover{box-shadow:0 4px 25px rgba(3,150,255,0.6);transform:translateY(-2px)}
.bp-form{position:fixed;top:100px;right:20px;width:360px;max-height:80vh;overflow-y:auto;background:#1b2838;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;z-index:999998;display:none;color:#c7d5e0}
.bp-form.visible{display:block}
.bp-header{background:#171a21;padding:15px 20px;border-radius:12px 12px 0 0;display:flex;justify-content:space-between;align-items:center}
.bp-header h3{margin:0;color:#fff;font-size:16px}
.bp-close{background:none;border:none;color:#8f98a0;font-size:20px;cursor:pointer}
.bp-close:hover{color:#fff}
.bp-content{padding:20px}
.bp-section{margin-bottom:16px}
.bp-label{display:block;color:#fff;font-size:14px;font-weight:600;margin-bottom:8px}
.bp-hint{display:block;color:#8f98a0;font-size:12px;margin-top:4px}
.bp-input{width:100%;padding:10px 12px;background:#171a21;border:1px solid #2a3f5f;border-radius:6px;color:#fff;font-size:14px;box-sizing:border-box}
.bp-input:focus{outline:none;border-color:#0396ff}
.bp-methods{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.bp-method{background:#171a21;border:1px solid #2a3f5f;border-radius:8px;padding:12px;color:#c7d5e0;cursor:pointer;font-size:12px;text-align:left}
.bp-method:hover{border-color:#0396ff;color:#fff}
.bp-method.active{background:#0396ff;border-color:#0396ff;color:#fff}
.bp-method-name{font-weight:600}
.bp-method-comm{display:block;font-size:11px;color:#8f98a0;margin-top:2px}
.bp-method.active .bp-method-comm{color:rgba(255,255,255,0.8)}
.bp-curr{display:flex;gap:8px}
.bp-curr-btn{flex:1;background:#171a21;border:1px solid #2a3f5f;color:#c7d5e0;padding:10px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600}
.bp-curr-btn:hover{border-color:#0396ff;color:#fff}
.bp-curr-btn.active{background:#0396ff;border-color:#0396ff;color:#fff}
.bp-amounts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.bp-amt{background:#171a21;border:1px solid #2a3f5f;border-radius:6px;padding:8px;color:#c7d5e0;cursor:pointer;font-size:13px}
.bp-amt:hover{border-color:#0396ff;color:#fff}
.bp-promo-wrap{position:relative;display:flex;align-items:center}
.bp-promo-wrap input{flex:1;text-transform:uppercase}
.bp-promo-status{position:absolute;right:12px;font-size:16px;font-weight:bold}
.bp-promo-status.valid{color:#5ba32b}
.bp-promo-status.invalid{color:#ff4444}
.bp-info{background:#171a21;border-radius:8px;padding:12px;margin-bottom:16px}
.bp-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
.bp-row.total{border-top:1px solid #2a3f5f;margin-top:6px;padding-top:10px;font-weight:700;color:#fff}
.bp-discount{color:#5ba32b}
.bp-terms{margin-bottom:16px;font-size:12px}
.bp-terms label{display:flex;align-items:flex-start;gap:8px;cursor:pointer}
.bp-terms a{color:#0396ff}
.bp-support{text-align:center;margin-bottom:12px;font-size:12px;color:#8f98a0}
.bp-support a{color:#0396ff}
.bp-pay{width:100%;background:#0396ff;border:none;border-radius:8px;padding:14px;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
.bp-pay:hover:not(:disabled){background:#0aa8ff}
.bp-pay:disabled{background:#2a3f5f;cursor:not-allowed;color:#8f98a0}
.bp-note{text-align:center;color:#8f98a0;font-size:11px;margin-top:12px}
.bp-loading{text-align:center;padding:20px;color:#8f98a0}
.bp-notif{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999999;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:600}
.bp-notif.info{background:#0396ff;color:#fff}
.bp-notif.error{background:#ff4444;color:#fff}
`;
  function createFormHTML() {
      return `
    <div id="bp-form" class="bp-form">
      <div class="bp-header">
        <h3>Steam Balance Top-Up</h3>
        <button class="bp-close" id="bp-close">×</button>
      </div>
      <div class="bp-content">
        <div class="bp-section">
          <label class="bp-label">Steam Login:</label>
          <input type="text" class="bp-input" id="bp-login" placeholder="Your Steam login">
          <small class="bp-hint">Your Steam account login (not email)</small>
        </div>
        <div class="bp-section">
          <label class="bp-label">Payment Method:</label>
          <div class="bp-methods" id="bp-methods"><div class="bp-loading">Loading...</div></div>
        </div>
        <div class="bp-section">
          <label class="bp-label">Currency:</label>
          <div class="bp-curr" id="bp-curr">
            <button class="bp-curr-btn active" data-currency="RUB">RUB</button>
            <button class="bp-curr-btn" data-currency="KZT">KZT</button>
          </div>
        </div>
        <div class="bp-section">
          <label class="bp-label">Amount (<span id="bp-curr-label">RUB</span>):</label>
          <input type="number" class="bp-input" id="bp-amount" placeholder="From 50" min="50" value="100">
          <small class="bp-hint" id="bp-amount-hint">Min: 50, Max: 15000</small>
          <div class="bp-amounts">
            <button class="bp-amt" data-amount="500">500</button>
            <button class="bp-amt" data-amount="1000">1000</button>
            <button class="bp-amt" data-amount="5000">5000</button>
          </div>
        </div>
        <div class="bp-section">
          <label class="bp-label">Promocode:</label>
          <div class="bp-promo-wrap">
            <input type="text" class="bp-input" id="bp-promo" placeholder="Enter promocode" value="HELLO">
            <span class="bp-promo-status" id="bp-promo-status"></span>
          </div>
          <small class="bp-hint" id="bp-promo-hint">Promocode gives discount on service fee</small>
        </div>
        <div class="bp-info">
          <div class="bp-row" id="bp-convert-row" style="display:none"><span>Convert:</span><span id="bp-convert">-</span></div>
          <div class="bp-row"><span>Price</span><span id="bp-price">0</span></div>
          <div class="bp-row" id="bp-discount-row" style="display:none"><span>Discount</span><span id="bp-discount" class="bp-discount">-0</span></div>
          <div class="bp-row total"><span>Total</span><span id="bp-total">0</span></div>
        </div>
        <div class="bp-terms">
          <label><input type="checkbox" id="bp-agree"><span>I agree to <a href="https://battlepass.ru/info/agreement" target="_blank">Terms</a></span></label>
        </div>
        <div class="bp-support"><a href="https://t.me/BattlePassSupportBot" target="_blank">Support</a></div>
        <button class="bp-pay" id="bp-pay" disabled>Pay</button>
        <div class="bp-note">Payments processed by BattlePass</div>
      </div>
    </div>
  `;
  }
  function showNotification(message, type = 'info') {
      const existing = document.getElementById('bp-notif');
      if (existing)
          existing.remove();
      const n = document.createElement('div');
      n.id = 'bp-notif';
      n.className = `bp-notif ${type}`;
      n.textContent = message;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3000);
  }
  function updatePayButtonState() {
      const payBtn = document.getElementById('bp-pay');
      const amount = parseInt(document.getElementById('bp-amount').value) || 0;
      const agreeChecked = document.getElementById('bp-agree').checked;
      const steamLogin = document.getElementById('bp-login').value.trim();
      const minAmount = state.selectedMethod?.min || 50;
      payBtn.disabled = !(amount >= minAmount && agreeChecked && steamLogin);
  }
  let recalcTimeout = null;
  async function recalculate() {
      const amount = parseInt(document.getElementById('bp-amount').value) || 0;
      if (!state.selectedMethod || amount < (state.selectedMethod.min || 50)) {
          document.getElementById('bp-price').textContent = '0';
          document.getElementById('bp-discount-row').style.display = 'none';
          document.getElementById('bp-total').textContent = '0';
          document.getElementById('bp-convert-row').style.display = 'none';
          updatePayButtonState();
          return;
      }
      try {
          let amountForComm = amount;
          const convertRow = document.getElementById('bp-convert-row');
          const convertInfo = document.getElementById('bp-convert');
          if (state.currency === 'KZT') {
              convertRow.style.display = 'flex';
              try {
                  const r = await convertCurrency(amount, 'KZT', 'RUB');
                  amountForComm = Math.round(r.input || r.amount || amount);
                  convertInfo.textContent = `${amount} KZT = ${amountForComm} RUB`;
              }
              catch {
                  convertInfo.textContent = 'Error';
                  return;
              }
          }
          else {
              convertRow.style.display = 'none';
          }
          const comm = await calculateCommission(amountForComm, state.selectedMethod.name, 'rub', state.promocode);
          const wallet = comm.amountInRouble || amountForComm;
          const bank = comm.bankComission || 0;
          const baseRate = comm.steamRate || 12;
          const actualRate = Math.max(0, baseRate - (state.promocodeDiscount || 0));
          const serviceFee = Math.round(wallet * (actualRate / 100));
          const finalPrice = Math.round(wallet + bank + serviceFee);
          const baseFee = Math.round(wallet * (baseRate / 100));
          const priceNoDiscount = Math.round(wallet + bank + baseFee);
          const discountAmt = priceNoDiscount - finalPrice;
          document.getElementById('bp-price').textContent = `${priceNoDiscount} RUB`;
          const discountRow = document.getElementById('bp-discount-row');
          if (discountAmt > 0) {
              discountRow.style.display = 'flex';
              document.getElementById('bp-discount').textContent = `-${discountAmt} RUB`;
          }
          else {
              discountRow.style.display = 'none';
          }
          document.getElementById('bp-total').textContent = `${finalPrice} RUB`;
      }
      catch (e) {
          console.error('[BP] Calc error:', e);
      }
      finally {
          updatePayButtonState();
      }
  }
  function triggerRecalc() {
      if (recalcTimeout)
          clearTimeout(recalcTimeout);
      recalcTimeout = setTimeout(recalculate, 300);
  }
  function renderMethods(methods) {
      const grid = document.getElementById('bp-methods');
      if (!grid)
          return;
      if (!methods?.length) {
          grid.innerHTML = '<div class="bp-loading">No methods</div>';
          return;
      }
      grid.innerHTML = methods.map((m, i) => `
    <button class="bp-method ${i === 0 ? 'active' : ''}" data-method="${m.name}" data-min="${m.min}">
      <span class="bp-method-name">${m.display_name.replace(/От \d+\.?\d* рублей?/, '')}</span>
      <span class="bp-method-comm">${m.commission}%</span>
    </button>
  `).join('');
      state.selectedMethod = methods[0];
      grid.querySelectorAll('.bp-method').forEach(btn => {
          btn.addEventListener('click', function () {
              grid.querySelectorAll('.bp-method').forEach(b => b.classList.remove('active'));
              this.classList.add('active');
              state.selectedMethod = methods.find(m => m.name === this.dataset.method);
              triggerRecalc();
          });
      });
      if (parseInt(document.getElementById('bp-amount')?.value) > 0)
          triggerRecalc();
  }
  async function processPayment() {
      const amount = parseInt(document.getElementById('bp-amount').value);
      const steamLogin = document.getElementById('bp-login').value.trim();
      if (!steamLogin || !state.selectedMethod)
          return;
      state.steamLogin = steamLogin;
      const payBtn = document.getElementById('bp-pay');
      payBtn.disabled = true;
      payBtn.textContent = 'Processing...';
      try {
          const invoice = await createOrder(amount, state.selectedMethod.name, state.currency, state.promocodeValid ? state.promocode : null);
          if (invoice.paymentUrl) {
              window.open(invoice.paymentUrl, '_blank');
          }
          else {
              throw new Error('No payment URL');
          }
      }
      catch (e) {
          showNotification(e.message || 'Error', 'error');
      }
      finally {
          payBtn.disabled = false;
          payBtn.textContent = 'Pay';
          updatePayButtonState();
      }
  }
  async function handlePromocode() {
      const input = document.getElementById('bp-promo');
      const status = document.getElementById('bp-promo-status');
      const hint = document.getElementById('bp-promo-hint');
      const code = input.value.trim().toUpperCase();
      state.promocode = code;
      if (!code) {
          state.promocodeDiscount = 0;
          state.promocodeValid = false;
          status.textContent = '';
          hint.textContent = 'Promocode gives discount';
          triggerRecalc();
          return;
      }
      status.textContent = '...';
      const result = await validatePromocode(code);
      if (result.valid) {
          status.textContent = '✓';
          status.className = 'bp-promo-status valid';
          hint.textContent = `${result.discount}% discount`;
      }
      else {
          status.textContent = '✗';
          status.className = 'bp-promo-status invalid';
          hint.textContent = 'Invalid';
      }
      triggerRecalc();
  }
  function createUI() {
      const styleEl = document.createElement('style');
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
      const btn = document.createElement('button');
      btn.className = 'bp-btn';
      btn.textContent = 'Top-Up Steam';
      document.body.appendChild(btn);
      const container = document.createElement('div');
      container.innerHTML = createFormHTML();
      document.body.appendChild(container.firstElementChild);
      const form = document.getElementById('bp-form');
      btn.onclick = async () => {
          form.classList.toggle('visible');
          if (form.classList.contains('visible') && !state.paymentMethods.length) {
              try {
                  const methods = await fetchPaymentMethods();
                  renderMethods(methods);
              }
              catch {
                  showNotification('Failed to load methods', 'error');
              }
          }
      };
      document.getElementById('bp-close').onclick = () => form.classList.remove('visible');
      const loginInput = document.getElementById('bp-login');
      const saved = storageGet(['steam_login']);
      if (saved.steam_login) {
          loginInput.value = saved.steam_login;
          state.steamLogin = saved.steam_login;
      }
      else if (state.steamLogin)
          loginInput.value = state.steamLogin;
      loginInput.oninput = function () {
          state.steamLogin = this.value.trim();
          storageSet({ steam_login: state.steamLogin });
          updatePayButtonState();
      };
      const amountInput = document.getElementById('bp-amount');
      amountInput.oninput = () => triggerRecalc();
      document.querySelectorAll('.bp-amt').forEach(b => {
          b.addEventListener('click', function () {
              amountInput.value = this.dataset.amount || '500';
              triggerRecalc();
          });
      });
      document.querySelectorAll('.bp-curr-btn').forEach(b => {
          b.addEventListener('click', function () {
              document.querySelectorAll('.bp-curr-btn').forEach(x => x.classList.remove('active'));
              this.classList.add('active');
              state.currency = this.dataset.currency;
              document.getElementById('bp-curr-label').textContent = state.currency;
              triggerRecalc();
          });
      });
      let promoTimeout = null;
      document.getElementById('bp-promo').oninput = () => {
          if (promoTimeout)
              clearTimeout(promoTimeout);
          promoTimeout = setTimeout(handlePromocode, 500);
      };
      setTimeout(handlePromocode, 1000);
      document.getElementById('bp-agree').addEventListener('change', updatePayButtonState);
      document.getElementById('bp-pay').onclick = processPayment;
  }
  async function WebkitMain() {
      console.log('[BP] Starting...');
      while (!document.body)
          await new Promise(r => setTimeout(r, 100));
      if (window.location.href.includes('steampowered.com') || window.location.href.includes('steamcommunity.com')) {
          getSteamUserInfo();
          createUI();
          console.log('[BP] Ready');
      }
  }

  exports.default = WebkitMain;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
 return millennium_main; };
function ExecutePluginModule() {
    let MillenniumStore = window.MILLENNIUM_PLUGIN_SETTINGS_STORE[pluginName];
    function OnPluginConfigChange(key, __, value) {
        if (key in MillenniumStore.settingsStore) {
            MillenniumStore.ignoreProxyFlag = true;
            MillenniumStore.settingsStore[key] = value;
            MillenniumStore.ignoreProxyFlag = false;
        }
    }
    /** Expose the OnPluginConfigChange so it can be called externally */
    MillenniumStore.OnPluginConfigChange = OnPluginConfigChange;
    MILLENNIUM_BACKEND_IPC.postMessage(0, { pluginName: pluginName, methodName: '__builtins__.__millennium_plugin_settings_parser__' }).then(async (response) => {
        /**
         * __millennium_plugin_settings_parser__ will return false if the plugin has no settings.
         * If the plugin has settings, it will return a base64 encoded string.
         * The string is then decoded and parsed into an object.
         */
        if (typeof response.returnValue === 'string') {
            MillenniumStore.ignoreProxyFlag = true;
            /** Initialize the settings store from the settings returned from the backend. */
            MillenniumStore.settingsStore = MillenniumStore.DefinePluginSetting(Object.fromEntries(JSON.parse(atob(response.returnValue)).map((item) => [item.functionName, item])));
            MillenniumStore.ignoreProxyFlag = false;
        }
        /** @ts-ignore: call the plugin main after the settings have been parsed. This prevent plugin settings from being undefined at top level. */
        let PluginModule = PluginEntryPointMain();
        /** Assign the plugin on plugin list. */
        Object.assign(window.PLUGIN_LIST[pluginName], {
            ...PluginModule,
            __millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
        });
        /** Run the rolled up plugins default exported function */
        let pluginProps = await PluginModule.default();
        function isValidSidebarNavComponent(obj) {
            return obj && obj.title !== undefined && obj.icon !== undefined && obj.content !== undefined;
        }
        if (pluginProps && isValidSidebarNavComponent(pluginProps)) {
            window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS[pluginName] = pluginProps;
        }
        else {
            console.warn(`Plugin ${pluginName} does not contain proper SidebarNavigation props and therefor can't be mounted by Millennium. Please ensure it has a title, icon, and content.`);
            return;
        }
        /** If the current module is a client module, post message id=1 which calls the front_end_loaded method on the backend. */
        if (MILLENNIUM_IS_CLIENT_MODULE) {
            MILLENNIUM_BACKEND_IPC.postMessage(1, { pluginName: pluginName });
        }
    });
}
ExecutePluginModule()