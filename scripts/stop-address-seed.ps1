param(
  [Parameter(Mandatory = $true)]
  [int[]] $Id
)

$ErrorActionPreference = "Stop"

foreach ($processId in $Id) {
  Stop-Process -Id $processId -Force
}
