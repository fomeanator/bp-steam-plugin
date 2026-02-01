# BattlePass Steam Plugin

Пополнение Steam баланса через BattlePass, встроенное в Steam Desktop Client.

## Установка одной командой

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.ps1 | iex
```

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.sh | bash
```

После установки **перезапустите Steam**.

---

## Использование

1. Откройте Steam Store (store.steampowered.com)
2. В правом верхнем углу появится кнопка **"Пополнить Steam"**
3. Заполните форму:
   - Steam логин
   - Сумма пополнения
   - Способ оплаты
   - Промокод (опционально)
4. Примите условия и нажмите "Оплатить"

---

## Возможности

- Пополнение баланса Steam без комиссии
- Поддержка RUB и KZT
- Промокоды на скидку
- Множество способов оплаты (СБП, карты, криптовалюта)
- Кроссплатформенность (Windows, Linux, macOS)

---

## Ручная установка

Если автоматическая установка не работает:

1. Установите [Millennium](https://steambrew.app/)
2. Скачайте этот репозиторий
3. Скопируйте папку в:
   - **Windows:** `%LOCALAPPDATA%\Millennium\plugins\`
   - **Linux:** `~/.millennium/plugins/`
   - **macOS:** `~/Library/Application Support/Millennium/plugins/`
4. Перезапустите Steam

---

## Для компьютерных клубов

Для массовой установки используйте скрипты:

### Windows (через GPO или SCCM):
```powershell
# Запуск на всех ПК
Invoke-Command -ComputerName PC1,PC2,PC3 -ScriptBlock {
    iwr -useb https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.ps1 | iex
}
```

### Linux (через Ansible):
```yaml
- name: Install BattlePass Steam Plugin
  shell: curl -fsSL https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.sh | bash
```

---

## Поддержка

- Telegram: [@BattlePassSupportBot](https://t.me/BattlePassSupportBot)
- Сайт: [battlepass.ru](https://battlepass.ru)

---

## Лицензия

Proprietary - BattlePass
