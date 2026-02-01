#!/bin/bash
# BattlePass Steam Plugin - Установщик
# Использование: curl -fsSL https://raw.githubusercontent.com/fomeanator/bp-steam-plugin/main/install.sh | bash

set -e

REPO="fomeanator/bp-steam-plugin"
PLUGIN_NAME="battlepass-millennium"

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════╗"
    echo "║     BattlePass Steam Plugin Installer    ║"
    echo "║         Пополнение Steam баланса         ║"
    echo "╚══════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Определяем ОС и путь к плагинам
detect_os() {
    case "$(uname -s)" in
        Linux*)
            OS="Linux"
            PLUGINS_DIR="$HOME/.millennium/plugins"
            ;;
        Darwin*)
            OS="macOS"
            PLUGINS_DIR="$HOME/Library/Application Support/Millennium/plugins"
            ;;
        CYGWIN*|MINGW*|MSYS*)
            OS="Windows"
            PLUGINS_DIR="$LOCALAPPDATA/Millennium/plugins"
            ;;
        *)
            print_error "Неподдерживаемая ОС: $(uname -s)"
            exit 1
            ;;
    esac
    print_step "Обнаружена ОС: $OS"
}

# Проверяем наличие Millennium
check_millennium() {
    if [ -d "$PLUGINS_DIR" ] || [ -d "$(dirname "$PLUGINS_DIR")" ]; then
        print_step "Millennium обнаружен"
        return 0
    else
        print_info "Millennium не установлен. Устанавливаем..."
        install_millennium
    fi
}

# Установка Millennium
install_millennium() {
    case "$OS" in
        Linux|macOS)
            curl -fsSL https://steambrew.app/install.sh | sh
            ;;
        Windows)
            powershell -Command "iwr -useb 'https://steambrew.app/install.ps1' | iex"
            ;;
    esac
    print_step "Millennium установлен"
}

# Скачивание и установка плагина
install_plugin() {
    print_info "Скачивание плагина BattlePass..."

    # Создаём папку плагинов если её нет
    mkdir -p "$PLUGINS_DIR"

    # Папка плагина
    PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

    # Удаляем старую версию если есть
    if [ -d "$PLUGIN_DIR" ]; then
        print_info "Удаление старой версии..."
        rm -rf "$PLUGIN_DIR"
    fi

    # Скачиваем через git clone или curl
    if command -v git &> /dev/null; then
        print_info "Клонирование репозитория..."
        git clone --depth 1 "https://github.com/$REPO.git" "$PLUGIN_DIR" 2>/dev/null
        rm -rf "$PLUGIN_DIR/.git"
    else
        print_info "Git не найден, скачивание архивом..."
        TEMP_DIR=$(mktemp -d)
        curl -fsSL "https://github.com/$REPO/archive/refs/heads/main.zip" -o "$TEMP_DIR/plugin.zip"
        unzip -q "$TEMP_DIR/plugin.zip" -d "$TEMP_DIR"
        mv "$TEMP_DIR/bp-steam-plugin-main" "$PLUGIN_DIR"
        rm -rf "$TEMP_DIR"
    fi

    print_step "Плагин установлен в: $PLUGIN_DIR"
}

# Финальные инструкции
print_success() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Установка завершена!             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Следующие шаги:${NC}"
    echo "1. Перезапустите Steam"
    echo "2. Откройте Steam Store (store.steampowered.com)"
    echo "3. Нажмите кнопку 'Пополнить Steam' в правом верхнем углу"
    echo ""
    echo -e "${BLUE}Поддержка:${NC} https://t.me/BattlePassSupportBot"
    echo ""
}

# Основной скрипт
main() {
    print_banner
    detect_os
    check_millennium
    install_plugin
    print_success
}

main "$@"
