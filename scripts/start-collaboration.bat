@echo off
REM Start Collaboration Server Script for Windows
REM This script starts the WebSocket server for real-time collaboration

echo 🚀 Starting DocuForge Collaboration Server...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Set default port
if "%COLLABORATION_PORT%"=="" set COLLABORATION_PORT=3001

echo 📡 Collaboration server will start on port %COLLABORATION_PORT%

REM Check if port is already in use (Windows)
netstat -an | find ":%COLLABORATION_PORT%" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port %COLLABORATION_PORT% is already in use.
    echo    You can either:
    echo    1. Stop the process using port %COLLABORATION_PORT%
    echo    2. Set a different port: set COLLABORATION_PORT=3002 && start-collaboration.bat
    pause
    exit /b 1
)

REM Set environment variables
set NODE_ENV=development
set COLLABORATION_PORT=%COLLABORATION_PORT%

echo 🔧 Environment: %NODE_ENV%
echo 🌐 WebSocket URL: ws://localhost:%COLLABORATION_PORT%

REM Start the collaboration server
echo ✅ Starting collaboration server...
echo    Press Ctrl+C to stop the server
echo.

REM Run the collaboration server
npx tsx src/lib/collaboration-server.ts

echo.
echo 👋 Collaboration server stopped.
pause
