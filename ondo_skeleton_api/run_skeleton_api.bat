@echo off
REM ONDO skeleton API - setup (first time) + run. Double-click this file.
cd /d "%~dp0"
if not exist "models\pose_landmarker_heavy.task" (
  echo [0/3] Joining model file parts ...
  copy /b "models\pose_landmarker_heavy.task.part0"+"models\pose_landmarker_heavy.task.part1"+"models\pose_landmarker_heavy.task.part2" "models\pose_landmarker_heavy.task" >nul
)
if not exist "models\pose_landmarker_heavy.task" (
  echo [ERROR] models\pose_landmarker_heavy.task missing.
  pause
  exit /b 1
)
if exist ".venv\Scripts\python.exe" goto run

echo [1/3] Looking for Python 3.9-3.12 ...
py -3.11 -c "import sys" >nul 2>&1 && (py -3.11 -m venv .venv & goto install)
py -3.12 -c "import sys" >nul 2>&1 && (py -3.12 -m venv .venv & goto install)
py -3.10 -c "import sys" >nul 2>&1 && (py -3.10 -m venv .venv & goto install)
py -3.9  -c "import sys" >nul 2>&1 && (py -3.9  -m venv .venv & goto install)
python -c "import sys; sys.exit(0 if (3,9)<=sys.version_info[:2]<=(3,12) else 1)" >nul 2>&1 && (python -m venv .venv & goto install)
echo.
echo [ERROR] Python 3.9-3.12 not found. Install Python 3.11 from https://www.python.org/downloads/ and run this file again.
pause
exit /b 1

:install
echo [2/3] Installing packages (first time only, a few minutes) ...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Package install failed. Send this window's text to Claude.
  pause
  exit /b 1
)

:run
echo [3/3] Starting server. Keep this window open.
echo       Health check: http://127.0.0.1:8000/api/skeleton/health
".venv\Scripts\python.exe" -m uvicorn app:app --host 127.0.0.1 --port 8000
pause
