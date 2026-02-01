# BattlePass Steam Plugin

Пополнение Steam баланса через BattlePass прямо в Steam клиенте.

## Требования

- [Millennium](https://steambrew.app) должен быть установлен

## Установка

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.ps1 | iex
```

### Linux
```bash
curl -fsSL https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.sh | bash
```

## Ручная установка

1. Скачайте репозиторий
2. Скопируйте папку в:
   - **Windows:** `%LOCALAPPDATA%\Millennium\plugins\battlepass-millennium`
   - **Linux:** `~/.local/share/millennium/plugins/battlepass-millennium`
3. Перезапустите Steam
4. Включите плагин: Settings → Millennium → Plugins

## Использование

1. Откройте Steam Store (магазин внутри Steam клиента)
2. В правом верхнем углу появится кнопка **"Пополнить Steam"**
3. Заполните форму и оплатите

## Поддержка

- Telegram: [@BattlePassSupportBot](https://t.me/BattlePassSupportBot)
- Сайт: [battlepass.ru](https://battlepass.ru)
