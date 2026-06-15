# sync.ps1 — Sincroniza index.html → copa2026.html
# Uso: .\sync.ps1
# Deve ser executado antes de todo commit para garantir consistência

$ErrorActionPreference = "Stop"
$src = Join-Path $PSScriptRoot "index.html"
$dst = Join-Path $PSScriptRoot "copa2026.html"

if (!(Test-Path $src)) {
  Write-Host "[ERRO] $src nao encontrado" -ForegroundColor Red
  exit 1
}

Copy-Item $src $dst -Force
Write-Host "[OK] copa2026.html sincronizado com index.html" -ForegroundColor Green
