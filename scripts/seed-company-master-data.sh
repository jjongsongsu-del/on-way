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

echo "[1/8] Checking containers"
compose ps

echo "[2/8] Running Prisma migrations"
run_api ./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "[3/8] Copying ref_data into API container"
if [[ -d ref_data ]]; then
  docker exec "${API_CONTAINER}" rm -rf /workspace/ref_data
  docker cp ref_data "${API_CONTAINER}:/workspace/ref_data"
else
  echo "ref_data directory was not found in ${APP_DIR}; skipping ref_data copy."
fi

echo "[4/8] Seeding island and region masters"
run_api node apps/api/prisma/seed-island-master.cjs
run_api node apps/api/prisma/seed-forecast-location-master.cjs
run_api node apps/api/prisma/seed-island-travel-region-master.cjs

echo "[5/8] Seeding recommended islands"
run_api node apps/api/prisma/seed-recommended-islands.cjs

echo "[6/8] Seeding travel recommendation assets if analysis JSON exists"
if docker exec "${API_CONTAINER}" find /workspace/ref_data -path "*/analysis/travel-data-inventory.json" -print -quit | grep -q . &&
   docker exec "${API_CONTAINER}" find /workspace/ref_data -path "*/analysis/travel-asset-candidates.json" -print -quit | grep -q .; then
  run_api node apps/api/prisma/seed-travel-recommendation-assets.cjs
else
  echo "Travel recommendation analysis JSON was not found; skipping travel asset seed."
fi

echo "[7/8] Importing vessel detail seed SQL if available"
if [[ -f vessel_detail_seed.sql ]]; then
  source "${ENV_FILE}"
  docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER:-badagil}" -d "${POSTGRES_DB:-badagil}" < vessel_detail_seed.sql
else
  echo "vessel_detail_seed.sql was not found; skipping vessel detail import."
fi

echo "[8/8] Summary"
run_api node apps/api/prisma/seed-travel-recommendation-assets.cjs --summary || true
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/islands?keyword=%EC%9A%B8%EB%A6%89%EB%8F%84"
echo
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/island-trips/recommended-islands?limit=3"
echo
curl -fsS "http://127.0.0.1:${SEA_LOAD_PORT:-8094}/api/v1/island-trips/recommendations?limit=3"
echo
