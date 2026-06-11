$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"

if (Test-Path $envPath) {
  Get-Content $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $index = $line.IndexOf("=")
    if ($index -le 0) {
      return
    }

    $key = $line.Substring(0, $index).Trim()
    $value = $line.Substring($index + 1).Trim().Trim('"')
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

Push-Location $repoRoot
try {
  node -e @'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(travel_region_id)::text AS travel_matched,
      COUNT(marine_region_id)::text AS marine_matched
    FROM address_master
  `);

  const byRegion = await prisma.$queryRawUnsafe(`
    SELECT travel_region_id, travel_region_name, COUNT(*)::text AS count
    FROM address_master
    WHERE travel_region_id IS NOT NULL
    GROUP BY travel_region_id, travel_region_name
    ORDER BY COUNT(*) DESC
    LIMIT 30
  `);

  console.log(JSON.stringify({ summary: rows[0], topTravelRegions: byRegion }, null, 2));
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
'@
}
finally {
  Pop-Location
}
