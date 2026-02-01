export default async function WebkitMain() {
  console.log('test1');

  setTimeout(() => {
    console.log('test2');
    const btn = document.createElement('button');
    btn.textContent = 'X';
    btn.style.cssText = 'position:fixed;top:50px;right:20px;z-index:999999';
    document.body.appendChild(btn);
    console.log('test3');
  }, 3000);
}
