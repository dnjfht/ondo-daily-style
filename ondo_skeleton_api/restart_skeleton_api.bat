@echo off
cd /d "%~dp0"
echo [1/2] Stopping old API server on port 8000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000 " ^| findstr LISTENING') do taskkill /PID %%p /F
timeout /t 2 /nobreak
echo [2/2] Starting new API server (v3.2)...
start "ONDO Skeleton API" cmd /k call run_skeleton_api.bat
echo Waiting 30 seconds for the server to load the model...
timeout /t 30 /nobreak
call test_skeleton_api.bat
