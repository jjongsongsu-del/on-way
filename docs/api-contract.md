# 바다길 API 계약

## 1. 공통 원칙

- 모바일 앱은 외부 공공데이터 API를 직접 호출하지 않는다.
- 모든 응답은 `data`와 `meta`를 포함한다.
- 외부 API 장애 시 가능한 경우 마지막 정상 데이터를 `fallback: true`로 반환한다.
- 날짜는 `YYYY-MM-DD`, 시각은 `HH:mm`, 타임스탬프는 ISO 8601 문자열을 사용한다.
- 예보는 확정 표현이 아니라 가능성 중심으로 표시한다.

## 2. 공통 응답

성공:

```json
{
  "data": {},
  "meta": {
    "source": "KOMSA",
    "cached": true,
    "updatedAt": "2026-05-26T06:00:00.000Z",
    "fallback": false,
    "requestId": "req_01JZ0000000000000000000000"
  }
}
```

오류:

```json
{
  "error": {
    "code": "PUBLIC_API_UNAVAILABLE",
    "message": "운항 정보를 불러오지 못했습니다.",
    "userMessage": "현재 외부 운항정보가 지연되고 있습니다. 마지막 확인 정보를 보여드릴게요."
  }
}
```

## 3. MVP 엔드포인트

| Method | Path | 설명 | M단계 |
| --- | --- | --- | --- |
| GET | `/v1/ports` | 기항지/항구 검색 후보 | M4 |
| GET | `/v1/routes` | 항로 목록 | M4 |
| GET | `/v1/routes/search?departure=&arrival=` | 출발지-도착지 기반 항로 검색 | M4 |
| GET | `/v1/routes/:id` | 항로 상세 | M4 |
| GET | `/v1/routes/:id/stops` | 기항지 순서 | M4 |
| GET | `/v1/schedules?departure=&arrival=&date=` | 날짜별 운항 스케줄 | M4 |
| GET | `/v1/status/today?departure=&arrival=` | 오늘 운항상태 | M4 |
| GET | `/v1/forecasts/tomorrow?departure=&arrival=` | 내일 운항예보 | M4 |
| GET | `/v1/favorites?userId=` | 즐겨찾기 목록 | M6 |
| POST | `/v1/favorites` | 즐겨찾기 저장 | M6 |
| DELETE | `/v1/favorites/:id` | 즐겨찾기 삭제 | M6 |
| GET | `/v1/notification-rules?userId=` | 알림 설정 조회 | M6 |
| PATCH | `/v1/notification-rules/:id` | 알림 설정 변경 | M6 |
| POST | `/v1/push-tokens` | 푸시 토큰 등록 | M6 |

## 4. 쿼리 계약

### 항로 검색

```text
GET /v1/routes/search?departure=인천항&arrival=백령도
```

응답 `data`:

```json
[
  {
    "id": "route_1",
    "departurePortName": "인천항",
    "arrivalPortName": "백령도",
    "operationRouteName": "인천-백령",
    "licenseRouteName": "인천-백령",
    "provider": "KOMSA"
  }
]
```

### 날짜별 스케줄

```text
GET /v1/schedules?departure=인천항&arrival=백령도&date=2026-05-26
```

응답 `data`:

```json
[
  {
    "id": "schedule_1",
    "sailingDate": "2026-05-26",
    "departureTime": "08:30",
    "departurePortName": "인천항",
    "arrivalPortName": "백령도",
    "routeId": "route_1",
    "vesselId": "vessel_1",
    "vesselName": "하모니플라워호",
    "status": "NORMAL",
    "controlReason": null,
    "passengerCapacity": 500
  }
]
```

### 오늘 운항상태

```text
GET /v1/status/today?departure=인천항&arrival=백령도
```

응답 `data`:

```json
{
  "route": {
    "id": "route_1",
    "departurePortName": "인천항",
    "arrivalPortName": "백령도",
    "operationRouteName": "인천-백령",
    "licenseRouteName": "인천-백령",
    "provider": "KOMSA"
  },
  "status": "NORMAL",
  "nextDeparture": {
    "id": "schedule_1",
    "sailingDate": "2026-05-26",
    "departureTime": "08:30",
    "departurePortName": "인천항",
    "arrivalPortName": "백령도",
    "routeId": "route_1",
    "vesselId": "vessel_1",
    "vesselName": "하모니플라워호",
    "status": "NORMAL",
    "controlReason": null,
    "passengerCapacity": 500
  },
  "updatedAt": "2026-05-26T06:00:00.000Z"
}
```

### 내일 운항예보

```text
GET /v1/forecasts/tomorrow?departure=인천항&arrival=백령도
```

응답 `data`:

```json
{
  "route": {
    "id": "route_1",
    "departurePortName": "인천항",
    "arrivalPortName": "백령도",
    "operationRouteName": "인천-백령",
    "licenseRouteName": "인천-백령",
    "provider": "KOMSA"
  },
  "status": "CAUTION",
  "reason": "기상 영향 가능성",
  "weatherSummary": "풍랑 또는 시정 악화 가능성",
  "riskLevel": "MEDIUM",
  "updatedAt": "2026-05-26T06:00:00.000Z"
}
```

## 5. 즐겨찾기/알림 계약

즐겨찾기 생성:

```json
{
  "userId": "device_user_1",
  "favoriteType": "ROUTE",
  "targetId": "route_1",
  "notificationEnabled": true
}
```

알림 설정 변경:

```json
{
  "notifyStatusChange": true,
  "notifyDepartureMinutesBefore": 60,
  "notifyForecastUpdate": true
}
```

푸시 토큰 등록:

```json
{
  "deviceId": "device_abc",
  "platform": "ANDROID",
  "token": "ExponentPushToken[...]",
  "provider": "EXPO"
}
```

