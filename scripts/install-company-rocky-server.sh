#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-seaload}"
APP_DIR="${APP_DIR:-/home/seaload/sea-load}"
APP_PORT="${APP_PORT:-8093}"
APP_DOMAIN="${APP_DOMAIN:-seaload.aodata.co.kr}"
GIT_REPO="${GIT_REPO:-https://github.com/jjongsongsu-del/on-way.git}"
REGISTRY_IMAGE_PREFIX="${REGISTRY_IMAGE_PREFIX:-ghcr.io/jjongsongsu-del}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root or with sudo."
  exit 1
fi

echo "[1/8] Installing base packages"
dnf -y install git curl ca-certificates dnf-plugins-core firewalld

if ! command -v docker >/dev/null 2>&1; then
  echo "[2/8] Installing Docker Engine"
  dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "[2/8] Docker already installed"
fi

echo "[3/8] Enabling services"
systemctl enable --now docker
systemctl enable --now firewalld

echo "[4/8] Creating app user: ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${APP_USER}"
fi
usermod -aG docker "${APP_USER}"

echo "[5/8] Opening firewall port: ${APP_PORT}/tcp"
firewall-cmd --permanent --add-port="${APP_PORT}/tcp"
firewall-cmd --reload

echo "[6/8] Preparing app directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"
chown "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "[7/8] Cloning or updating repository"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  sudo -u "${APP_USER}" git clone "${GIT_REPO}" "${APP_DIR}"
else
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull origin main
fi

echo "[8/8] Writing ${APP_DIR}/.env.production if missing"
if [[ ! -f "${APP_DIR}/.env.production" ]]; then
  cat > "${APP_DIR}/.env.production" <<ENV
SEA_LOAD_PORT=${APP_PORT}
EXPO_PUBLIC_API_BASE_URL=/api/v1

POSTGRES_USER=badagil
POSTGRES_PASSWORD=change-me
POSTGRES_DB=badagil

PUBLIC_API_MODE=real
DATA_GO_KR_SERVICE_KEY=
KOMSA_SERVICE_KEY=
INCHEON_PORT_SERVICE_KEY=
VWORLD_API_KEY=
TOURISM_SERVICE_KEY=
WEATHER_SERVICE_KEY=
KHOA_SERVICE_KEY=
ADMIN_SYNC_TOKEN=

REGISTRY_IMAGE_PREFIX=${REGISTRY_IMAGE_PREFIX}
IMAGE_TAG=${IMAGE_TAG}
APP_DOMAIN=${APP_DOMAIN}
ENV
  chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env.production"
  chmod 600 "${APP_DIR}/.env.production"
fi

cat <<NEXT

Install complete.

Next steps:
  1. Edit secrets:
     sudo -u ${APP_USER} vi ${APP_DIR}/.env.production

  2. If GHCR images are private, login:
     sudo -u ${APP_USER} docker login ghcr.io -u jjongsongsu-del

  3. Deploy:
     sudo -u ${APP_USER} ${APP_DIR}/scripts/deploy-company-server.sh

  4. Test:
     curl -i http://127.0.0.1:${APP_PORT}/api/v1/health
     curl -i http://${APP_DOMAIN}:${APP_PORT}/api/v1/health
NEXT
