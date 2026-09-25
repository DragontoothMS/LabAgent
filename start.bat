@echo off
title Laboratorio Bot - Start
cd /d "%~dp0"

rem === Cerrar procesos existentes en el puerto 3458 ===
echo Cerrando procesos en puerto 3458...
for /f "tokens=5" %%T in ('netstat -a -n -o ^| findstr ":3458 " ^| findstr "LISTENING" 2^>nul') do (
    echo   Matando PID %%T
    taskkill /F /PID %%T 2>nul
)
timeout /t 1 /nobreak >nul

rem === Cerrar ngrok existente ===
echo Cerrando ngrok existente...
taskkill /F /IM ngrok.exe 2>nul
timeout /t 1 /nobreak >nul

rem === Iniciar ngrok con dominio estatico (en background) ===
echo Iniciando ngrok con dominio estatico...
start "ngrok" /B ngrok http 3458 --url=https://hungerless-uncrystalled-andy.ngrok-free.dev
timeout /t 2 /nobreak >nul

rem === Iniciar el servidor en foreground (no se cierra) ===
echo.
echo === Laboratorio Bot iniciado ===
echo Server: http://127.0.0.1:3458
echo Ngrok:  https://hungerless-uncrystalled-andy.ngrok-free.dev
echo.
echo Presiona Ctrl+C para detener.
echo.
node server.js
