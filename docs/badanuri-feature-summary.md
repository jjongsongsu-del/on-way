# 섬똑 구현 기능 정리

작성일: 2026-06-01  
프로젝트명: 섬똑  
저장소: `jjongsongsu-del/on-way`

## 1. 서비스 개요

섬똑은 여객선 운항 정보, 항로, 해양 예보, 섬 여행 정보를 한 흐름으로 연결하는 섬 여행 지원 앱이다.

핵심 방향은 단순 관광지 추천이 아니라, 실제 배편과 해양 안전 정보를 기준으로 사용자가 오늘 갈 수 있는 섬, 안전하게 다녀올 수 있는 일정, 여행 목적에 맞는 섬 정보를 확인하도록 돕는 것이다.

## 2. 전체 구조

```text
apps/mobile     Expo React Native 앱
apps/api        NestJS API 서버
packages/shared 공통 타입, 상수, 스키마
docs            설계/운영/기능 문서
docker-compose.prod.yml 운영 배포 구성
```

### 기술 스택

- Mobile: Expo, React Native, Expo Router, TanStack Query
- API: NestJS, Prisma, Swagger
- DB: PostgreSQL
- Cache/Infra: Redis, Docker Compose
- 운영 프록시: Nginx
- 지도/공공 API: VWorld, data.go.kr, 한국관광공사, 해양/기상 API

## 3. 앱 메뉴 구조

현재 하단 탭 기준 주요 메뉴는 다음과 같다.

| 메뉴 | 주요 목적 |
| --- | --- |
| 섬똑 | 개인화 홈, 관심 항로/섬 요약, 추천 섬여행 사진 |
| 시간표 | 여객선 운항 후보, 상세 시간표, 일정 검색 |
| 섬여행 | 배편 기준 섬 여행 추천, 섬 상세, 목적별 추천 |
| 섬지도 | VWorld 기반 섬 지도, 도서정보 조회 |
| 예보 | 기상/해양 예보, 조석, 특보, 수온, 염분 |
| 내정보 | 관심 알림과 개인화 기준 관리 |

`routes` 화면은 현재 하단 탭에서는 숨기고, 시간표/섬지도/연계 액션에서 활용하는 보조 화면으로 구성되어 있다.

## 4. 섬똑 홈

### 구현 기능

- 최근 선택한 섬 또는 추천 섬 기준 홈 개인화
- 즐겨찾기/최근 조회 항로 기반 추천 항로 표시
- 오늘 내 항로 카드
  - 출발지/도착지
  - 다음 배 시간
  - 운항상태
  - 예보 위험도
- 관심 알림 카드
  - 관심 항로 등록 유도
  - 예보 위험 상승, 결항/통제 등 관심 조건 요약
- 추천 섬여행 사진
  - 최근 조회/선택 섬 우선
  - 없으면 추천 섬 사진 사용
  - 사진 상세는 섬여행 섬상세로 연결
- 홈에서 시간표, 예보, 섬여행 상세로 자연스럽게 이동

### 관련 파일

- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/src/state/app-selection-context.ts`
- `apps/mobile/src/state/interest-alerts.ts`

## 5. 시간표

### 검색 기능

- 날짜 선택
- 출발지/도착지 선택
- 출발지/도착지는 운항노선 API 기준으로 조회
- 가능지역만 보기
  - 출발지가 선택되어 있으면 가능한 도착지만 필터
  - 도착지가 선택되어 있으면 가능한 출발지만 필터
- 선박명 검색
- 검색 조건 전체 초기화
- 후보 1건 자동 선택
- 여러 후보 중 정상 운항 후보 추천 표시
- 자동 선택 안내 표시

### 즐겨찾기/최근조회

- 검색 영역 위에 빠른조회 배치
- 접기/펼치기 명시
- 즐겨찾기 이름 직접 지정
- 기본 검색일 지정
- 즐겨찾기 삭제/이름 변경/순서 변경
- 최근조회 일시 표시
- 즐겨찾기/최근조회 선택 시 빠른조회 접힘, 운항 후보로 포커스 이동
- 항목이 많아도 화면 밖으로 밀리지 않도록 줄바꿈/그리드형 배치

### 운항 후보/상세

- 운항 후보 선택
- 배명 클릭 시 DB 기반 여객선 상세 모달 표시
- 선박 이미지 표시
- 상세 정보 행 구성 개선
  - 선형/선종
  - 항해구역/여객정원
  - 항로명/선사
  - 총톤수/장폭심도
- 후보 하단 액션
  - 이 항로 즐겨찾기
  - 왕복 보기
  - 일정 검색으로 보기

### 운항 일정 검색

- 기존 주간 운항 일정 기능을 `운항 일정 검색`으로 변경
- 시작일/종료일 한 줄 배치
- 출발지 기준 또는 도착지 기준 선택
- 항구명 기준으로 해당 항구에서 출발/도착하는 모든 일정 조회

### 예보 연계

- 시간표 검색 결과에서 운항 후보 선택 시 도착 섬/항로 기준 예보 조회
- 출항 전후 예보 상태를 후보 상세 흐름에 연결

### 관련 파일

- `apps/mobile/app/(tabs)/schedule.tsx`
- `apps/mobile/src/api/schedules.ts`
- `apps/mobile/src/api/routes.ts`
- `apps/mobile/src/api/vessels.ts`

## 6. 항로/실시간 교통

### 구현 기능

- 실시간 교통정보 조회 API 연계
- 현재 운항 중인 선박 교통정보 표시
- 결과 선택 시 상세 모달 표시
- 현재 하단 메뉴에서는 숨김 처리하고, 시간표/연계 화면에서 보조 기능으로 활용

### 관련 파일

- `apps/mobile/app/(tabs)/routes.tsx`
- `apps/api/src/routes/routes.controller.ts`
- `apps/api/src/routes/routes.service.ts`

## 7. 섬여행

### 화면 구조

섬여행은 한 화면에 모든 기능을 펼치는 방식에서, 상단 메뉴를 선택하면 해당 섹션 중심으로 보여주는 구조로 개선했다.

현재 섬여행 메뉴:

- 지금 갈 수 있는 섬
- 여행 유형 선택
- 섬 상세
- 추천 코스
- 저장한 여행

초기 화면은 `지금 갈 수 있는 섬`이다.

### 지금 갈 수 있는 섬

- 오늘 운항하는 배편 기준으로 갈 수 있는 섬 추천
- 출발항 기준 후보 표시
- 운항 후보와 섬 정보를 함께 확인
- 추천 문맥은 관광지가 아니라 배편 중심으로 구성

### 여행 유형 선택

지원 유형:

- 당일치기
- 1박 2일
- 캠핑
- 차박
- 가족여행
- 낚시·레저
- 조용한 여행

유형별로 다음 정보를 조합한다.

- 운항 가능성
- 숙박/캠핑/식당/관광지 데이터
- 편의시설
- 안전 체크 포인트
- 추천 이유
- 목적별 체크리스트

### 섬 상세

섬 상세 탭 구성:

- 기본정보
- 배편
- 관광지
- 캠핑·차박
- 편의시설
- 안전정보

구현 기능:

- 다른 섬 검색
- 섬 선택 시 상세 데이터 갱신
- 배편, 관광, 캠핑, 숙박, 식당, 갯벌, 안전, 사진 통합 표시
- 각 API 상태를 화면에 표시
  - 정상
  - 데이터 없음
  - API 실패
- 사진 모달
  - 관광사진 목록
  - 선택 사진 크게 보기
  - 사진이 없으면 안내 문구
  - API 실패 시 실패 메시지
- 섬상세에서 예보 화면으로 이동해 해당 섬 기준 예보 확인

### 통합검색

- 섬여행 관련 통합검색 제공
- 검색 대상
  - 섬
  - 관광지
  - 식당
  - 숙박/펜션
  - 캠핑/차박
  - 갯벌
  - 안전/여행지수
  - 사진
- 여러 API 호출 중 진행 상태 표시
- 결과 그룹은 가로 스크롤 대신 한 화면에서 그룹별로 표시
- 상세는 모달이 아니라 아래로 펼쳐지는 아코디언 형태
- 다른 결과 선택 시 기존 상세 접힘

### 즐겨찾기/최근검색

- 시간표와 유사한 빠른조회 UI 적용
- 즐겨찾기
- 최근 검색어
- 최근 선택 섬
- 접기/펼치기 구조

### 추천 코스/저장한 여행

- 배 시간표 기반 추천 코스 개념 반영
- 저장한 여행 목록 영역 제공
- 실제 조회 결과에서 저장 후 다시 볼 수 있는 구조로 확장 가능

### 관련 파일

- `apps/mobile/app/(tabs)/island-trip.tsx`
- `apps/mobile/src/api/island-trips.ts`
- `apps/api/src/island-trips/island-trips.controller.ts`
- `apps/api/src/island-trips/island-trips.service.ts`

## 8. 섬지도

### 구현 기능

- VWorld 기반 도서정보 조회
- 섬 검색
- WFS bbox 기반 마커 조회
- WMS 레이어 연동
- 지도 확대/축소 또는 권역 이동
- 지도 영역과 목록 연계
- 섬 선택 시 섬 상세/여행 정보로 연결 가능한 구조
- 네이티브 지도 컴포넌트와 웹 미리보기 대응

### 관련 파일

- `apps/mobile/app/(tabs)/islands.tsx`
- `apps/mobile/src/components/VWorldNativeMap.tsx`
- `apps/mobile/src/components/VWorldNativeMap.android.tsx`
- `apps/api/src/islands/islands.controller.ts`
- `apps/api/src/islands/islands.service.ts`

## 9. 예보

### 구현 기능

- 조회 권역 선택
- 권역 선택 시 연안 풍속/파고 영역으로 포커스 이동
- 섬/항구명 기준 가장 가까운 예보 권역 매핑
- 기상 격자, 조위관측소, 염분 격자 매핑 테이블 확장
- 통합 예보 요약
- API 실패 UX 제공
- 시간표/섬상세와 연계

### 연계 데이터

- 단기예보
- 기상특보
- 조석예보
- 수온
- 염분
- 내일 운항 예보

### 화면 구성

- 위험도 요약
- 연안 풍속/파고
- 단기예보
- 기상특보
- 조석
- 수온
- 염분
- API 상태 표시

### 관련 파일

- `apps/mobile/app/(tabs)/forecast.tsx`
- `apps/mobile/src/api/forecasts.ts`
- `apps/api/src/forecasts/forecasts.controller.ts`
- `apps/api/src/forecasts/forecasts.service.ts`
- `apps/api/src/forecasts/marine-forecast-location-map.ts`

## 10. 내정보

### 구현 기능

- 관심 알림 관리 안내
- 즐겨찾기 항로 기반 알림 정책 설명
- 출항 전 확인
- 결항/통제 우선
- 예보 위험 상승
- 즐겨찾기 우선순위 반영

### 관련 파일

- `apps/mobile/app/(tabs)/profile.tsx`
- `apps/mobile/src/state/interest-alerts.ts`

## 11. 여객선 상세 데이터

### 수집/저장 구조

- KOMSA 여객선 상세 페이지 수집
- 관리자 수집 명령 실행 시 DB 적재
- 사진 및 상세 데이터 저장
- 시간표 후보에서 배명 클릭 시 DB 상세 조회

### 상세 표시 항목

- 선박명
- 선박 이미지
- 선형/선종
- 항해구역/여객정원
- 항로명/선사
- 총톤수/장폭심도
- 최고속도/순항속도
- 기관 정보
- 원본 출처 URL
- 수집일시

### 관련 API

- `GET /v1/vessels/detail?name=...`
- `POST /v1/admin/vessels/sync`

### 관련 파일

- `apps/api/src/vessels/*`
- `apps/api/src/admin/admin-vessels.controller.ts`
- `apps/mobile/src/api/vessels.ts`

## 12. 현재 연계된 주요 공공 API

### 여객선/운항

- 인천항만공사 여객터미널 실시간 운항정보 조회 서비스
- 한국해양교통안전공단 여객선 운항상태 정보
- 한국해양교통안전공단 운항 스케줄 정보
- 한국해양교통안전공단 운항항로 정보
- 한국해양교통안전공단 내일의 운항예보
- 한국해양교통안전공단 실시간 교통정보 조회
- 한국해양교통안전공단 내일의 운항예보 상세
- 한국해양교통안전공단 운항노선 정보

### 섬/지도

- VWorld 도서정보
- VWorld WFS
- VWorld WMS
- VWorld WMTS/base tile

### 섬여행/관광

- 한국관광공사 국문 관광정보 서비스
- 한국관광공사 관광사진 정보
- 한국관광공사 고캠핑 정보 조회서비스
- 한국문화정보원 전국 문화 여가 활동 시설 캠핑 데이터
- 행정안전부 문화 일반야영장업 조회서비스
- 행정안전부 문화 숙박업 조회서비스
- 행정안전부 문화 관광펜션업 조회서비스
- 행정안전부 식품 관광식당 조회서비스
- 해양수산부 갯벌 정보 제공 서비스
- 해양수산부 국립해양조사원 바다여행지수 조회
- 충청남도 보령시 섬사진 API

### 예보/해양

- 기상청 단기예보
- 기상청 기상특보
- 국립해양조사원 조석예보
- 수온 조회
- 염분 조회

## 13. 백엔드 API 구조

전역 prefix는 `/v1`이다.

| 영역 | 엔드포인트 |
| --- | --- |
| Health | `GET /v1/health` |
| 시간표 | `GET /v1/schedules`, `GET /v1/schedules/candidates`, `GET /v1/schedules/weekly` |
| 항로 | `GET /v1/routes`, `GET /v1/routes/options`, `GET /v1/routes/departures`, `GET /v1/routes/arrivals`, `GET /v1/routes/traffic/realtime` |
| 예보 | `GET /v1/forecasts/tomorrow`, `GET /v1/forecasts/marine`, `GET /v1/forecasts/marine/locations` |
| 섬지도 | `GET /v1/islands`, `GET /v1/islands/features`, `GET /v1/islands/wms`, `GET /v1/islands/base-tile`, `GET /v1/islands/:id` |
| 섬여행 | `GET /v1/island-trips/travel-info` |
| 여객선 | `GET /v1/vessels/detail` |
| 관리자 | `POST /v1/admin/vessels/sync` |
| 문서 | `/docs` |

## 14. 데이터 상태/실패 UX

섬여행과 예보 화면은 API별 상태를 분리해 보여준다.

상태:

- `OK`: 데이터 정상 조회
- `EMPTY`: API는 성공했으나 관련 데이터 없음
- `ERROR`: API 호출 실패

이 구조 덕분에 하나의 API가 실패해도 전체 화면을 실패 처리하지 않고, 성공한 영역은 그대로 보여줄 수 있다.

## 15. 개인화/화면 간 연계

전역 선택 컨텍스트를 통해 화면 간 사용자의 선택을 연결한다.

예:

- 시간표에서 선택한 항로 → 홈 관심 항로/예보 요약
- 섬여행에서 선택한 섬 → 홈 추천 사진/섬 상세
- 섬상세 → 예보 화면으로 이동해 해당 섬 예보 조회
- 예보 조회 권역 → 섬여행/시간표 추천 기준으로 확장 가능

관련 파일:

- `apps/mobile/src/state/app-selection-context.ts`

## 16. 디자인/브랜딩

### 앱명

- 섬똑

### 마스코트

사용 중인 주요 이미지:

- `boogi_bg1.png`
- `boogi_bg2.png`
- `boogi_bg3.png`
- `boogi_bg4.png`
- `boogi_bg5.png`
- `boogi_bg6.png`
- `boogi-forecast.png`
- `boogi-profile.png`
- `boogi-routes.png`
- `boogi-schedule.png`

### 아이콘

- `boogi_bg4.png` 기반 앱 아이콘 생성
- Expo `icon`, Android `adaptiveIcon.foregroundImage` 연결
- 네이티브 Android 런처 리소스는 기존 `boogi_launcher` 계열 사용

## 17. 운영 배포 구조

운영 배포는 외부 포트 하나만 열고 Nginx가 웹/API를 나누는 구조다.

```text
http://131.186.26.5:8082/          섬똑 웹
http://131.186.26.5:8082/api/v1    API 프록시
http://131.186.26.5:8082/api/docs  Swagger
```

### 구성 파일

- `docker-compose.prod.yml`
- `Dockerfile.api`
- `Dockerfile.web`
- `deploy/nginx/sea-load.conf`
- `.env.production.example`
- `docs/oracle-cloud-deploy.md`

### 컨테이너

- `web`: Nginx + Expo web export
- `api`: NestJS API
- `postgres`: PostgreSQL
- `redis`: Redis

## 18. 환경 변수

주요 환경 변수:

- `SEA_LOAD_PORT`
- `EXPO_PUBLIC_API_BASE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `PUBLIC_API_MODE`
- `DATA_GO_KR_SERVICE_KEY`
- `KOMSA_SERVICE_KEY`
- `INCHEON_PORT_SERVICE_KEY`
- `VWORLD_API_KEY`
- `TOURISM_SERVICE_KEY`
- `WEATHER_SERVICE_KEY`
- `KHOA_SERVICE_KEY`
- `PHOTO_GALLERY_API_URL`
- `BORYEONG_ISLAND_PHOTO_API_URL`
- `ADMIN_SYNC_TOKEN`

## 19. 검증된 항목

현재까지 작업 중 확인된 검증 항목:

- API 타입 체크
- 모바일 타입 체크
- Expo Android LJK 에뮬레이터 실행 확인
- 섬여행 화면 LJK 에뮬레이터 표시 확인
- 운영 Docker compose build 확인
- 운영 Nginx 단일 포트 프록시 구성 확인

## 20. 참고 사항과 남은 과제

### 참고 사항

- 일부 ref_api 문서 이미지 파일은 로컬 작업 중 삭제 상태로 표시될 수 있으므로 커밋 전 별도 확인이 필요하다.
- 보령시 섬사진 API는 문서상 연계 구조를 반영했으나, 직접 호출 시 공공 API 서버에서 500 응답이 확인된 적이 있다. 앱에서는 실패해도 기존 관광사진 결과가 유지되도록 방어적으로 구현되어 있다.
- 한국관광공사/행정안전부 일부 API는 섬 이름과 행정동/면/리 명칭 매칭 품질에 따라 결과가 달라질 수 있다.

### 기능 고도화 후보

- 섬여행 추천 코스 자동 생성 고도화
- 목적별 일정표 자동 생성
- 마지막 복귀 배편 경고 강화
- 실제 위치 기반 가까운 출발항 추천
- 섬별 숙박/식당 데이터 매칭 품질 개선
- 캠핑/차박 가능 여부의 공식 출처 신뢰도 표시
- 예보 위험도와 시간표 후보의 자동 경고 결합
- 운영 서버 배포 후 API별 실데이터 헬스 체크 대시보드
