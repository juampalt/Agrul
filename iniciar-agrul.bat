@echo off
setlocal enabledelayedexpansion
title Agrul - Motor de Trazabilidad Agroindustrial

:: Posicionarse en la carpeta donde reside el script
cd /d "%~dp0"

set PORT=3001
set BROWSER_URL=http://localhost:3001

echo ===============================================================================
echo     AGRUL - Motor de Trazabilidad Agroindustrial y Cadena de Suministro
echo     URL: %BROWSER_URL%
echo ===============================================================================
echo.

:: 1. Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se detecto Node.js instalado en el sistema.
    echo Agrul requiere Node.js (v18+) para ejecutarse.
    echo Descargalo e instalalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Verificar dependencias instaladas
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

:: 3. Lanzar el servidor en una consola independiente en este mismo directorio
echo [1/3] Iniciando el servidor Fastify en segundo plano...
start "Agrul Traceability Server" /D "%~dp0" cmd.exe /k npm run dev

:: 4. Esperar de forma activa hasta que el servidor este listo y responda
echo [2/3] Esperando que los servicios inicialicen en el puerto %PORT%...
node scripts/wait-for-server.js

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El servidor esta tardando en arrancar. Revisa la ventana
    echo 'Agrul Traceability Server' para ver si surgio algun error.
    echo.
)

:: 5. Abrir el navegador en el dashboard
echo [3/3] Abriendo Dashboard Web en tu navegador predeterminado...
start %BROWSER_URL%

echo.
echo ===============================================================================
echo   ¡Agrul iniciado con exito!
echo.
echo   - Dashboard y Grafo de Linaje: %BROWSER_URL%
echo   - API Healthcheck:             %BROWSER_URL%/api/v1/health
echo   - Para detener el sistema:     Cerra la ventana titulada 'Agrul Traceability Server'
echo ===============================================================================
echo.
pause
