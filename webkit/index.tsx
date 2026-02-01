// BattlePass - UI only test

const styles = `
.bp-btn{position:fixed;top:50px;right:20px;z-index:999999;background:#0396ff;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer}
.bp-form{position:fixed;top:100px;right:20px;width:300px;background:#1b2838;border-radius:12px;padding:20px;z-index:999998;display:none;color:#fff}
.bp-form.visible{display:block}
.bp-input{width:100%;padding:10px;background:#171a21;border:1px solid #2a3f5f;border-radius:6px;color:#fff;margin-bottom:10px;box-sizing:border-box}
.bp-pay{width:100%;background:#0396ff;border:none;border-radius:8px;padding:12px;color:#fff;cursor:pointer}
`;

export default async function WebkitMain() {
  console.log('[BP] Starting');

  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (!window.location.href.includes('steampowered.com')) {
    return;
  }

  // Styles
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);

  // Button
  const btn = document.createElement('button');
  btn.className = 'bp-btn';
  btn.textContent = 'Top-Up Steam';
  document.body.appendChild(btn);

  // Form
  const form = document.createElement('div');
  form.className = 'bp-form';
  form.innerHTML = `
    <h3 style="margin:0 0 15px">Top-Up Balance</h3>
    <input class="bp-input" placeholder="Steam Login" id="bp-login">
    <input class="bp-input" type="number" placeholder="Amount" value="100" id="bp-amount">
    <button class="bp-pay" id="bp-pay">Pay</button>
  `;
  document.body.appendChild(form);

  // Toggle
  btn.onclick = () => form.classList.toggle('visible');

  // Pay button
  const payBtn = document.getElementById('bp-pay');
  if (payBtn) {
    payBtn.onclick = () => {
      const login = (document.getElementById('bp-login') as HTMLInputElement).value;
      const amount = (document.getElementById('bp-amount') as HTMLInputElement).value;
      alert('Login: ' + login + ', Amount: ' + amount);
    };
  }

  console.log('[BP] Ready');
}
