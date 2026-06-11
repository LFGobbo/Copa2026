@echo off
title Copa do Mundo 2026 - Robo
echo ========================================
echo    Copa do Mundo 2026 - Robo Automatico
echo ========================================
echo.
echo Iniciando servidor em http://localhost:9999
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0robot.ps1"
if errorlevel 1 (
    echo.
    echo Erro! Pressione qualquer tecla para fechar.
    pause >nul
)
