@echo off
echo ====================================
echo   Simple App Launcher
echo ====================================
echo.

:: Set environment variables and paths
set BACKEND_DIR=%~dp0backend

:: Check Python installation
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in your PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [INFO] Starting the application...
echo.

:: Setup backend
cd "%BACKEND_DIR%"
echo [INFO] Setting up backend...

:: Check if venv exists, create it if not
if not exist venv (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

:: Activate and install requirements
call venv\Scripts\activate
echo [INFO] Installing backend dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

:: Start backend and open web browser
echo [INFO] Starting backend server...
echo [INFO] Opening http://localhost:5000 in your browser...

:: Open browser and start server
start http://localhost:5000
python app.py 