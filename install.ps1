# BattlePass Steam Plugin - Installation Script for Windows
# Requires: Millennium must be already installed (https://steambrew.app)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoUrl = "https://github.com/fomeanator/bp-steam-plugin/archive/refs/heads/main.zip"
$PluginName = "bp-steam-plugin-main"
$PluginFinalName = "battlepass-millennium"
$TempDir = "$env:TEMP\bp-install"

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  BattlePass Steam Plugin" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Find Millennium plugins folder
$PossiblePaths = @(
    "$env:LOCALAPPDATA\Millennium\plugins",
    "$env:APPDATA\Millennium\plugins",
    "${env:ProgramFiles(x86)}\Steam\plugins",
    "${env:ProgramFiles}\Steam\plugins",
    "$env:LOCALAPPDATA\Steam\plugins"
)

# Also check Steam install path from registry
try {
    $SteamPath = (Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -ErrorAction SilentlyContinue).InstallPath
    if ($SteamPath) {
        $PossiblePaths += "$SteamPath\plugins"
    }
} catch {}

$PluginsDir = $null
foreach ($path in $PossiblePaths) {
    Write-Host "[...] Checking: $path" -ForegroundColor Gray
    if (Test-Path $path) {
        $PluginsDir = $path
        break
    }
}

# If not found, create in default location
if (-not $PluginsDir) {
    Write-Host "[...] Creating plugins folder..." -ForegroundColor Yellow
    $PluginsDir = "$env:LOCALAPPDATA\Millennium\plugins"
    New-Item -ItemType Directory -Path $PluginsDir -Force | Out-Null
}

Write-Host "[OK] Millennium found at: $PluginsDir" -ForegroundColor Green

# Clean up old installation
$PluginDir = "$PluginsDir\$PluginFinalName"
if (Test-Path $PluginDir) {
    Write-Host "[...] Removing old version..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $PluginDir
}

# Create temp directory
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Download plugin
Write-Host "[...] Downloading plugin..." -ForegroundColor Yellow
$ZipPath = "$TempDir\plugin.zip"

try {
    Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath -UseBasicParsing
} catch {
    Write-Host "[ERROR] Failed to download plugin!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Extract
Write-Host "[...] Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

# Find extracted folder and move to plugins
$ExtractedDir = Get-ChildItem -Path $TempDir -Directory | Where-Object { $_.Name -like "*battlepass*" -or $_.Name -like "*main*" } | Select-Object -First 1
if ($ExtractedDir) {
    Move-Item -Path $ExtractedDir.FullName -Destination $PluginDir
} else {
    Write-Host "[ERROR] Could not find plugin files in archive!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Clean up
Remove-Item -Recurse -Force $TempDir

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Steam" -ForegroundColor White
Write-Host "2. Go to Settings -> Millennium -> Plugins" -ForegroundColor White
Write-Host "3. Enable 'BattlePass' plugin" -ForegroundColor White
Write-Host "4. Go to Store and enjoy!" -ForegroundColor White
Write-Host ""
Write-Host "Support: https://t.me/BattlePassSupportBot" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
