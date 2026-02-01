# BattlePass Steam Plugin - Installation Script for Windows

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$RepoUrl = "https://github.com/fomeanator/bp-steam-plugin/archive/refs/heads/main.zip"
$TempDir = "$env:TEMP\bp-install"

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  BattlePass Steam Plugin" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Find Steam path
$SteamPath = $null
try {
    $SteamPath = (Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Valve\Steam" -ErrorAction SilentlyContinue).InstallPath
} catch {}

if (-not $SteamPath) {
    $SteamPath = "${env:ProgramFiles(x86)}\Steam"
}

Write-Host "[...] Steam path: $SteamPath" -ForegroundColor Gray

if (-not (Test-Path $SteamPath)) {
    Write-Host "[ERROR] Steam not found at $SteamPath" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Create plugins folder if not exists
$PluginsDir = "$SteamPath\plugins"
if (-not (Test-Path $PluginsDir)) {
    Write-Host "[...] Creating plugins folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $PluginsDir -Force | Out-Null
}

Write-Host "[OK] Plugins folder: $PluginsDir" -ForegroundColor Green

# Clean up old installation
$PluginDir = "$PluginsDir\battlepass-millennium"
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
    Write-Host "[ERROR] Failed to download: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Extract
Write-Host "[...] Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $ZipPath -DestinationPath $TempDir -Force

# Find extracted folder and move to plugins
$ExtractedDir = Get-ChildItem -Path $TempDir -Directory | Select-Object -First 1
if ($ExtractedDir) {
    Move-Item -Path $ExtractedDir.FullName -Destination $PluginDir -Force
    Write-Host "[OK] Plugin installed to: $PluginDir" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Could not find plugin files!" -ForegroundColor Red
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
Write-Host ""
Write-Host "Support: https://t.me/BattlePassSupportBot" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
