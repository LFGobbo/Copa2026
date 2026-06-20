# Backup Supabase - dump de todas as tabelas do bolao
# Uso: PowerShell -ExecutionPolicy Bypass -File backup-supabase.ps1

# TLS 1.2+ exigido pelo Supabase
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$scriptDir = Split-Path $MyInvocation.MyCommand.Path
$outputDir = Join-Path $scriptDir "backups"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

$supabaseUrl = "https://etbezmraylbvlnycltha.supabase.co"
$keyFile = Join-Path $scriptDir ".supabase-key"
if (Test-Path $keyFile) {
  $key = (Get-Content $keyFile -Raw).Trim()
} else {
  Write-Host "[ERRO] .supabase-key nao encontrado." -ForegroundColor Red
  Write-Host "Copie .supabase-key.template e preencha com a service_role key do Supabase." -ForegroundColor Yellow
  exit 1
}
$headers = @{ apikey = $key; Authorization = "Bearer $key" }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$tables = @("participants", "picks", "special_picks", "pick_history", "ranking_snapshots", "majority_cache")
$ok = 0; $err = 0

foreach ($table in $tables) {
  try {
    $url = $supabaseUrl + "/rest/v1/" + $table + "?select=*&limit=100000"
    Write-Host "[...] $table ..." -NoNewline
    $data = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 30
    $path = Join-Path $OutputDir "${table}_${timestamp}.json"
    $data | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding UTF8
    $count = if ($data -is [array]) { $data.Count } elseif ($data) { 1 } else { 0 }
    Write-Host " $count registros" -ForegroundColor Green
    $ok++
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    Write-Host " ERRO $status" -ForegroundColor Red
    $err++
  }
}

Write-Host "[PRONTO] Backup em $OutputDir ($ok/$($tables.Count) tabelas, $err erros)" -ForegroundColor Green

# Dicas para agendamento
Write-Host ""
Write-Host "Para agendar backup diario no Windows (abrir cmd.exe como admin):" -ForegroundColor Yellow
Write-Host "  schtasks /create /tn ""Copa2026 Backup"" /tr ""powershell -ExecutionPolicy Bypass -File \`"$scriptDir\backup-supabase.ps1\`""" /sc daily /st 03:00 /f"
