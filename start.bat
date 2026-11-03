@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo    Co-StudyMaxx Development Server
echo ========================================================
echo.

set PHP_BIN=
where php >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PHP_BIN=php
) else if exist "C:\xampp\php\php.exe" (
    set PHP_BIN=C:\xampp\php\php.exe
) else if exist "D:\xampp\php\php.exe" (
    set PHP_BIN=D:\xampp\php\php.exe
) else if exist "C:\laragon\bin\php\php.exe" (
    set PHP_BIN=C:\laragon\bin\php\php.exe
)

if "%PHP_BIN%"=="" (
    echo [ERROR] PHP executable was not found.
    echo Please install PHP or XAMPP at C:\xampp\php\php.exe or add PHP to your PATH.
    pause
    exit /b 1
)

echo Using PHP: %PHP_BIN%
echo.

netstat -ano -p tcp | findstr /R /C:"127.0.0.1:8080 .*LISTENING" >nul
if not errorlevel 1 (
    echo [ERROR] Co-StudyMaxx is already listening on http://127.0.0.1:8080.
    echo Stop the existing PHP server window with Ctrl+C before starting another copy.
    echo.
    pause
    exit /b 1
)

where npm.cmd >nul 2>nul
if not errorlevel 1 (
    echo Building React components ...
    call npm.cmd run build
    if errorlevel 1 exit /b 1
    netstat -ano -p tcp | findstr /R /C:"127.0.0.1:8091 .*LISTENING" >nul
    if not errorlevel 1 (
        echo [INFO] Mailer service is already listening on http://127.0.0.1:8091; using the existing instance.
    ) else (
        echo Starting mailer service on http://127.0.0.1:8091 ...
        start "" /B cmd /d /c "call npm.cmd run mailer"
    )
) else (
    echo [WARNING] Node.js/npm was not found. The PHP app will still start, but password-recovery email will be unavailable.
    echo.
)
echo Starting Co-StudyMaxx on http://127.0.0.1:8080 ...
echo Press Ctrl+C to stop the server.
echo.
"%PHP_BIN%" -d upload_max_filesize=10M -d post_max_size=12M -S 127.0.0.1:8080 router.php

