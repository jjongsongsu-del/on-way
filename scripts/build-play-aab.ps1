param(
  [string]$KeystorePath = $env:SEOMTTOK_UPLOAD_STORE_FILE,
  [string]$KeyAlias = $env:SEOMTTOK_UPLOAD_KEY_ALIAS,
  [string]$StorePassword = $env:SEOMTTOK_UPLOAD_STORE_PASSWORD,
  [string]$KeyPassword = $env:SEOMTTOK_UPLOAD_KEY_PASSWORD
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$mobileAndroidDir = Join-Path $repoRoot "apps/mobile/android"

if (-not $KeystorePath) {
  throw "SEOMTTOK_UPLOAD_STORE_FILE or -KeystorePath is required."
}
if (-not (Test-Path -LiteralPath $KeystorePath)) {
  throw "Keystore file was not found: $KeystorePath"
}
if (-not $KeyAlias) {
  throw "SEOMTTOK_UPLOAD_KEY_ALIAS or -KeyAlias is required."
}
if (-not $StorePassword) {
  throw "SEOMTTOK_UPLOAD_STORE_PASSWORD or -StorePassword is required."
}
if (-not $KeyPassword) {
  throw "SEOMTTOK_UPLOAD_KEY_PASSWORD or -KeyPassword is required."
}

Push-Location $mobileAndroidDir
try {
  $env:SEOMTTOK_UPLOAD_STORE_FILE = $KeystorePath
  $env:SEOMTTOK_UPLOAD_KEY_ALIAS = $KeyAlias
  $env:SEOMTTOK_UPLOAD_STORE_PASSWORD = $StorePassword
  $env:SEOMTTOK_UPLOAD_KEY_PASSWORD = $KeyPassword

  .\gradlew.bat bundleRelease

  if ($LASTEXITCODE -ne 0) {
    throw "Gradle bundleRelease failed with exit code $LASTEXITCODE."
  }

  $bundlePath = Join-Path $mobileAndroidDir "app/build/outputs/bundle/release/app-release.aab"
  if (-not (Test-Path -LiteralPath $bundlePath)) {
    throw "AAB was not created at expected path: $bundlePath"
  }

  Write-Host ""
  Write-Host "Google Play upload bundle:"
  Write-Host $bundlePath
} finally {
  Pop-Location
}
