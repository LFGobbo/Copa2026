@echo off
cd /d "%~dp0"
echo === Deploy Worker via Node.js - %date% %time% === > deploy_log.txt
node deploy-node.js
echo === Fim - %date% %time% === >> deploy_log.txt
type deploy_log.txt
pause
