# Backup Supabase - dump de todas as tabelas do bolao
$outputDir = Join-Path (Split-Path $MyInvocation.MyCommand.Path) "backups"
if (!(Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

$supabaseUrl = "https://etbezmraylbvlnycltha.supabase.co"
$keyFile = Join-Path $PSScriptRoot ".supabase-key"
if (Test-Path $keyFile) {
  $key = (Get-Content $keyFile -Raw).Trim()
} else {
  Write-Host "[ERRO] .supabase-key nao encontrado. Copie .supabase-key.template e preencha a chave." -ForegroundColor Red
  exit 1
}
$headers = @{ apikey = $key; Authorization = "Bearer $key" }
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$tables = @("participants", "picks", "special_picks", "pick_history", "ranking_snapshots", "majority_cache")

foreach ($table in $tables) {
  try {
    $url = "$supabaseUrl/rest/v1/$table?select=*&limit=100000"
    $data = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
    $path = Join-Path $outputDir "${table}_${timestamp}.json"
    $data | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding UTF8
    Write-Host "[OK] $table -> $($data.Count) registros salvos"
  } catch {
    Write-Host "[ERRO] $table : $($_.Exception.Message)"
  }
}

Write-Host "[PRONTO] Backup salvo em: $outputDir"
