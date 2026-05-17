@echo off
title Dal - Backend + Frontend baslat
cd /d "%~dp0"
echo.
echo [1/2] Postgres, Backend, Redis ve Frontend baslatiliyor...
docker compose up -d
if errorlevel 1 (
  echo HATA: docker compose calismadi. Docker Desktop acik mi?
  pause
  exit /b 1
)
echo.
echo [2/2] Backend (port 3000) ayaga kalkiyor, birkaç saniye bekleyin...
timeout /t 8 /nobreak >nul
echo.
echo === TAMAMLANDI ===
echo   Backend : http://localhost:3000/health
echo   Frontend: http://localhost:5173
echo   Giris   : aday@demo.com veya educator@demo.com -- sifre: demo123
echo.
pause
