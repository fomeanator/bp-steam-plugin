// BattlePass Steam Plugin - Webkit Entry
// Открывает форму пополнения на сайте BattlePass

const BATTLEPASS_URL = 'https://battlepass.ru/steam';

const styles = `
.bp-toggle-btn {
  position: fixed;
  top: 50px;
  right: 20px;
  z-index: 999999;
  background: #0396ff;
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
  width: 340px;
  background: #1b2838;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  font-family: Arial, sans-serif;
  z-index: 999998;
  display: none;
  color: #c7d5e0;
}
.bp-form.visible { display: block; }
.bp-header {
  background: #171a21;
  padding: 15px 20px;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bp-header h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}
.bp-close {
  background: none;
  border: none;
  color: #8f98a0;
  font-size: 20px;
  cursor: pointer;
}
.bp-close:hover { color: #fff; }
.bp-content { padding: 20px; }
.bp-section { margin-bottom: 15px; }
.bp-label {
  display: block;
  color: #8f98a0;
  font-size: 12px;
  margin-bottom: 6px;
}
.bp-input {
  width: 100%;
  padding: 10px 12px;
  background: #171a21;
  border: 1px solid #2a3f5f;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  box-sizing: border-box;
}
.bp-input:focus {
  outline: none;
  border-color: #0396ff;
}
.bp-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 8px;
}
.bp-amount-btn {
  background: #171a21;
  border: 1px solid #2a3f5f;
  border-radius: 6px;
  padding: 8px;
  color: #c7d5e0;
  cursor: pointer;
  font-size: 13px;
}
.bp-amount-btn:hover { border-color: #0396ff; color: #fff; }
.bp-pay-btn {
  width: 100%;
  background: #0396ff;
  border: none;
  border-radius: 6px;
  padding: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
}
.bp-pay-btn:hover { background: #0aa8ff; }
.bp-pay-btn:disabled {
  background: #2a3f5f;
  cursor: not-allowed;
  color: #8f98a0;
}
.bp-note {
  text-align: center;
  color: #8f98a0;
  font-size: 11px;
  margin-top: 12px;
}
`;

function createUI() {
  // Стили
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Кнопка
  const btn = document.createElement('button');
  btn.className = 'bp-toggle-btn';
  btn.textContent = 'Пополнить Steam';
  document.body.appendChild(btn);

  // Форма
  const form = document.createElement('div');
  form.className = 'bp-form';
  form.innerHTML = `
    <div class="bp-header">
      <h3>Пополнение Steam</h3>
      <button class="bp-close">×</button>
    </div>
    <div class="bp-content">
      <div class="bp-section">
        <label class="bp-label">Steam логин:</label>
        <input type="text" class="bp-input" id="bp-login" placeholder="Ваш логин Steam">
      </div>
      <div class="bp-section">
        <label class="bp-label">Сумма (RUB):</label>
        <input type="number" class="bp-input" id="bp-amount" placeholder="100" value="100" min="50">
        <div class="bp-amounts">
          <button class="bp-amount-btn" data-amount="100">100</button>
          <button class="bp-amount-btn" data-amount="500">500</button>
          <button class="bp-amount-btn" data-amount="1000">1000</button>
        </div>
      </div>
      <button class="bp-pay-btn" id="bp-pay" disabled>Перейти к оплате</button>
      <div class="bp-note">Вы будете перенаправлены на сайт BattlePass</div>
    </div>
  `;
  document.body.appendChild(form);

  // События
  btn.onclick = () => form.classList.toggle('visible');

  form.querySelector('.bp-close')!.addEventListener('click', () => {
    form.classList.remove('visible');
  });

  // Быстрые суммы
  form.querySelectorAll('.bp-amount-btn').forEach(b => {
    b.addEventListener('click', () => {
      (document.getElementById('bp-amount') as HTMLInputElement).value = (b as HTMLElement).dataset.amount || '100';
      updateBtn();
    });
  });

  const loginInput = document.getElementById('bp-login') as HTMLInputElement;
  const amountInput = document.getElementById('bp-amount') as HTMLInputElement;
  const payBtn = document.getElementById('bp-pay') as HTMLButtonElement;

  function updateBtn() {
    const login = loginInput.value.trim();
    const amount = parseInt(amountInput.value) || 0;
    payBtn.disabled = !(login && amount >= 50);
  }

  loginInput.addEventListener('input', updateBtn);
  amountInput.addEventListener('input', updateBtn);

  // Оплата - редирект на сайт
  payBtn.addEventListener('click', () => {
    const login = loginInput.value.trim();
    const amount = amountInput.value;

    if (!login || !amount) return;

    // Открываем сайт BattlePass с параметрами
    const url = `${BATTLEPASS_URL}?account=${encodeURIComponent(login)}&amount=${amount}&currency=rub&promocode=HELLO`;
    window.open(url, '_blank');
  });
}

export default async function WebkitMain() {
  console.log('[BattlePass] Starting...');

  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (window.location.href.includes('store.steampowered.com') ||
      window.location.href.includes('steamcommunity.com')) {
    createUI();
    console.log('[BattlePass] UI ready');
  }
}
