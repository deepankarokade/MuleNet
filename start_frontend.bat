@echo off
title MuleNet Frontend Dev Server
echo ===================================================
echo   Starting MuleNet Next.js Frontend on Port 3000
echo ===================================================
echo.
cd /d "%~dp0frontend\mulenet"
npm run dev -- -p 3000
pause
