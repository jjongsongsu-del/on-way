# 바다길 개발 계획

## 0. 현재 상태

현재 워크스페이스에는 제품 기획 문서, API 레퍼런스 이미지, 디자인 레퍼런스가 있으며 앱/서버 코드는 아직 없다.

기준 문서:

- `바다길 개발계획.txt`
- `ref_api`
- `ref_design`

## 1. 개발 원칙

- 앱은 공공데이터 API를 직접 호출하지 않는다.
- 모든 외부 API 응답은 백엔드에서 앱 표준 JSON으로 정규화한다.
- 공공데이터 API 장애와 제한을 전제로 캐시와 마지막 정상 데이터를 저장한다.
- MVP에서는 계정 가입을 늦추고, 익명 사용자 디바이스 ID 기반 즐겨찾기/알림부터 시작한다.
- 예보는 확정 표현을 피하고 "가능성", "주의", "확인 필요" 중심으로 표시한다.

## 2. 1차 개발 마일스톤

### M1. 프로젝트 기반 세팅

목표:

- 모노레포 생성
- 모바일 앱, 백엔드 API, 공유 타입 패키지 구성
- 개발용 DB/Redis 실행 환경 구성

산출물:

- `apps/mobile`
- `apps/api`
- `packages/shared`
- `docker-compose.yml`
- 기본 README

권장 도구:

- pnpm workspace
- Expo
- NestJS
- Prisma
- PostgreSQL
- Redis

완료 기준:

- 모바일 앱 기본 화면 실행
- 백엔드 헬스체크 API 응답
- DB 마이그레이션 실행
- Swagger 문서 접근

### M2. 도메인 모델 및 API 계약

목표:

- DB 스키마 정의
- 앱용 API 응답 타입 정의
- 상태/예보 코드 표준화

산출물:

- Prisma schema
- OpenAPI 초안
- `packages/shared` 타입
- 상태 코드 매핑 문서

완료 기준:

- 항로, 기항지, 선박, 스케줄, 상태, 예보, 즐겨찾기 테이블 생성
- 앱에서 사용할 TypeScript 타입 공유

### M3. 공공데이터 연계 모듈

목표:

- KOMSA/인천항만공사 API 클라이언트 구조 구현
- XML/JSON 파서 구성
- 정규화 레이어 구현
- 캐시 정책 적용

산출물:

- API 클라이언트 인터페이스
- 실제 API 클라이언트
- Mock API 클라이언트
- 정규화 함수
- 캐시 키 규칙

완료 기준:

- API 키 없이도 Mock 데이터로 앱 개발 가능
- API 키 설정 시 실제 호출 가능
- 외부 API 장애 시 마지막 정상 데이터 반환 가능

### M4. MVP 백엔드 API

목표:

- 앱 홈, 시간표, 항로, 예보 화면에 필요한 API 구현

우선 구현 엔드포인트:

- `GET /v1/ports`
- `GET /v1/routes/search`
- `GET /v1/routes/:id/stops`
- `GET /v1/schedules`
- `GET /v1/status/today`
- `GET /v1/forecasts/tomorrow`

완료 기준:

- Swagger에서 MVP API 테스트 가능
- 공통 에러 포맷 적용
- 캐시, 마지막 갱신 시각 포함

### M5. 모바일 앱 MVP 화면

목표:

- 하단 탭 5개 구성
- 홈 중심 플로우 구현
- 시간표, 항로, 예보, 내 정보 기본 화면 구현

화면:

- 홈: 출발지/도착지 선택, 오늘 상태, 다음 출항, 내일 예보
- 시간표: 날짜별 운항 목록과 필터
- 항로: 기항지 순서, 선박, 소요시간, 지도 앱 연결
- 예보: 관심 항로 및 검색 항로의 내일 예보
- 내 정보: 즐겨찾기, 알림 설정

완료 기준:

- 사용자가 출발지/도착지를 선택해 핵심 정보를 확인할 수 있음
- API 로딩/오류/빈 상태 UI 구현
- 오늘 날짜 기준 동작 확인

### M6. 즐겨찾기 및 알림

목표:

- 관심 항로/선박 저장
- 출항 임박, 결항/통제/지연, 예보 갱신 알림 기반 구현

산출물:

- 즐겨찾기 API
- 알림 설정 API
- 상태 변경 감지 워커
- Expo Push 토큰 저장

완료 기준:

- 관심 항로 저장/삭제 가능
- 상태 변경 이벤트 생성 가능
- 테스트 푸시 발송 가능

## 3. 2차 개발 마일스톤

- 가족 공유 링크
- 예매 페이지 연결
- 섬 관광 정보
- 터미널 상세 정보
- 실시간 해상 교통지도
- AI 운항 요약

## 4. 모노레포 구조 제안

```text
sea-load/
  apps/
    mobile/
      app/
      src/
        components/
        features/
        hooks/
        lib/
        stores/
        styles/
    api/
      src/
        common/
        config/
        public-api/
        normalizer/
        routes/
        schedules/
        statuses/
        forecasts/
        favorites/
        notifications/
        users/
      prisma/
  packages/
    shared/
      src/
        types/
        constants/
        schemas/
  docs/
  ref_api/
  ref_design/
```

## 5. MVP 사용자 시나리오

### 시나리오 1. 오늘 배가 뜨는지 확인

1. 사용자가 홈에서 출발지와 도착지를 선택한다.
2. 앱은 오늘 운항상태와 다음 출항을 보여준다.
3. 통제/결항이면 사유와 마지막 갱신 시각을 보여준다.

### 시나리오 2. 내일 여행 가능성 확인

1. 사용자가 내일 예보를 확인한다.
2. 앱은 운항 가능, 주의, 불확실, 통제 가능성으로 단순화해 보여준다.
3. 예보 한계와 출발 전 재확인 안내를 함께 보여준다.

### 시나리오 3. 관심 항로 알림 받기

1. 사용자가 인천-백령 항로를 즐겨찾기한다.
2. 알림 설정에서 결항/통제 즉시, 출항 1시간 전, 예보 갱신을 켠다.
3. 서버 워커가 상태 변화를 감지하면 푸시를 발송한다.

## 6. 화면별 핵심 컴포넌트

홈:

- 출발지/도착지 선택 필드
- 오늘 상태 카드
- 다음 출항 리스트
- 내일 예보 요약
- 알림 받기 버튼

시간표:

- 날짜 선택
- 항로 요약 헤더
- 운항 목록
- 상태 필터

항로:

- 기항지 타임라인
- 운항 선박 목록
- 터미널/지도 앱 연결 버튼
- 즐겨찾기 버튼

예보:

- 예보 상태 배지
- 위험도 요약
- 상세 사유
- 마지막 갱신 시각

내 정보:

- 즐겨찾기 목록
- 알림 설정
- 앱 정보

## 7. API 응답 표준

성공 응답:

```json
{
  "data": {},
  "meta": {
    "source": "KOMSA",
    "cached": true,
    "updatedAt": "2026-05-26T05:00:00.000Z"
  }
}
```

오류 응답:

```json
{
  "error": {
    "code": "PUBLIC_API_UNAVAILABLE",
    "message": "운항 정보를 불러오지 못했습니다.",
    "userMessage": "현재 외부 운항정보가 지연되고 있습니다. 마지막 확인 정보를 보여드릴게요."
  }
}
```

## 8. 상태 코드 표준

- `NORMAL`: 정상운항
- `SCHEDULED`: 운항예정
- `DELAYED`: 지연
- `CANCELED`: 결항
- `CONTROLLED`: 통제
- `COMPLETED`: 운항완료
- `UNKNOWN`: 정보 없음

예보 코드:

- `AVAILABLE`: 운항 가능
- `CAUTION`: 주의
- `UNCERTAIN`: 불확실
- `CONTROL_POSSIBLE`: 통제 가능성
- `UNAVAILABLE`: 운항 어려움
- `UNKNOWN`: 정보 없음

## 9. 개발 순서 체크리스트

1. 모노레포와 기본 런타임 세팅
2. 백엔드 헬스체크, Swagger, Config 세팅
3. PostgreSQL/Redis Docker Compose 세팅
4. Prisma schema 및 초기 마이그레이션
5. 공유 타입 패키지 생성
6. 공공데이터 API 클라이언트 인터페이스 작성
7. Mock 데이터 기반 MVP API 구현
8. 모바일 하단 탭과 홈 화면 구현
9. 실제 API 연동 및 정규화
10. 캐시/장애 대응 적용
11. 즐겨찾기 구현
12. 알림 워커 구현
13. QA, 접근성, 빈 상태/오류 상태 점검
14. 배포 환경 구성

## 10. 즉시 다음 작업

다음 단계에서는 M1을 진행한다.

구체적으로는 다음 작업을 수행한다.

1. pnpm workspace 기반 모노레포 생성
2. Expo 모바일 앱 생성
3. NestJS API 앱 생성
4. Docker Compose로 PostgreSQL/Redis 구성
5. Prisma 초기 스키마 작성
6. 백엔드 헬스체크와 모바일 초기 탭 구조 구현

