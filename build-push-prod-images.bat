@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "ROOT_DIR=%ROOT_DIR:~0,-1%"

if "%REGISTRY_IMAGE_PREFIX%"=="" (
  set "REGISTRY_IMAGE_PREFIX=ghcr.io/jjongsongsu-del"
)

if "%IMAGE_TAG%"=="" (
  set "IMAGE_TAG=latest"
)

if "%EXPO_PUBLIC_API_BASE_URL%"=="" (
  set "EXPO_PUBLIC_API_BASE_URL=/api/v1"
)

set "API_IMAGE=%REGISTRY_IMAGE_PREFIX%/sea-load-api:%IMAGE_TAG%"
set "WEB_IMAGE=%REGISTRY_IMAGE_PREFIX%/sea-load-web:%IMAGE_TAG%"

echo [1/5] Registry image prefix: %REGISTRY_IMAGE_PREFIX%
echo [2/5] Image tag: %IMAGE_TAG%
echo [3/5] Building API image: %API_IMAGE%
docker build -f "%ROOT_DIR%\Dockerfile.api" -t "%API_IMAGE%" "%ROOT_DIR%"
if errorlevel 1 (
  echo.
  echo API image build failed.
  exit /b 1
)

echo [4/5] Building Web image: %WEB_IMAGE%
docker build -f "%ROOT_DIR%\Dockerfile.web" --build-arg EXPO_PUBLIC_API_BASE_URL="%EXPO_PUBLIC_API_BASE_URL%" -t "%WEB_IMAGE%" "%ROOT_DIR%"
if errorlevel 1 (
  echo.
  echo Web image build failed.
  exit /b 1
)

echo [5/5] Pushing images
docker push "%API_IMAGE%"
if errorlevel 1 (
  echo.
  echo API image push failed. Run docker login first.
  exit /b 1
)

docker push "%WEB_IMAGE%"
if errorlevel 1 (
  echo.
  echo Web image push failed. Run docker login first.
  exit /b 1
)

echo.
echo Done.
echo API: %API_IMAGE%
echo Web: %WEB_IMAGE%

endlocal
