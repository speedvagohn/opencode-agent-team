# install.ps1 — установка pipeline-агентов (orchestrator/architect/executor/critic/reviewer)
# Идемпотентен. Только файлы агентов, ничего более.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dst = Join-Path $env:USERPROFILE ".config\opencode\agent"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Force (Join-Path $root "agent\*.md") $dst
Write-Host "Установлены агенты: $((Get-ChildItem $dst -File | Where-Object Name -match 'orchestrator|architect|executor|critic|reviewer').Name -join ', ')"
Write-Host "Перезапусти opencode. Старт: @orchestrator «новый проект, папка <path>, хочу <что>»"
