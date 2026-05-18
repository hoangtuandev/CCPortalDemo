@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0.."

echo.
echo  =========================================
echo    CC Portal -- Sinh chung chi SSL
echo  =========================================
echo.

:: ════════════════════════════════════════════════════════════════════════════
::  CAU HINH -- SUA TRUOC KHI CHAY
::
::  SERVER_IP    : IP cua server tren LAN (vd: 192.168.1.100)
::  SERVER_DOMAIN: Domain noi bo (vd: portal.local), de trong neu khong co
:: ════════════════════════════════════════════════════════════════════════════
set SERVER_IP=192.168.1.100
set SERVER_DOMAIN=portal.local
set ORG=CC Portal
:: ════════════════════════════════════════════════════════════════════════════

set DAYS_CA=3650
set DAYS_CERT=730

:: ── Tim lenh openssl ────────────────────────────────────────────────────────
set OPENSSL=openssl
where openssl >nul 2>&1
if errorlevel 1 (
    :: Thu tim trong Git for Windows
    if exist "C:\Program Files\Git\mingw64\bin\openssl.exe" (
        set OPENSSL=C:\Program Files\Git\mingw64\bin\openssl.exe
        echo [info] Dung OpenSSL tu Git for Windows.
    ) else if exist "C:\Program Files (x86)\Git\mingw64\bin\openssl.exe" (
        set OPENSSL=C:\Program Files (x86)\Git\mingw64\bin\openssl.exe
        echo [info] Dung OpenSSL tu Git for Windows (x86).
    ) else (
        echo [LOI] Khong tim thay OpenSSL.
        echo.
        echo  Cach khac phuc (chon 1):
        echo  A) Cai Git for Windows (da bao gom OpenSSL):
        echo     https://git-scm.com/download/win
        echo  B) Cai OpenSSL rieng roi them vao PATH:
        echo     https://slproweb.com/products/Win32OpenSSL.html  (Win64 Light^)
        echo.
        pause
        exit /b 1
    )
)

:: ── Tao thu muc cert ────────────────────────────────────────────────────────
if not exist cert mkdir cert

:: ── Root CA (chi tao 1 lan) ──────────────────────────────────────────────
if exist cert\ca.key (
    echo [skip] Root CA da ton tai -- giu nguyen ca.key + ca.crt.
    echo         ^(Xoa cert\ca.key neu muon cap lai CA tu dau^)
) else (
    echo [...] Tao Root CA ^(%DAYS_CA% ngay ~ 10 nam^)...
    "%OPENSSL%" genrsa -out cert\ca.key 4096
    if errorlevel 1 goto :error_ca_key

    "%OPENSSL%" req -new -x509 -days %DAYS_CA% ^
        -key cert\ca.key ^
        -out cert\ca.crt ^
        -subj "/CN=%ORG% Internal CA/O=%ORG%/C=VN"
    if errorlevel 1 goto :error_ca_cert

    echo [OK]  Root CA tao xong: cert\ca.crt + cert\ca.key
)

:: ── Server cert ─────────────────────────────────────────────────────────────
echo.
echo [...] Tao server cert ^(%DAYS_CERT% ngay ~ 2 nam^)...

:: SAN
set SAN=DNS:localhost,IP:127.0.0.1,IP:%SERVER_IP%
if not "%SERVER_DOMAIN%"=="" set SAN=%SAN%,DNS:%SERVER_DOMAIN%

:: Server key
"%OPENSSL%" genrsa -out cert\server.key 2048
if errorlevel 1 goto :error_srv_key

:: CSR
set CN=portal
if not "%SERVER_DOMAIN%"=="" set CN=%SERVER_DOMAIN%
"%OPENSSL%" req -new ^
    -key cert\server.key ^
    -out cert\server.csr ^
    -subj "/CN=%CN%/O=%ORG%/C=VN"
if errorlevel 1 goto :error_srv_csr

:: Extension file (SAN + key usage)
(
    echo subjectAltName=%SAN%
    echo keyUsage=digitalSignature,keyEncipherment
    echo extendedKeyUsage=serverAuth
) > cert\server-ext.cnf

:: Ky bang Root CA
"%OPENSSL%" x509 -req ^
    -days %DAYS_CERT% ^
    -in cert\server.csr ^
    -CA cert\ca.crt ^
    -CAkey cert\ca.key ^
    -CAcreateserial ^
    -out cert\server.crt ^
    -extfile cert\server-ext.cnf
if errorlevel 1 goto :error_srv_sign

:: Don dep
del cert\server.csr cert\server-ext.cnf >nul 2>&1

echo [OK]  Server cert tao xong: cert\server.crt + cert\server.key

:: ── Kiem tra ket qua ────────────────────────────────────────────────────────
echo.
echo [...] Xac nhan SAN:
"%OPENSSL%" x509 -in cert\server.crt -noout -ext subjectAltName
echo.
echo [...] Thoi han:
"%OPENSSL%" x509 -in cert\server.crt -noout -dates
echo.

echo  =========================================
echo    Sinh chung chi hoan tat!
echo  =========================================
echo.
echo  File da tao:
echo    cert\ca.key      -- Root CA key    ^(bao mat, khong chia se^)
echo    cert\ca.crt      -- Root CA cert   ^(cai len tung may client^)
echo    cert\server.key  -- Server key     ^(bao mat, khong chia se^)
echo    cert\server.crt  -- Server cert    ^(app tu dong doc^)
echo.
echo  SAN: %SAN%
echo.
echo  Cai Root CA len client (chay PowerShell voi quyen Admin^):
echo    Import-Certificate -FilePath cert\ca.crt -CertStoreLocation Cert:\LocalMachine\Root
echo  Hoac thu cong: certmgr.msc -^> Trusted Root CA -^> Import -^> chon cert\ca.crt
echo.
pause
exit /b 0

:: ── Xu ly loi ───────────────────────────────────────────────────────────────
:error_ca_key
echo [LOI] Khong the tao CA private key.
goto :cleanup_exit
:error_ca_cert
echo [LOI] Khong the tao CA certificate.
goto :cleanup_exit
:error_srv_key
echo [LOI] Khong the tao server private key.
goto :cleanup_exit
:error_srv_csr
echo [LOI] Khong the tao Certificate Signing Request.
goto :cleanup_exit
:error_srv_sign
echo [LOI] Khong the ky server certificate.
goto :cleanup_exit

:cleanup_exit
del cert\server.csr cert\server-ext.cnf >nul 2>&1
echo.
pause
exit /b 1
