@echo off
title SMART TECH Billing Launcher
cd /d "%~dp0"

echo =======================================================
echo   Starting SMART TECH Billing and Quotation Desktop App
echo =======================================================
echo.

set "EXE_PATH=%USERPROFILE%\SMART-TECH-Billing-App\SMART TECH Billing & Quotation.exe"

if not exist "%EXE_PATH%" (
    set "EXE_PATH=%USERPROFILE%\smarttech_release\win-unpacked\SMART TECH Billing & Quotation.exe"
)

if not exist "%EXE_PATH%" (
    set "EXE_PATH=%~dp0dist_desktop\win-unpacked\SMART TECH Billing & Quotation.exe"
)

if not exist "%EXE_PATH%" (
    echo [ERROR] Application executable not found at:
    echo "%EXE_PATH%"
    pause
    exit /b 1
)

:: Ensure Windows 11 uses classic print dialog without "doesn't support print preview" error
reg add "HKCU\Software\Microsoft\Print\UnifiedPrintDialog" /v "PreferLegacyPrintDialog" /t REG_DWORD /d 1 /f >nul 2>&1

:: Unblock if flagged
powershell -NoProfile -Command "Unblock-File -LiteralPath '%EXE_PATH%' -ErrorAction SilentlyContinue" >nul 2>&1

:: Start executable
start "" "%EXE_PATH%"

echo Application launched!
ping 127.0.0.1 -n 2 >nul
exit /b 0
