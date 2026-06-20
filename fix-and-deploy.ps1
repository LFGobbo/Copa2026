Set-Location $PSScriptRoot
$ProgressPreference = 'SilentlyContinue'
$ConfirmPreference  = 'None'
$WarningPreference  = 'SilentlyContinue'

Write-Host "=== Remove lock files ===" -ForegroundColor Yellow
Remove-Item -Force ".git\index.lock" -ErrorAction SilentlyContinue
Remove-Item -Force ".git\HEAD.lock"  -ErrorAction SilentlyContinue

Write-Host "=== Git commit + push ===" -ForegroundColor Yellow
git add bolao-worker.js
git commit -m "fix: restaura worker completo + UPSERT safe em special-picks (arquivo estava truncado)" 2>&1 | Out-Null
git push origin master
if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] git push falhou" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Push feito" -ForegroundColor Green

Write-Host "=== Deploy Cloudflare Worker ===" -ForegroundColor Yellow
node deploy-node.js
if ($LASTEXITCODE -ne 0) { Write-Host "[ERRO] deploy falhou" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Tudo pronto!" -ForegroundColor Green
