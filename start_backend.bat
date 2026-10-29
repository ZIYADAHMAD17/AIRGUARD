@echo off
echo ===================================================
echo Starting AirGuard FastAPI Backend Server...
echo API docs will be available at: http://127.0.0.1:8000/docs
echo ===================================================

uvicorn backend.main:app --reload --port 8000
pause

