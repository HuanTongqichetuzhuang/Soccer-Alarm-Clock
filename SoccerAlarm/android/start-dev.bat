@echo off
echo Starting SoccerAlarm Dev Server...
cd /d "%~dp0"
start "" http://localhost:8080
node dev-server.js
pause
