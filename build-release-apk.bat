@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "ANDROID_DIR=%ROOT_DIR%apps\mobile\android"
set "DIST_DIR=%ROOT_DIR%dist"
set "APK_SOURCE=%ANDROID_DIR%\app\build\outputs\apk\release\app-release.apk"
set "APK_TARGET=%DIST_DIR%\seomttok-oracle-release.apk"

if "%EXPO_PUBLIC_API_BASE_URL%"=="" (
  set "EXPO_PUBLIC_API_BASE_URL=http://131.186.26.5:8082/api/v1"
)

set "NODE_ENV=production"

echo [1/4] Building Seomttok release APK
echo API: %EXPO_PUBLIC_API_BASE_URL%

pushd "%ANDROID_DIR%"
call gradlew.bat --project-cache-dir "%ANDROID_DIR%\.gradle-cache" :app:assembleRelease
if errorlevel 1 (
  popd
  echo.
  echo APK build failed.
  exit /b 1
)
popd

echo [2/4] Preparing dist directory
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

echo [3/4] Copying APK
copy /Y "%APK_SOURCE%" "%APK_TARGET%" >nul
if errorlevel 1 (
  echo.
  echo Failed to copy APK to dist.
  exit /b 1
)

echo [4/4] Done
echo APK: %APK_TARGET%

endlocal
