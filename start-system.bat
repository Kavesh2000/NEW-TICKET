@echo off
echo ========================================
echo   Maisha Bank System Startup
echo ========================================
echo.

echo Starting Maisha Bank Email Service...
echo Make sure to configure your .env file first!
echo.
echo Press Ctrl+C to stop the services
echo.

start cmd /k "cd /d %~dp0 && npm start"

timeout /t 3 /nobreak > nul

echo.
echo Opening Maisha Bank System in browser...
echo.

start http://localhost:8000/index.html

echo.
echo Services started!
echo - Email Service: http://localhost:3001
echo - Web Application: http://localhost:8000
echo.
echo Check the email service terminal for status messages.
echo.

pause