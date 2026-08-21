@echo off
title MindQuark Sanctuary Local Server
cd /d "%~dp0"
echo ========================================================
echo   Starting MindQuark Sanctuary Local Server...
echo ========================================================
echo.
node preview-server.cjs
if %errorlevel% neq 0 (
    echo.
    echo Node.js not found directly, attempting python or npx fallback...
    python -m http.server 4173 --directory dist
)
pause
