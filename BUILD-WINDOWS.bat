@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || exit /b 1
where npm >nul 2>nul || exit /b 1
where cargo >nul 2>nul || exit /b 1
call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run bundle
pause
