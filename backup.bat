@echo off
:: ============================================================
::  CC Portal -- Backup Database
::  Dung cach: chay truc tiep hoac qua Windows Task Scheduler
::
::  Cai dat Task Scheduler (chay tu dong hang ngay):
::    1. Mo Task Scheduler (taskschd.msc)
::    2. Action > Create Basic Task
::    3. Trigger: Daily, 00:00
::    4. Action: Start a program
::       Program:  C:\Windows\System32\cmd.exe
::       Arguments: /c "C:\duong-dan-portal\backup.bat"
::       Start in: C:\duong-dan-portal
::    5. Luu lai voi ten "CC Portal Backup Daily"
::
::  Phuc hoi backup:
::    - Dung app truoc (Ctrl+C hoac tat cua so start.bat)
::    - Sao chep file backup muon phuc hoi ra data\portal.db
::      vi du: copy backup\portal-20260518-0000.db data\portal.db
::    - Khoi dong lai app (start.bat)
:: ============================================================
setlocal
cd /d "%~dp0"

node portal\scripts\backup.js
if errorlevel 1 (
    echo.
    echo [LOI] Backup that bai. Kiem tra log phia tren.
    exit /b 1
)
