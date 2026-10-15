@echo off
setlocal enabledelayedexpansion
title Agrul - Motor de Trazabilidad Agroindustrial

:: Posicionarse en la carpeta donde reside el script
cd /d "%~dp0"

echo ===============================================================================
echo     AGRUL - Motor de Trazabilidad Agroindustrial y Cadena de Suministro
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

:: 3. Lanzar el servidor en una consola independiente
echo [1/2] Iniciando el servidor Fastify y motor de trazabilidad en segundo plano...
start "Agrul Traceability Server" cmd /k "npm run dev"

:: 4. Esperar arranque del servidor
echo [2/2] Esperando que los servicios esten listos...
timeout /t 3 /nobreak >nul

:: 5. Abrir el navegador en el dashboard
echo Abriendo Dashboard Web en tu navegador predeterminado...
start http://localhost:3000

echo.
echo ===============================================================================
echo   ¡Agrul iniciado con exito!
echo.
echo   - Dashboard y Grafo de Linaje: http://localhost:3000
echo   - API Healthcheck:             http://localhost:3000/api/v1/health
echo   - Para detener el sistema:     Cerra la ventana titulada 'Agrul Traceability Server'
echo ===============================================================================
echo.
pause
