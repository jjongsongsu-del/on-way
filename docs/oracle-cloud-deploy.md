# Oracle Cloud Deployment

섬똑 운영 배포는 외부 포트 하나만 열고 Nginx가 웹과 API를 나눠주는 구조를 기본으로 한다.

## Endpoint

- Web: `http://131.186.26.5:8082/`
- API: `http://131.186.26.5:8082/api/v1/health`
- Swagger: `http://131.186.26.5:8082/api/docs`

## Server Setup

```bash
git clone https://github.com/jjongsongsu-del/on-way.git sea-load
cd sea-load
cp .env.production.example .env.production
```

`.env.production`에는 실제 공공데이터 인증키와 DB 비밀번호를 입력한다.

## Run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

DB 마이그레이션은 API 컨테이너가 뜬 뒤 실행한다.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

## Oracle Cloud Firewall

Oracle Cloud 보안 목록 또는 NSG 인바운드 규칙에서 TCP `8082`만 추가로 허용한다.

Ubuntu 방화벽을 사용 중이면 서버에서도 포트를 연다.

```bash
sudo ufw allow 8082/tcp
```

## Update

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production exec api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```
