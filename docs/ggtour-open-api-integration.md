# 경기관광 OPEN API 연동 설계 및 운영 절차

## 목적
경기관광 OPEN API 데이터를 섬똑의 섬여행/추천검색 데이터로 흡수한다. 1차 대상은 경기도 서해권 섬과 주변 관광지다.

## 환경변수
- `GGTOUR_API_KEY`: 경기관광 OPEN API 마이페이지에서 발급받은 키
- `GGTOUR_API_BASE_URL`: 기본값 `https://ggtour.or.kr/ggapi-svc/api/v1`
- `GGTOUR_API_PATH`: 자동 탐색 대신 특정 API 경로를 고정할 때 사용

API 키는 앱에 넣지 않고 API 서버에서만 사용한다.

## DB 구조
- `ggtour_content`: 경기관광 원천 콘텐츠 저장 테이블
- `travel_data_source`: `GGTOUR_OPEN_API` 데이터 소스 1건 등록
- `travel_asset`: 경기도 서해권 섬과 관련 있는 관광/축제/체험/맛집/숙박/코스 자원 등록
- `travel_asset_match`: 여행권역 및 섬 매칭 결과 저장

## 수집 명령
Swagger에서 후보 GET API를 자동 탐색하고, 경기도 서해권과 관련 있는 데이터만 추천 자원으로 연결한다.

```powershell
corepack pnpm --filter @badagil/api data:collect:ggtour -- --discover
corepack pnpm --filter @badagil/api data:collect:ggtour -- --pages 3 --page-size 100 --delay-ms 150
```

특정 엔드포인트가 확인되면 다음처럼 고정 실행한다.

```powershell
corepack pnpm --filter @badagil/api data:collect:ggtour -- --path /확인된/API/경로 --pages all --page-size 100 --delay-ms 150
```

검증만 할 때는 다음처럼 실행한다.

```powershell
corepack pnpm --filter @badagil/api data:collect:ggtour -- --pages 1 --dry-run
```

## 화면 반영
섬여행 상세 조회에서 기존 한국관광공사 관광정보와 함께 경기관광 콘텐츠를 `관광지/관광체험` 목록에 합쳐 보여준다. 상세 정보 조회 시 요약, 주소, 문의처, 홈페이지, 출처 등 현재 확보된 필드를 보여준다.

## 매칭 규칙
- 섬명, 섬명 어간, 시군구, 주소, 요약/상세내용 키워드로 1차 매칭
- 좌표가 있으면 섬 기준 약 20km 이내 콘텐츠를 보조 매칭
- 경기도 서해권 관련 키워드만 추천 자원에 반영: 안산, 화성, 시흥, 평택, 김포, 대부도, 제부도, 풍도, 육도, 국화도 등


## 전체 API 수집
카테고리, 시군구, 콘텐츠 목록, 콘텐츠 상세를 한 번에 수집하려면 다음 명령을 사용한다. 상세 조회는 콘텐츠 목록에서 받은 `cot_id`를 그대로 `POST /api/v1/contents/info`의 JSON body에 넣어 호출한다.

```bash
node apps/api/prisma/collect-ggtour-data.cjs --all-apis --delay-ms 150
```

운영 컨테이너에서는 다음과 같이 실행한다.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
  node apps/api/prisma/collect-ggtour-data.cjs --all-apis --delay-ms 150
```

일부 콘텐츠 상세 API가 경기관광 서버에서 500을 반환하면 해당 콘텐츠는 목록 정보만 저장하고 다음 콘텐츠를 계속 수집한다.
