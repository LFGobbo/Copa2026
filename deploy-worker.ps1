param(
  [string]$TokenFile = ".worker-token",
  [string]$ScriptFile = "bolao-worker.js",
  [string]$WorkerName = "copa2026-bolao"
)

$ErrorActionPreference = "Stop"

function Die($m) { Write-Host "`n[ERRO] $m" -ForegroundColor Red; exit 1 }

# ── Config ─────────────────────────────────────────
$CRON_SECRET = "9xf0Dra4XZhg3NEKiSIVAs85QYuM7nLv"

# ── Lê o token ────────────────────────────────────
$token = $null
if (Test-Path $TokenFile) { $token = (Get-Content $TokenFile -Raw).Trim() }
if (-not $token) { $token = $env:CF_API_TOKEN }
if (-not $token) { Die "Token nao encontrado. Crie '$TokenFile' ou defina env CF_API_TOKEN" }
if (-not (Test-Path $ScriptFile)) { Die "Arquivo '$ScriptFile' nao encontrado" }

# ── Backup local antes de cada deploy ──────────────
# (AGENTS.md documenta este passo; antes nao existia de fato neste script -- adicionado para
# que a documentacao reflita o comportamento real, e para sempre ter uma copia do que estava
# em produção antes de cada novo deploy.)
$backupFile = "$ScriptFile.backup"
Copy-Item $ScriptFile $backupFile -Force
Write-Host "[OK] Backup criado: $backupFile" -ForegroundColor Green

# ── Autentica ──────────────────────────────────────
Write-Host "[...] Autenticando no Cloudflare..." -ForegroundColor Yellow
try {
  $acct = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts" `
    -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
} catch { Die "Falha de rede: $_" }
if (-not $acct.success) { Die "Token invalido: $($acct.errors[0].message)" }
$accountId = $acct.result[0].id
Write-Host "[OK] Account ID: $accountId" -ForegroundColor Green

# ── Sobe o script com env vars (multipart metadata) ──
$script = Get-Content $ScriptFile -Raw -Encoding UTF8
$url = "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$WorkerName"

$boundary = [Guid]::NewGuid().ToString()
$nl = [Environment]::NewLine

$bodyParts = @()
# Part 1: script
$bodyParts += "--$boundary"
$bodyParts += 'Content-Disposition: form-data; name="script"; filename="worker.js"'
$bodyParts += 'Content-Type: application/javascript'
$bodyParts += ''
$bodyParts += $script
# Part 2: metadata (bindings/env vars)
$meta = @{
  body_part = "script"
  bindings = @(
    @{ type = "secret_text"; name = "CRON_SECRET"; text = $CRON_SECRET }
  )
}
$metaJson = $meta | ConvertTo-Json -Compress
$bodyParts += "--$boundary"
$bodyParts += 'Content-Disposition: form-data; name="metadata"'
$bodyParts += 'Content-Type: application/json'
$bodyParts += ''
$bodyParts += $metaJson
$bodyParts += "--$boundary--"

$multipartBody = ($bodyParts -join $nl) + $nl

Write-Host "[...] Enviando $ScriptFile -> $WorkerName (com CRON_SECRET) ..." -ForegroundColor Yellow
try {
  $resp = Invoke-RestMethod -Uri $url -Method Put `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $multipartBody
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).errors[0].message } catch { $msg = $_.Exception.Message }
  Die "HTTP $code : $msg"
}
if (-not $resp.success) { Die "$($resp.errors[0].message)" }

Write-Host "[OK] $WorkerName deployado com sucesso (CRON_SECRET configurado)!" -ForegroundColor Green