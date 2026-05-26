# 바다길

여객선 실시간 운항, 시간표, 내일 운항예보, 항로, 알림 중심 앱입니다.

## Workspace

- `apps/mobile`: Expo React Native app
- `apps/api`: NestJS backend API
- `packages/shared`: shared TypeScript types/constants/schemas
- `docs`: architecture and development plan

## Prerequisites

- Node.js 24+
- Corepack
- Docker Desktop

## Setup

```powershell
corepack pnpm install
Copy-Item .env.example .env
docker compose up -d
corepack pnpm db:generate
corepack pnpm dev:api
```

Mobile app:

```powershell
corepack pnpm dev:mobile
```

API health check:

```text
GET http://localhost:4000/health
```

