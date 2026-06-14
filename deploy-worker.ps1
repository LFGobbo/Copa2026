param(
  [string]$TokenFile = ".worker-token",
  [string]$ScriptFile = "bolao-worker.js",
  [string]$WorkerName = "copa2026-bolao"
)

$ErrorActionPreference = "Stop"

function Die($m) { Write-Host "`n[ERRO] $m" -ForegroundColor Red; exit 1 }

# ── Lê o token ────────────────────────────────────
$token = $null
if (Test-Path $TokenFile) { $token = (Get-Content $TokenFile -Raw).Trim() }
if (-not $token) { $token = $env:CF_API_TOKEN }
if (-not $token) { Die "Token nao encontrado. Crie '$TokenFile' ou defina env CF_API_TOKEN" }
if (-not (Test-Path $ScriptFile)) { Die "Arquivo '$ScriptFile' nao encontrado" }

# ── Autentica ──────────────────────────────────────
Write-Host "[...] Autenticando no Cloudflare..." -ForegroundColor Yellow
try {
  $acct = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
} catch { Die "Falha de rede: $_" }
if (-not $acct.success) { Die "Token invalido: $($acct.errors[0].message)" }
$accountId = $acct.result[0].id
Write-Host "[OK] Account ID: $accountId" -ForegroundColor Green

# ── Sobe o script (formato Service Worker) ────────
$script = Get-Content $ScriptFile -Raw -Encoding UTF8
$url = "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$WorkerName"

Write-Host "[...] Enviando $ScriptFile -> $WorkerName ..." -ForegroundColor Yellow
try {
  $resp = Invoke-RestMethod -Uri $url -Method Put `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/javascript" `
    -Body $script
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).errors[0].message } catch { $msg = $_.Exception.Message }
  Die "HTTP $code : $msg"
}
if (-not $resp.success) { Die "$($resp.errors[0].message)" }

Write-Host "[OK] $WorkerName deployado com sucesso!" -ForegroundColor Green