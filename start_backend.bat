@echo off
title MuleNet Forensics Backend
echo ===================================================
echo   Starting MuleNet Financial Forensics Engine Backend
echo ===================================================
echo.
cd /d "%~dp0backend"
call "venv\Scripts\activate.bat"
python run.py
pause
