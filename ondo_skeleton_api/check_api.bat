@echo off
cd /d "%~dp0"
curl.exe -s http://127.0.0.1:8000/api/skeleton/health > test_result.txt
echo.>> test_result.txt
curl.exe -s -F "image=@..\public\skeleton\images\s2_natural_04.jpg" http://127.0.0.1:8000/api/skeleton/analyze >> test_result.txt
