@echo off
cd /d "%~dp0portal"
echo CC Portal (dev mode / nodemon) -- Ctrl+C de dung
echo.
npx nodemon server.js
