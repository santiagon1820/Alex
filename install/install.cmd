@echo off
cls

:: ========== 1) Verificar permisos de administrador ==========
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Se requieren permisos de administrador...
    powershell -Command "while($true){try{Start-Process '%~f0' -Verb RunAs -Wait; break}catch{}}"
    exit /b
)

echo Permisos de administrador confirmados.
echo.

:: ========== 2) Validar existencia de CA ==========
set CERT_PATH=%~dp0ca.crt

if not exist "%CERT_PATH%" (
    echo ERROR: No se encontro el certificado requerido:
    echo %CERT_PATH%
    echo.
    echo Coloca el archivo ca.crt en la misma carpeta que este script.
    pause
    exit /b 1
)

:: ========== 3) Instalar certificado ==========
echo Instalando certificado CA...
certutil -addstore -f "Root" "%CERT_PATH%" >nul

if %errorLevel% neq 0 (
    echo ERROR instalando certificado.
    pause
    exit /b 1
)

echo Certificado instalado correctamente.
echo.

:: ========== 4) Agregar HOSTS ==========
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts
set IP=100.85.49.31

call :AddHost mglab
call :AddHost n8n.mglab
call :AddHost s3-mx-1.mglab.com

echo.
echo Para mejor experiencia:
echo 1. Navega a chrome://settings/searchEngines
echo 2. Busqueda en sitios
echo 3. Agregar
echo    Nombre: mglab
echo    Atajo: mglab
echo    URL: https://mglab
pause
exit


:AddHost
set DOMAIN=%1

findstr /i "%DOMAIN%" "%HOSTS_FILE%" >nul

if %errorLevel%==0 (
    echo El host %DOMAIN% ya esta agregado
) else (
    echo Agregando host %DOMAIN%
    echo %IP% %DOMAIN%>>"%HOSTS_FILE%"
)

exit /b
