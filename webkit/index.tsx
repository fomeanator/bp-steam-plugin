// BattlePass Webkit - выполняется на страницах Steam Store
export default async function WebkitMain() {
  console.log('[BattlePass] Webkit started, URL:', window.location.href);

  // Ждём пока body загрузится
  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  // Зелёная плашка - индикатор что плагин работает
  const indicator = document.createElement('div');
  indicator.id = 'bp-indicator';
  indicator.innerHTML = '✓ BattlePass Plugin РАБОТАЕТ!';
  indicator.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    left: 10px !important;
    background: #00ff00 !important;
    color: #000 !important;
    padding: 15px 25px !important;
    font-size: 18px !important;
    font-weight: bold !important;
    font-family: Arial, sans-serif !important;
    border-radius: 10px !important;
    z-index: 999999999 !important;
    box-shadow: 0 4px 20px rgba(0,255,0,0.5) !important;
  `;
  document.body.appendChild(indicator);

  // Убираем через 10 секунд
  setTimeout(() => {
    indicator.remove();
  }, 10000);
}
