@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo  =========================================
echo    CC Portal -- Cai dat lan dau
echo  =========================================
echo.

:: ── 1. Kiem tra Node.js ─────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Node.js.
    echo       Tai ve tai: https://nodejs.org  ^(phien ban 18 tro len^)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -e "process.stdout.write(process.versions.node)"') do set NODE_VER=%%v
for /f "delims=." %%m in ("!NODE_VER!") do set NODE_MAJOR=%%m

if !NODE_MAJOR! LSS 18 (
    echo [LOI] Can Node.js phien ban 18 tro len. Hien tai: !NODE_VER!
    echo       Tai ve tai: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo [OK]  Node.js !NODE_VER! hop le.

:: ── 2. Tao thu muc can thiet ────────────────────────────────────────────────
if not exist data\   mkdir data
if not exist logs\   mkdir logs
if not exist backup\ mkdir backup
echo [OK]  Thu muc data\, logs\, backup\ san sang.

:: ── 3. Cai npm packages (production) ────────────────────────────────────────
echo.
echo [...]  Dang cai dat npm packages...
pushd portal
call npm install --production 2>&1
if errorlevel 1 (
    echo.
    echo [LOI] npm install that bai. Kiem tra ket noi mang hoac file package.json.
    popd
    pause
    exit /b 1
)
echo [OK]  npm packages da cai dat.

:: ── 4. Migration database ───────────────────────────────────────────────────
echo.
echo [...]  Dang chay migration database...
call npm run migrate 2>&1
if errorlevel 1 (
    echo.
    echo [LOI] Migration that bai. Xem loi phia tren de xu ly.
    popd
    pause
    exit /b 1
)

:: ── 5. Seed du lieu ban dau (idempotent) ─────────────────────────────────────
echo.
echo [...]  Dang khoi tao du lieu ban dau...
call npm run seed 2>&1
if errorlevel 1 (
    echo.
    echo [LOI] Seed that bai. Xem loi phia tren de xu ly.
    popd
    pause
    exit /b 1
)

popd

echo.
echo  =========================================
echo    Cai dat hoan tat!
echo  =========================================
echo.
echo    Buoc tiep theo:
echo    1. Luu lai password admin o phia tren.
echo    2. Chay start.bat de khoi dong Portal.
echo    3. Truy cap http://localhost:3000 de kiem tra.
echo.
pause
