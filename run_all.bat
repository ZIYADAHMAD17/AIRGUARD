@echo off
echo ===================================================
echo Launching AirGuard Full-Stack Analytics System...
echo ===================================================

start "AirGuard Backend" cmd /k "uvicorn backend.main:app --reload --port 8000"
timeout /t 2 >nul
start "AirGuard Frontend" cmd /k "cd frontend && npm run dev"

echo Backend:  http://127.0.0.1:8000
echo Swagger:  http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
echo ===================================================

