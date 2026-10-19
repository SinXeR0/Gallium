@echo off
rem Double-click to start Gallium.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=5)?0:1)"
if errorlevel 1 goto nonode
set OPEN_BROWSER=1
node --no-warnings server.js
pause
exit /b
:nonode
echo Gallium needs Node.js (version 22.5 or newer).
echo Opening the download page. Install the LTS version, then double-click Start Gallium again.
start "" "https://nodejs.org/en/download"
pause
