@echo off
title Agrul - Motor de Trazabilidad Agroindustrial
cd /d "%~dp0"

set PORT=3001
set BROWSER_URL=http://localhost:3001

echo ===============================================================================
echo     AGRUL - Motor de Trazabilidad Agroindustrial y Cadena de Suministro
echo     URL: %BROWSER_URL%
echo ===============================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se detecto Node.js instalado en el sistema.
    echo Agrul requiere Node.js v18 o superior para ejecutarse.
    echo Descargalo e instalalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [INFO] Primera ejecucion detectada. Instalando dependencias de Agrul...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Hubo un error al instalar las dependencias con npm install.
        pause
        exit /b 1
    )
    echo.
)

echo [1/3] Iniciando el servidor Fastify en segundo plano...
start "Agrul Traceability Server" /D "%~dp0" cmd.exe /k npm run dev

echo [2/3] Esperando que los servicios inicialicen en el puerto %PORT%...
node scripts/wait-for-server.js

echo [3/3] Abriendo Dashboard Web en tu navegador predeterminado...
start %BROWSER_URL%

echo.
echo ===============================================================================
echo   Agrul iniciado correctamente.
echo.
echo   - Dashboard y Grafo de Linaje: %BROWSER_URL%
echo   - API Healthcheck:             %BROWSER_URL%/api/v1/health
echo   - Para detener el sistema:     Cerra la ventana Agrul Traceability Server
echo ===============================================================================
echo.
pause