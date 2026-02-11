@echo off
cls

:: ========== 1) Verificar permisos de administrador ==========
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Solicitando permisos de administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Instalando entorno...

:: ========== 2) Agregar HOSTS ==========
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts
set IP=100.85.49.31

call :AddHost mglab
call :AddHost n8n.mglab
call :AddHost s3-mx-1.mglab.com

echo.
echo Proceso terminado.
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
