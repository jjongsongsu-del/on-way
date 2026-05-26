# MVP 백엔드 API

## 1. 목적

M4는 홈, 시간표, 항로, 예보 화면에서 필요한 백엔드 API를 Mock 데이터 기반으로 먼저 완성하는 단계다.

현재 API는 `PUBLIC_API_MODE=mock` 기준으로 동작하며, 실제 공공데이터 API 연결은 같은 `PublicFerryApiClient` 계약을 유지한 채 교체한다.

## 2. 구현된 엔드포인트

```text
GET /v1/health
GET /v1/ports
GET /v1/routes
GET /v1/routes/search?departure=인천항&arrival=백령도
GET /v1/routes/:id
GET /v1/routes/:id/stops
GET /v1/schedules?departure=인천항&arrival=백령도&date=2026-05-26
GET /v1/status/today?departure=인천항&arrival=백령도
GET /v1/forecasts/tomorrow?departure=인천항&arrival=백령도
```

Swagger:

```text
GET /docs
```

## 3. 공통 성공 응답

```json
{
  "data": {},
  "meta": {
    "source": "mock-ferry-data",
    "cached": false,
    "fallback": false,
    "updatedAt": "2026-05-26T07:00:00.000Z"
  }
}
```

## 4. 공통 오류 응답

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route was not found",
    "userMessage": "요청한 항로를 찾을 수 없습니다."
  }
}
```

## 5. 앱 화면 매핑

| 화면 | API |
| --- | --- |
| 홈 | `/v1/ports`, `/v1/routes/search`, `/v1/status/today`, `/v1/forecasts/tomorrow` |
| 시간표 | `/v1/schedules` |
| 항로 | `/v1/routes/:id`, `/v1/routes/:id/stops` |
| 예보 | `/v1/forecasts/tomorrow` |
| 내 정보 | M6의 favorites/notification API에서 구현 |

## 6. 확인 명령

```powershell
corepack pnpm dev:api
```

또는 빌드 후 실행:

```powershell
corepack pnpm --filter @badagil/api build
node apps/api/dist/apps/api/src/main.js
```

