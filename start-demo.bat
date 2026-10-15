@echo off
rem Double-click this file to start the Chotu demo. Chrome opens by itself when it is ready.
rem Keep this black window open during the demo; closing it stops Chotu.
cd /d "%~dp0"
title Chotu demo (keep this window open)
echo Starting Chotu... the browser will open in a few seconds.
echo Keep this window open during the demo. Close it when you are finished.
call npm run dev -- --open
pause
