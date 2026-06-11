param(
  [string]$Keyword = "",
  [int]$Limit = 0,
  [int]$DelayMs = 120,
  [switch]$NoFetchMissing
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$arguments = @(
  "--filter", "@badagil/api",
  "data:extract:travel-columns:pages"
)

if ($Keyword.Trim().Length -gt 0) {
  $arguments += @("--keyword", $Keyword.Trim())
}

if ($Limit -gt 0) {
  $arguments += @("--limit", [string]$Limit)
}

if ($DelayMs -gt 0) {
  $arguments += @("--delay-ms", [string]$DelayMs)
}

if ($NoFetchMissing) {
  $arguments += @("--fetch-missing", "false")
}

corepack pnpm @arguments
