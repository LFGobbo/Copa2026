param(
  [string]$TokenFile = ".worker-token",
  [string]$ScriptFile = "bolao-worker.js",
  [string]$WorkerName = "copa2026-bolao"
)
$ConfirmPreference = 'None'
$WarningPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot
Start-Transcript -Path "$PSScriptRoot\deploy_log.txt" -Force | Out-Null

$ErrorActionPreference = "Stop"

function Die($m) { Write-Host "`n[ERRO] $m" -ForegroundColor Red; exit 1 }

# ── Config ─────────────────────────────────────────
# ATENCAO: Em cada deploy, TODAS as env vars sao enviadas via multipart metadata.
# Se uma nova env var for adicionada no Worker, precisa entrar aqui TAMBEM.
$ENV_VARS = @(
  @{ name="SUPABASE_URL";    type="plain_text";  text="https://etbezmraylbvlnycltha.supabase.co" }
  @{ name="SUPABASE_KEY";    type="secret_text"; text="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0YmV6bXJheWxidmxueWNsdGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI3NDE0MCwiZXhwIjoyMDk2ODUwMTQwfQ.kbcmnTI-anyEaTEIf7tlo107-EL1XEWIm7bzNBGfCbs" }
  @{ name="JWT_SECRET";      type="secret_text"; text="minhachavesecreta123" }
  @{ name="TURNSTILE_SEC";   type="secret_text"; text="0x4AAAAAADj0kQff4_E5yllvUOzc2sCtF2k" }
  @{ name="ADMIN_KEY";       type="secret_text"; text="Copa2026-Bolao-Admin-v19" }
  @{ name="ADMIN_HASH";      type="secret_text"; text="96ce37787d5e040a0951f7dc3d3f724d1c66d68c3e6e2d93855bccf8e6f43786" }
  @{ name="CRON_SECRET";     type="secret_text"; text="9xf0Dra4XZhg3NEKiSIVAs85QYuM7nLv" }
)

# ── Le o token ────────────────────────────────────
$token = $null
if (Test-Path $TokenFile) { $token = (Get-Content $TokenFile -Raw).Trim() }
if (-not $token) { $token = $env:CF_API_TOKEN }
if (-not $token) { Die "Token nao encontrado. Crie '$TokenFile' ou defina env CF_API_TOKEN" }
if (-not (Test-Path $ScriptFile)) { Die "Arquivo '$ScriptFile' nao encontrado" }

# ── Backup local antes de cada deploy ──────────────
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

# ── Sobe o script + bindings (multipart) ──────────
# Usamos multipart com TODAS as env vars no metadata JSON.
# Isso evita que binds sejam apagadas (o que acontece se usarmos multipart com bindings=[]).
# NUNCA use simple PUT (application/javascript) — ele nao preserva o formato Service Worker
# e pode deixar o worker com has_modules=True, quebrando addEventListener.
#
# OBS: O campo "text" DEVE estar presente para TODOS os tipos de binding no metadata,
# inclusive secret_text. Omitir o text causa erro 10021 "invalid or missing text property".
$script = Get-Content $ScriptFile -Raw -Encoding UTF8
$url = "https://api.cloudflare.com/client/v4/accounts/$accountId/workers/scripts/$WorkerName"

$metaObj = @{ body_part = "script"; bindings = $ENV_VARS }
$meta = $metaObj | ConvertTo-Json -Depth 10 -Compress

$boundary = [Guid]::NewGuid().ToString()
$nl = [Environment]::NewLine

$body = "--$boundary${nl}" +
        "Content-Disposition: form-data; name=`"script`"; filename=`"worker.js`"${nl}" +
        "Content-Type: application/javascript${nl}${nl}$script${nl}" +
        "--$boundary${nl}" +
        "Content-Disposition: form-data; name=`"metadata`"${nl}${nl}$meta${nl}" +
        "--$boundary--${nl}"

Write-Host "[...] Enviando $ScriptFile -> $WorkerName (multipart com $($ENV_VARS.Count) bindings) ..." -ForegroundColor Yellow
try {
  $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -Uri $url -Method Put `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "multipart/form-data; boundary=$boundary" `
    -Body $body
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  try { $msg = ($_.ErrorDetails.Message | ConvertFrom-Json).errors[0].message } catch { $msg = $_.Exception.Message }
  Die "HTTP $code : $msg"
}
if ($resp.StatusCode -ge 400) { Die "HTTP $($resp.StatusCode): $($resp.Content)" }

Write-Host "[OK] $WorkerName deployado com sucesso!" -ForegroundColor Green
Stop-Transcript | Out-Null
