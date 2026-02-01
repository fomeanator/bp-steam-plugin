export default async function WebkitMain() {
  console.log('[BP] Start');

  while (!document.body) {
    await new Promise(r => setTimeout(r, 100));
  }

  const btn = document.createElement('button');
  btn.textContent = 'Test';
  btn.style.position = 'fixed';
  btn.style.top = '50px';
  btn.style.right = '20px';
  btn.style.zIndex = '999999';
  document.body.appendChild(btn);

  console.log('[BP] Done');
}
