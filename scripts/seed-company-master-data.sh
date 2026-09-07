#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/seaload/sea-load}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
API_CONTAINER="${API_CONTAINER:-badagil-api}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-badagil-postgres-prod}"

cd "${APP_DIR}"

compose() {
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
}

run_api() {
  compose exec -T api "$@"
}

read_env_value() {
  local key="$1"

  if [[ ! -f "${ENV_FILE}" ]]; then
    return 0
  fi

  grep -E "^[[:space:]]*${key}[[:space:]]*=" "${ENV_FILE}" |
    tail -n 1 |
    sed -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//; s/^[\"']//; s/[\"']$//"
}

echo "[1/9] Checking containers"
compose ps

echo "[2/9] Running Prisma migrations"
run_api ./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "[3/9] Copying ref_data into API container"
if [[ -d ref_data ]]; then
  docker exec "${API_CONTAINER}" rm -rf /workspace/ref_data
  docker cp ref_data "${API_CONTAINER}:/workspace/ref_data"
else
  echo "ref_data directory was not found in ${APP_DIR}; skipping ref_data copy."
fi

echo "[4/9] Seeding island and region masters"
run_api node apps/api/prisma/seed-island-master.cjs
run_api node apps/api/prisma/seed-forecast-location-master.cjs
run_api node apps/api/prisma/seed-island-travel-region-master.cjs

echo "[5/9] Seeding recommended islands"
run_api node apps/api/prisma/seed-recommended-islands.cjs

echo "[6/9] Seeding travel recommendation assets if analysis JSON exists"
if docker exec "${API_CONTAINER}" find /workspace/ref_data -path "*/analysis/travel-data-inventory.json" -print -quit | grep -q . &&
   docker exec "${API_CONTAINER}" find /workspace/ref_data -path "*/analysis/travel-asset-candidates.json" -print -quit | grep -q .; then
  run_api node apps/api/prisma/seed-travel-recommendation-assets.cjs
else
  echo "Travel recommendation analysis JSON was not found; skipping travel asset seed."
fi

echo "[7/9] Importing vessel detail seed SQL if available"
if [[ -f vessel_detail_seed.sql ]]; then
  POSTGRES_USER_VALUE="${POSTGRES_USER:-$(read_env_value POSTGRES_USER)}"
  POSTGRES_DB_VALUE="${POSTGRES_DB:-$(read_env_value POSTGRES_DB)}"
  docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER_VALUE:-badagil}" -d "${POSTGRES_DB_VALUE:-badagil}" < vessel_detail_seed.sql
else
  echo "vessel_detail_seed.sql was not found; skipping vessel detail import."
fi

echo "[8/9] Travel recommendation summary"
run_api node apps/api/prisma/seed-travel-recommendation-assets.cjs --summary || true

echo "[9/9] Island trip data diagnostics"
run_api node apps/api/prisma/diagnose-island-trip-data.cjs || true
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/islands?keyword=%EC%9A%B8%EB%A6%89%EB%8F%84"
echo
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/island-trips/recommended-islands?limit=3"
echo
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/island-trips/recommendations?limit=3"
echo
