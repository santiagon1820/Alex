@echo off
cls
echo Instalando entrono
:: ========== 1) Verificar permisos de administrador ==========
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Error: Debes ejecutar el script como administrador.
    pause
    exit /b 1
)
:: ========== 2) Agregar HOSTS ==========
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts
findstr /i "192.168.1.240 mglab" "%HOSTS_FILE%" >nul
if %errorLevel%== 0 (
    echo El host mglab ya esta agregado
) else (
    echo Agregando host mglab
    echo 192.168.1.240 mglab >> "%HOSTS_FILE%"
)
pause
exit