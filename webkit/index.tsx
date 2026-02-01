// BattlePass - простой тест
export default async function WebkitMain() {
  console.log('[BattlePass] Starting...');

  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  if (window.location.href.includes('steampowered.com')) {
    const btn = document.createElement('button');
    btn.textContent = 'BattlePass Test';
    btn.style.cssText = 'position:fixed;top:50px;right:20px;z-index:999999;background:#0396ff;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;';
    btn.onclick = () => alert('BattlePass работает!');
    document.body.appendChild(btn);
    console.log('[BattlePass] Button added');
  }
}
