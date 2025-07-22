# Script para executar testes do backend
Set-Location "f:\DEV\TRAE\tasks\backend"
Write-Host "Executando testes do backend..." -ForegroundColor Green
npm test
Write-Host "Testes concluídos!" -ForegroundColor Green
Read-Host "Pressione Enter para continuar"