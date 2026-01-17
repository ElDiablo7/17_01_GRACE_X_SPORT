@echo off
setlocal
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=3002
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0\one_click_boot.ps1" %PORT%
