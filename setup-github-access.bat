@echo off
setlocal EnableExtensions
title Code Garden - GitHub connection setup
cd /d "%~dp0"

echo ============================================================
echo  Code Garden - GitHub connection setup
echo ============================================================
echo.

set "GH_EXE="
for /f "delims=" %%G in ('where gh.exe 2^>nul') do if not defined GH_EXE set "GH_EXE=%%G"
if not defined GH_EXE if exist "C:\Program Files\GitHub CLI\gh.exe" set "GH_EXE=C:\Program Files\GitHub CLI\gh.exe"

set "GIT_EXE="
for /f "delims=" %%G in ('where git.exe 2^>nul') do if not defined GIT_EXE set "GIT_EXE=%%G"
if not defined GIT_EXE for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do if exist "%%~fD\resources\app\git\cmd\git.exe" set "GIT_EXE=%%~fD\resources\app\git\cmd\git.exe"

if not defined GH_EXE (
  echo [ERROR] GitHub CLI ^(gh.exe^) was not found.
  echo Install it with: winget install --id GitHub.cli
  goto :failed
)

if not defined GIT_EXE (
  echo [ERROR] Git ^(git.exe^) was not found.
  echo Install Git for Windows or GitHub Desktop.
  goto :failed
)

for %%D in ("%GIT_EXE%") do set "PATH=%%~dpD;%PATH%"

echo [1/5] GitHub CLI: %GH_EXE%
echo [2/5] Git:        %GIT_EXE%
echo.

"%GH_EXE%" auth status -h github.com >nul 2>&1
if errorlevel 1 (
  echo [3/5] GitHub login is required. A browser will open.
  "%GH_EXE%" auth login -h github.com -p https --web --insecure-storage
  if errorlevel 1 goto :failed
) else (
  echo [3/5] GitHub login is already active.
)

echo [4/5] Configuring Git to use GitHub CLI credentials...
"%GH_EXE%" auth setup-git
if errorlevel 1 goto :failed

rem Use OpenSSL for this repository. This avoids Windows Schannel credential
rem errors that can occur when Git is launched from an isolated Codex process.
"%GIT_EXE%" config --local http.sslBackend openssl
if errorlevel 1 goto :failed

echo [5/5] Testing access to the configured origin...
for /f "delims=" %%R in ('"%GIT_EXE%" remote get-url origin 2^>nul') do set "ORIGIN_URL=%%R"
if not defined ORIGIN_URL (
  echo [ERROR] No origin remote is configured in this repository.
  goto :failed
)

echo Origin: %ORIGIN_URL%
"%GIT_EXE%" ls-remote origin HEAD >nul
if errorlevel 1 goto :failed

echo.
echo ============================================================
echo  SUCCESS: GitHub connection is ready.
echo  Codex can now commit, push, and create pull requests.
echo ============================================================
echo.
pause
exit /b 0

:failed
echo.
echo ============================================================
echo  FAILED: GitHub connection setup did not finish.
echo  Check the error above and run this file again.
echo ============================================================
echo.
pause
exit /b 1
