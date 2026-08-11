@echo off
chcp 65001 >nul
title WONTECH V14 Windows Build
cd /d "%~dp0"
echo [1/2] Electron build tools installation...
call npm install
if errorlevel 1 goto fail
echo [2/2] Creating Windows portable EXE...
call npm run dist
if errorlevel 1 goto fail
echo.
echo Build complete. Check the release folder.
pause
exit /b 0
:fail
echo.
echo Build failed. Check internet connection and Node.js installation.
pause
exit /b 1
