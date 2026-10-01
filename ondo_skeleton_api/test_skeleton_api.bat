@echo off
REM ONDO skeleton API test. Run while run_skeleton_api.bat is running.
cd /d "%~dp0"
echo === health ===
curl.exe -s http://127.0.0.1:8000/api/skeleton/health
echo.
echo.
echo === analyze: s2_natural_04.jpg ===
curl.exe -s -F "image=@..\public\skeleton\images\s2_natural_04.jpg" http://127.0.0.1:8000/api/skeleton/analyze
echo.
echo.
echo Expected: "ok":true ... "p1":-0.873439
pause
