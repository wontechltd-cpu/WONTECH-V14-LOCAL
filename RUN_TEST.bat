@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo First run: installing Electron packages. Internet is needed only for this step.
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm start
