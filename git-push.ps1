Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== Git Push - $(Get-Date) ===" -ForegroundColor Cyan
Write-Host ""

git status --short
Write-Host ""

$MSG = Read-Host "Descricao do commit"
if ([string]::IsNullOrWhiteSpace($MSG)) {
    Write-Host "Descricao nao pode ser vazia. Abortando." -ForegroundColor Red
    Read-Host "Pressione Enter para fechar"
    exit 1
}

git add -A
git commit -m $MSG
git push

Write-Host ""
Write-Host "=== Fim - $(Get-Date) ===" -ForegroundColor Green
Read-Host "Pressione Enter para fechar"
