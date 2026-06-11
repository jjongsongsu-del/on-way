$ErrorActionPreference = "Stop"

Get-Process node -ErrorAction SilentlyContinue |
  Select-Object Id, ProcessName, CPU, StartTime, Path |
  Format-Table -AutoSize
