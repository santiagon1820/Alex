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
:: ========== 2) Variable base ==========
set BASE=%~dp0
:: ========== 3) Agregar HOSTS ==========
set HOSTS_FILE=C:\Windows\System32\drivers\etc\hosts
findstr /i "192.168.1.240 mglab" "%HOSTS_FILE%" >nul
if %errorLevel%== 0 (
    echo El host mglab ya esta agregado
) else (
    echo Agregando host mglab
    echo 192.168.1.240 mglab >> "%HOSTS_FILE%"
)
:: ========== 4) Instalar dependencias =========
pip install -r %BASE%requirements.txt
:: ========== 5) Copiar PS1 a StartUP =========
set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
copy /y "%BASE%start\Serial.ps1" "%STARTUP%\Serial.ps1"
:: ========== 6) Copiar serial.py a crear carpeta SerialServer =========
md "C:\SerialServer"
copy /y "%BASE%start\serial.py" "C:\SerialServer\serial.py"
:: ========== 7) Iniciar servicios de ps1 que ya arranca el serial.py de manera oculta =========
%BASE%\start\Serial.ps1

pause
exit