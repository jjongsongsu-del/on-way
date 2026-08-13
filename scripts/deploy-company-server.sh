#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/sea-load}"
APP_PORT="${APP_PORT:-8093}"
USE_REGISTRY="${USE_REGISTRY:-0}"

cd "${APP_DIR}"

COMPOSE_FILES=(-f docker-compose.prod.yml)
if [[ "${USE_REGISTRY}" == "1" ]]; then
  COMPOSE_FILES+=(-f docker-compose.registry.yml)
fi

echo "[1/6] Updating source"
git pull origin main

if [[ "${USE_REGISTRY}" == "1" ]]; then
  echo "[2/6] Pulling registry images"
  docker compose "${COMPOSE_FILES[@]}" --env-file .env.production pull
else
  echo "[2/6] Building images on server"
  docker compose "${COMPOSE_FILES[@]}" --env-file .env.production build
fi

echo "[3/6] Starting services"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production up -d

echo "[4/6] Running migrations"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production exec -T api ./apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "[5/6] Service status"
docker compose "${COMPOSE_FILES[@]}" --env-file .env.production ps

echo "[6/6] Health check"
curl -fsS "http://127.0.0.1:${APP_PORT}/api/v1/health"
echo
echo "Done. Test URL: http://121.162.171.85:${APP_PORT}/"
