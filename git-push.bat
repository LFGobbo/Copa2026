@echo off
cd /d "%~dp0"
echo.
echo === Git Push - %date% %time% ===
echo.

:: Mostra o que mudou
git status --short
echo.

:: Pede a descricao do commit
set /p MSG="Descricao do commit: "
if "%MSG%"=="" (
    echo Descricao nao pode ser vazia. Abortando.
    pause
    exit /b 1
)

git add -A
git commit -m "%MSG%"
git push

echo.
echo === Fim - %date% %time% ===
pause
