# install.ps1 — установка всех MCP-серверов + агента mcp-admin + скиллов
# Запуск: powershell -ExecutionPolicy Bypass -File install.ps1 [-IncludeUnity]
# Требуется: Node.js (npx) и opencode; bun и uv ставит сам при отсутствии.
# Идемпотентен: конфиг мержится, бэкап создаётся, чужие секции не трогает.

param([switch]$IncludeUnity)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ocDir = Join-Path $env:USERPROFILE ".config\opencode"
$ocJson = Join-Path $ocDir "opencode.json"

Write-Host "== mcp-admin installer ==" -ForegroundColor Cyan

# 1. node/npx
$npx = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if (-not $npx) { $npx = "$env:ProgramFiles\nodejs\npx.cmd" }
if (-not (Test-Path $npx)) { throw "npx.cmd не найден. Установи Node.js (https://nodejs.org) и повтори." }
Write-Host "npx: $npx"

# 2. uv/uvx (ddg-search, officemcp)
$uvx = (Get-Command uvx.exe -ErrorAction SilentlyContinue).Source
if (-not $uvx) { $uvx = Join-Path $env:USERPROFILE ".local\bin\uvx.exe" }
if (-not (Test-Path $uvx)) {
    Write-Host "uv не найден — устанавливаю..." -ForegroundColor Yellow
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    $uvx = Join-Path $env:USERPROFILE ".local\bin\uvx.exe"
    if (-not (Test-Path $uvx)) { throw "uv не установился" }
}
$uvxFwd = $uvx -replace '\\','/'
Write-Host "uvx: $uvx"

# 3. bun (memory-mcp)
$bun = (Get-Command bun.exe -ErrorAction SilentlyContinue).Source
if (-not $bun) { $bun = Join-Path $env:USERPROFILE ".bun\bin\bun.exe" }
if (-not (Test-Path $bun)) {
    Write-Host "bun не найден — устанавливаю..." -ForegroundColor Yellow
    powershell -c "irm https://bun.sh/install.ps1 | iex"
    $bun = Join-Path $env:USERPROFILE ".bun\bin\bun.exe"
    if (-not (Test-Path $bun)) { throw "bun не установился" }
}
Write-Host "bun: $bun"

# 4. браузер для playwright
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (Test-Path $chrome) { $browser = "chrome" } else { $browser = "msedge" }
Write-Host "playwright browser: $browser"

# 5. агент + скиллы + инструкции
New-Item -ItemType Directory -Force -Path $ocDir, (Join-Path $ocDir "agent"), (Join-Path $ocDir "skills") | Out-Null
Copy-Item -Force (Join-Path $root "agent\mcp-admin.md") (Join-Path $ocDir "agent\")
Copy-Item -Recurse -Force (Join-Path $root "skills\memory-mcp") (Join-Path $ocDir "skills")
Copy-Item -Recurse -Force (Join-Path $root "skills\deep-reasoning") (Join-Path $ocDir "skills")
Copy-Item -Force (Join-Path $root "instructions.md") (Join-Path $ocDir "instructions.md")
Write-Host "агент и скиллы скопированы"

# 6. memory-mcp сервер -> ~/tools/memory-mcp
$memDst = Join-Path $env:USERPROFILE "tools\memory-mcp"
New-Item -ItemType Directory -Force -Path (Split-Path $memDst) | Out-Null
if (-not (Test-Path $memDst)) { Copy-Item -Recurse (Join-Path $root "memory-mcp") $memDst }
Push-Location $memDst
& $bun install | Out-Null
& $bun test
Pop-Location
Write-Host "memory-mcp готов: $memDst"

# 7. служебные папки
New-Item -ItemType Directory -Force -Path (Join-Path $env:USERPROFILE "@Browser"), (Join-Path $env:USERPROFILE ".memory") | Out-Null

# 8. слияние opencode.json
$cfg = $null
if (Test-Path $ocJson) {
    Copy-Item $ocJson "$ocJson.bak.$(Get-Date -Format yyyyMMddHHmmss)"
    $cfg = Get-Content $ocJson -Raw | ConvertFrom-Json
}
if (-not $cfg) { $cfg = [pscustomobject]@{ '$schema' = "https://opencode.ai/config.json" } }
if (-not ($cfg.PSObject.Properties["mcp"])) { $cfg | Add-Member -NotePropertyName "mcp" -NotePropertyValue ([pscustomobject]@{}) -Force }
$bwd = (Join-Path $env:USERPROFILE "@Browser") -replace '\\','/'
$memPath = (Join-Path $memDst "src\index.ts") -replace '\\','/'
$npxFwd = $npx -replace '\\','/'
$bunFwd = $bun -replace '\\','/'

$cfg.mcp | Add-Member -NotePropertyName "ddg-search" -NotePropertyValue ([pscustomobject]@{
    type="local"; command=@($uvxFwd,"--from","duckduckgo-mcp-server[browser]","duckduckgo-mcp-server"); enabled=$true
    environment=@{ DDG_REGION="wt-wt"; DDG_SAFE_SEARCH="MODERATE" } }) -Force
$cfg.mcp | Add-Member -NotePropertyName "playwright" -NotePropertyValue ([pscustomobject]@{
    type="local"; command=@($npxFwd,"-y","@playwright/mcp","--browser",$browser,"--caps","pdf","--headless","--output-dir",$bwd); enabled=$true }) -Force
$cfg.mcp | Add-Member -NotePropertyName "memory" -NotePropertyValue ([pscustomobject]@{
    type="local"; command=@($bunFwd,$memPath); enabled=$true; timeout=15000 }) -Force
$cfg.mcp | Add-Member -NotePropertyName "sequentialthinking" -NotePropertyValue ([pscustomobject]@{
    type="local"; command=@($npxFwd,"-y","@modelcontextprotocol/server-sequential-thinking"); enabled=$true }) -Force
$cfg.mcp | Add-Member -NotePropertyName "context7" -NotePropertyValue ([pscustomobject]@{
    type="local"; command=@($npxFwd,"-y","@upstash/context7-mcp"); enabled=$true }) -Force

$word = @(
    "$env:ProgramFiles\Microsoft Office\root\Office16\WINWORD.EXE",
    "$env:ProgramFiles\Microsoft Office\Office16\WINWORD.EXE",
    "${env:ProgramFiles(x86)}\Microsoft Office\root\Office16\WINWORD.EXE",
    "${env:ProgramFiles(x86)}\Microsoft Office\Office15\WINWORD.EXE"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($word) {
    $officeFolder = (Join-Path $env:USERPROFILE "Documents\OfficeMCP") -replace '\\','/'
    New-Item -ItemType Directory -Force -Path (Join-Path $env:USERPROFILE "Documents\OfficeMCP") | Out-Null
    $cfg.mcp | Add-Member -NotePropertyName "OfficeMCP" -NotePropertyValue ([pscustomobject]@{
        type="local"; command=@($uvxFwd,"officemcp","stdio","--folder",$officeFolder); enabled=$true }) -Force
    Write-Host "OfficeMCP добавлен (Office найден)"
} else { Write-Host "MS Office не найден — OfficeMCP пропущен" -ForegroundColor Yellow }

if ($IncludeUnity) {
    $cfg.mcp | Add-Member -NotePropertyName "unityMCP" -NotePropertyValue ([pscustomobject]@{
        type="remote"; url="http://127.0.0.1:8080/mcp"; enabled=$true }) -Force
    Write-Host "unityMCP добавлен (нужна запущенная Unity с MCP-плагином)"
}

$instrPath = (Join-Path $ocDir "instructions.md") -replace '\\','/'
if (-not $cfg.PSObject.Properties['instructions']) {
    $cfg | Add-Member -NotePropertyName "instructions" -NotePropertyValue @($instrPath)
} elseif (-not (@($cfg.instructions) | Where-Object { $_ -like "*instructions.md" })) {
    $cfg.instructions = @($cfg.instructions) + $instrPath
}

$cfg | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $ocJson
Write-Host "opencode.json обновлён (бэкап рядом)" -ForegroundColor Green
Write-Host "`nГотово. Перезапусти opencode, затем проверь: агент скажет `memory_list_slices` и получит [] без ошибок."
