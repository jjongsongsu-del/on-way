# 공공데이터 연계 모듈

## 1. 목적

M3의 목적은 외부 공공데이터 API를 앱이 직접 호출하지 않도록 백엔드에 연계 계층을 두는 것이다.

구성:

- `public-api`: KOMSA/인천항만공사 API 클라이언트와 Mock 클라이언트
- `normalizer`: 외부 API 상태값을 앱 표준 코드로 변환
- `cache`: TTL 캐시와 마지막 정상 데이터 fallback
- 도메인 read API: Mock 기반으로 M4 구현 전 프론트 개발 가능

## 2. 실행 모드

`.env`:

```text
PUBLIC_API_MODE=mock
KOMSA_SERVICE_KEY=
KOMSA_BASE_URL=
INCHEON_PORT_SERVICE_KEY=
INCHEON_PORT_BASE_URL=
```

현재 기본값은 `mock`이다. API 키와 실제 엔드포인트가 준비되기 전에도 앱/백엔드 개발이 가능하다.

## 3. 캐시 정책

| 데이터 | TTL |
| --- | --- |
| 항로 목록 | 24시간 |
| 기항지 순서 | 24시간 |
| 선박 목록 | 24시간 |
| 날짜별 스케줄 | 15분 |
| 오늘 운항상태 | 1분 |
| 내일 운항예보 | 45분 |

현재 M3에서는 인메모리 캐시를 사용한다. Redis는 M6 알림 워커와 함께 영속/분산 캐시로 확장한다.

## 4. Mock API 확인

API 서버 실행:

```powershell
corepack pnpm dev:api
```

확인 URL:

```text
GET http://127.0.0.1:4000/v1/routes
GET http://127.0.0.1:4000/v1/routes/search?departure=인천항&arrival=백령도
GET http://127.0.0.1:4000/v1/routes/route-incheon-baengnyeong/stops
GET http://127.0.0.1:4000/v1/schedules?departure=인천항&arrival=백령도&date=2026-05-26
GET http://127.0.0.1:4000/v1/status/today?departure=인천항&arrival=백령도
GET http://127.0.0.1:4000/v1/forecasts/tomorrow?departure=인천항&arrival=백령도
```

## 5. 실제 API 전환 기준

M4에서 실제 공공데이터 연계를 채울 때는 다음 순서로 진행한다.

1. API별 샘플 응답 확보
2. XML/JSON parser 테스트 작성
3. 원문 필드와 공유 타입 매핑표 작성
4. `KomsaApiClient`, `IncheonPortApiClient`에 엔드포인트별 메서드 추가
5. Mock과 실제 클라이언트가 동일한 `PublicFerryApiClient` 계약을 만족하는지 검증

