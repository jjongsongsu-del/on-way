# 섬똑 Registry 배포

오라클 클라우드 서버에서는 Docker 이미지를 빌드하지 않고, PC에서 빌드한 이미지를 pull해서 실행한다.

## 1. PC에서 이미지 빌드/푸시

GHCR 로그인이 먼저 필요하다.

```powershell
docker login ghcr.io -u jjongsongsu-del
```

기본 태그 `latest`로 빌드/푸시:

```powershell
C:\dev\sea-load\build-push-prod-images.bat
```

태그를 지정하려면:

```powershell
$env:IMAGE_TAG="2026-06-02"
C:\dev\sea-load\build-push-prod-images.bat
```

기본 이미지:

```text
ghcr.io/jjongsongsu-del/sea-load-api:<tag>
ghcr.io/jjongsongsu-del/sea-load-web:<tag>
```

## 2. 오라클 서버에서 pull/run

```bash
cd /home/opc/sea-load
git pull origin main
```

필요하면 `.env.production`에 이미지 정보를 추가한다.

```env
REGISTRY_IMAGE_PREFIX=ghcr.io/jjongsongsu-del
IMAGE_TAG=latest
```

GHCR private package라면 서버에서도 로그인한다.

```bash
docker login ghcr.io -u jjongsongsu-del
```

이미지를 pull하고 실행한다.

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.registry.yml --env-file .env.production pull
docker compose -f docker-compose.prod.yml -f docker-compose.registry.yml --env-file .env.production up -d
```

상태 확인:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.registry.yml --env-file .env.production ps
curl -i http://localhost:8082/api/v1/health
```

## 3. DB 마이그레이션

컨테이너 실행 후 필요 시:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.registry.yml --env-file .env.production exec api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
