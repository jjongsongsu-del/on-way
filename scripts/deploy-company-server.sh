#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/seaload/sea-load}"
APP_PORT="${APP_PORT:-8094}"
USE_REGISTRY="${USE_REGISTRY:-0}"
NO_CACHE="${NO_CACHE:-0}"
RUN_MASTER_SEED="${RUN_MASTER_SEED:-1}"

cd "${APP_DIR}"

COMPOSE_FILES=(-f docker-compose.prod.yml)
if [[ "${USE_REGISTRY}" == "1" ]]; then
  COMPOSE_FILES+=(-f docker-compose.registry.yml)
fi

echo "[1/8] Updating source"
git pull origin main

if [[ "${USE_REGISTRY}" == "1" ]]; then
  echo "[2/8] Pulling registry images"
  docker compose "${COMPOSE_FILES[@]}" --env-file .env.production pull
else
  echo "[2/8] Building images on server"
  if [[ "${NO_CACHE}" == "1" ]]; then
    docker compose "${COMPOSE_FILES[@]}" --env-file .env.production build --no-cache
  else
    docker compose "${COMPOSE_FILES[@]}" --env-file .env.production build
  fi
fi

echo "[3/8] Starting services"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production up -d

echo "[4/8] Running migrations"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production exec -T api ./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "[5/8] Seeding cruise data"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production exec -T api node apps/api/prisma/seed-cruise-data.cjs

echo "[6/8] Seeding island trip master data"
if [[ "${RUN_MASTER_SEED}" == "1" ]]; then
  APP_DIR="${APP_DIR}" COMPOSE_FILE="docker-compose.prod.yml" ENV_FILE=".env.production" SEA_LOAD_PORT="${APP_PORT}" ./scripts/seed-company-master-data.sh
else
  echo "RUN_MASTER_SEED is not 1; skipping island trip master data seed."
fi

echo "[7/8] Service status"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production ps

echo "[8/8] Health check"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/v1/health"
echo
echo "Done. Test URL: http://121.162.171.85:${APP_PORT}/"
