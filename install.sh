#!/bin/bash

# BattlePass Steam Plugin - Installation Script for Linux
# Requires: Millennium must be already installed (https://steambrew.app)

set -e

REPO_URL="https://github.com/fomeanator/bp-steam-plugin/archive/refs/heads/main.zip"
PLUGIN_NAME="battlepass-millennium"
TEMP_DIR="/tmp/bp-install"
PLUGINS_DIR="$HOME/.local/share/millennium/plugins"

echo ""
echo "=================================="
echo "  BattlePass Steam Plugin"
echo "=================================="
echo ""

# Check if Millennium is installed
if [ ! -d "$PLUGINS_DIR" ]; then
    # Try alternative path
    PLUGINS_DIR="$HOME/.millennium/plugins"
fi

if [ ! -d "$PLUGINS_DIR" ]; then
    echo "[ERROR] Millennium not found!"
    echo ""
    echo "Please install Millennium first:"
    echo "https://steambrew.app"
    echo ""
    echo "After installing Millennium, run this script again."
    exit 1
fi

echo "[OK] Millennium found at: $PLUGINS_DIR"

# Clean up old installation
PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"
if [ -d "$PLUGIN_DIR" ]; then
    echo "[...] Removing old version..."
    rm -rf "$PLUGIN_DIR"
fi

# Create temp directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Download plugin
echo "[...] Downloading plugin..."
if command -v curl &> /dev/null; then
    curl -fsSL "$REPO_URL" -o "$TEMP_DIR/plugin.zip"
elif command -v wget &> /dev/null; then
    wget -q "$REPO_URL" -O "$TEMP_DIR/plugin.zip"
else
    echo "[ERROR] curl or wget required!"
    exit 1
fi

# Extract
echo "[...] Extracting..."
cd "$TEMP_DIR"
unzip -q plugin.zip

# Find extracted folder and move to plugins
EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "*battlepass*" -o -name "*main*" | head -1)
if [ -n "$EXTRACTED_DIR" ] && [ -d "$EXTRACTED_DIR" ]; then
    mv "$EXTRACTED_DIR" "$PLUGIN_DIR"
else
    echo "[ERROR] Could not find plugin files in archive!"
    exit 1
fi

# Clean up
rm -rf "$TEMP_DIR"

echo ""
echo "=================================="
echo "  Installation complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Restart Steam"
echo "2. Go to Settings -> Millennium -> Plugins"
echo "3. Enable 'BattlePass' plugin"
echo "4. Go to Store and enjoy!"
echo ""
echo "Support: https://t.me/BattlePassSupportBot"
echo ""
