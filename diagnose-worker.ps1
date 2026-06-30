param(
  [string]$TokenFile = ".worker-token",
  [string]$WorkerName = "copa2026-bolao"
)
Set-Location $PSScriptRoot

# ── Lê o token ──────────────────────────────────────────
$token = $null
if (Test-Path $TokenFile) { $token = (Get-Content $TokenFile -Raw).Trim() }
if (-not $token) { Write-Host "[ERRO] Token nao encontrado em '$TokenFile'" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Token encontrado ($($token.Length) chars)" -ForegroundColor Green

# ── Autentica ───────────────────────────────────────────
Write-Host "[...] Verificando token no Cloudflare..." -ForegroundColor Yellow
try {
  $acct = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" `
    -Headers @{ Authorization = "Bearer $token" }
} catch {
  Write-Host "[ERRO] Falha de rede ou token invalido: $_" -ForegroundColor Red; exit 1
}
if (-not $acct.success) {
  Write-Host "[ERRO] Token recusado pela CF: $($acct.errors | ConvertTo-Json)" -ForegroundColor Red; exit 1
}
$accountId = $acct.result[0].id
Write-Host "[OK] Account: $accountId ($($acct.result[0].name))" -ForegroundColor Green

# ── Verifica o worker ────────────────────────────────────
Write-Host "[...] Buscando bindings atuais do worker '$WorkerName'..." -ForegroundColor Yellow
try {
  $workerInfo = Invoke-RestMethod `
    -Uri "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$WorkerName/bindings" `
    -Headers @{ Authorization = "Bearer $token" }
} catch {
  Write-Host "[WARN] Nao foi possivel ler bindings: $_" -ForegroundColor Yellow
  $workerInfo = $null
}

if ($workerInfo -and $workerInfo.success) {
  $bindings = $workerInfo.result
  Write-Host ""
  Write-Host "=== BINDINGS ATUAIS NO WORKER ===" -ForegroundColor Cyan
  if ($bindings.Count -eq 0) {
    Write-Host "  (nenhum binding encontrado!)" -ForegroundColor Red
  } else {
    foreach ($b in $bindings) {
      Write-Host "  $($b.name) [$($b.type)]" -ForegroundColor White
    }
  }
  Write-Host ""
} else {
  Write-Host "[WARN] Nao foi possivel listar bindings (endpoint pode nao existir)" -ForegroundColor Yellow
}

# ── Testa o endpoint /cron ───────────────────────────────
Write-Host "[...] Testando endpoint /cron com CRON_SECRET..." -ForegroundColor Yellow
try {
  $r1 = Invoke-RestMethod `
    -Uri "https://copa2026-bolao.luizfelipegobbo.workers.dev/cron?secret=9xf0Dra4XZhg3NEKiSIVAs85QYuM7nLv&task=health" `
    -Method Get -ErrorAction SilentlyContinue
  Write-Host "[OK] Resposta CRON_SECRET: $($r1 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "[ERRO] CRON_SECRET falhou: $_" -ForegroundColor Red
}

Write-Host "[...] Testando endpoint /cron com ADMIN_KEY..." -ForegroundColor Yellow
try {
  $r2 = Invoke-RestMethod `
    -Uri "https://copa2026-bolao.luizfelipegobbo.workers.dev/cron?secret=Copa2026-Bolao-Admin-v19&task=health" `
    -Method Get -ErrorAction SilentlyContinue
  Write-Host "[OK] Resposta ADMIN_KEY: $($r2 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "[ERRO] ADMIN_KEY falhou: $_" -ForegroundColor Red
}

# ── Testa /health ────────────────────────────────────────
Write-Host "[...] Testando /health..." -ForegroundColor Yellow
try {
  $h = Invoke-RestMethod -Uri "https://copa2026-bolao.luizfelipegobbo.workers.dev/health" -Method Get
  Write-Host "[OK] Health: $($h | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "[ERRO] /health falhou: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== DIAGNOSTICO CONCLUIDO ===" -ForegroundColor Cyan
