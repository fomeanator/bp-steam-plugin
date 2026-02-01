# BattlePass Steam Plugin - Windows Installer
# Использование: iwr -useb https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "fomeanator/bp-steam-plugin"
$PLUGIN_NAME = "battlepass-millennium"
$PLUGINS_DIR = "$env:LOCALAPPDATA\Millennium\plugins"

function Write-Banner {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "   BattlePass Steam Plugin Installer    " -ForegroundColor Cyan
    Write-Host "      Пополнение Steam баланса          " -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "[i] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Err {
    param([string]$Message)
    Write-Host "[X] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Test-Millennium {
    if (Test-Path "$env:LOCALAPPDATA\Millennium") {
        Write-Step "Millennium обнаружен"
        return $true
    }
    return $false
}

function Install-Millennium {
    Write-Info "Millennium не установлен. Устанавливаем..."
    try {
        iwr -useb "https://steambrew.app/install.ps1" | iex
        Write-Step "Millennium установлен"
    }
    catch {
        Write-Err "Ошибка установки Millennium: $_"
        exit 1
    }
}

function Install-Plugin {
    Write-Info "Скачивание плагина BattlePass..."

    # Создаём папку плагинов
    if (-not (Test-Path $PLUGINS_DIR)) {
        New-Item -ItemType Directory -Path $PLUGINS_DIR -Force | Out-Null
    }

    $PLUGIN_DIR = "$PLUGINS_DIR\$PLUGIN_NAME"

    # Удаляем старую версию
    if (Test-Path $PLUGIN_DIR) {
        Write-Info "Удаление старой версии..."
        Remove-Item -Path $PLUGIN_DIR -Recurse -Force
    }

    # Скачиваем архив
    $TEMP_DIR = [System.IO.Path]::GetTempPath()
    $ZIP_PATH = "$TEMP_DIR\bp-plugin.zip"
    $EXTRACT_PATH = "$TEMP_DIR\bp-plugin-extract"

    try {
        Write-Info "Загрузка..."
        Invoke-WebRequest -Uri "https://github.com/$REPO/archive/refs/heads/main.zip" -OutFile $ZIP_PATH

        Write-Info "Распаковка..."
        if (Test-Path $EXTRACT_PATH) {
            Remove-Item -Path $EXTRACT_PATH -Recurse -Force
        }
        Expand-Archive -Path $ZIP_PATH -DestinationPath $EXTRACT_PATH -Force

        # Перемещаем в папку плагинов
        Move-Item -Path "$EXTRACT_PATH\bp-steam-plugin-main" -Destination $PLUGIN_DIR -Force

        # Очистка
        Remove-Item -Path $ZIP_PATH -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $EXTRACT_PATH -Recurse -Force -ErrorAction SilentlyContinue

        Write-Step "Плагин установлен в: $PLUGIN_DIR"
    }
    catch {
        Write-Err "Ошибка установки: $_"
        exit 1
    }
}

function Write-Success {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "        Установка завершена!            " -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Yellow
    Write-Host "1. Перезапустите Steam"
    Write-Host "2. Откройте Steam Store (store.steampowered.com)"
    Write-Host "3. Нажмите кнопку 'Пополнить Steam' в правом верхнем углу"
    Write-Host ""
    Write-Host "Поддержка: " -NoNewline
    Write-Host "https://t.me/BattlePassSupportBot" -ForegroundColor Cyan
    Write-Host ""
}

# Main
Write-Banner

if (-not (Test-Millennium)) {
    Install-Millennium
}

Install-Plugin
Write-Success
