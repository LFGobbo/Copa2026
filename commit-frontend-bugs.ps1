Set-Location $PSScriptRoot

# Remove lock se existir
if (Test-Path ".git\index.lock") { Remove-Item ".git\index.lock" -Force }

git add index.html copa2026.html
git commit -m "fix: 6 bugs frontend (KO scoring, pen persistence, bracket restore, simulacao)

Bug 5:  stateClass usa gPts (KO) em vez de bolaoCalcPickPts (grupos)
Bug 9:  MATCH_PEN_WINNER global - persiste pen no localStorage entre sessoes
Bug 10: Remove hardcode gn===73, usa gameIsPast() dinamico
Bug 16: try/finally em _bolaoGetBracket garante restauracao de scores
Bug 20: bolaoSimular() limpa copa2026_ranking_cache + reseta caches em memoria"

Write-Host "[OK] Commit realizado" -ForegroundColor Green
Write-Host ""
Write-Host "Para fazer o push: git push"
