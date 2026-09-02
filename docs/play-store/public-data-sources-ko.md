# 섬똑 사용 공공데이터 목록

작성 기준일: 2026-08-18

이 문서는 섬똑 앱과 백엔드에서 실제 연동하거나, DB 적재 및 추천 데이터 후보로 수집한 공공데이터 출처를 정리한 목록입니다. 앱은 공공 API를 직접 호출하지 않고 백엔드 서버가 호출, 정규화, 캐싱, DB 적재를 담당합니다.

## 1. 실시간/API 연동 데이터

| 구분 | 제공기관/서비스 | 데이터 또는 API | 앱 사용 위치 | 주요 용도 | 관련 설정값/코드 |
| --- | --- | --- | --- | --- | --- |
| 여객선 | 한국해양교통안전공단(KOMSA) | 여객선 운항상태 정보 | 시간표, 홈, 운항 상태 | 오늘 항로별 운항 상태 확인 | `KOMSA_SERVICE_KEY`, `apps/api/src/public-api/public-api-endpoints.ts` |
| 여객선 | 한국해양교통안전공단(KOMSA) | 운항 스케줄 정보 | 시간표 | 출발지/도착지/날짜 기준 운항 일정 조회 | `KOMSA_SERVICE_KEY`, `komsa-operation-schedule` |
| 여객선 | 한국해양교통안전공단(KOMSA) | 운항항로 정보 | 시간표 | 항로 마스터, 출발/도착 후보 구성 | `komsa-operation-route` |
| 여객선 | 한국해양교통안전공단(KOMSA) | 운항노선 정보 | 시간표 | 기항지, 노선 상세, 출발지별 도착지 보조 조회 | `komsa-operation-line` |
| 여객선 | 한국해양교통안전공단(KOMSA) | 내일의 운항예보, 내일의 운항예보 상세 | 예보, 시간표 | 내일 운항 가능성 및 예보 상세 | `komsa-tomorrow-forecast`, `komsa-tomorrow-forecast-detail` |
| 여객선 | 한국해양교통안전공단(KOMSA) | 실시간 교통정보 조회 | 시간표/운항 보조 | 해상 교통상황 보조 데이터 | `komsa-realtime-traffic` |
| 여객선 | 인천항만공사 | 여객터미널 실시간 운항정보 조회 서비스 | 시간표 | 인천항 운항 정보 보강 | `INCHEON_PORT_SERVICE_KEY`, `incheon-terminal-navigation` |
| 여객선 | 국토교통부(TAGO) | 국내선박운항정보 | 시간표 | 항구, 터미널, 선박 종류, 운항정보 보조 | `TAGO_SERVICE_KEY`, `tago-ship-*` |
| 선박상세 | 한국해양교통안전공단(KOMSA) | 여객선 상세 페이지 | 시간표 상세 | 운항 일정 클릭 시 선박 상세, 이미지, 제원 제공 | `apps/api/src/vessels/komsa-vessel-scraper.service.ts` |
| 지도/섬 | VWorld | 도서 WFS/WMS/WMTS, 도서 속성 | 섬지도, 섬여행 | 섬 마스터 위치/형상, 지도 타일, 섬 검색 보조 | `VWORLD_API_KEY`, `apps/api/src/public-api/clients/vworld-island-api.client.ts` |
| 관광 | 한국관광공사 | 국문 관광정보 서비스(KorService2) | 섬여행 | 섬 주변 관광지/체험 검색 | `TOURISM_SERVICE_KEY`, `KOR_TOURISM_API_URL` |
| 사진 | 한국관광공사 | 관광사진 정보(PhotoGalleryService1) | 섬여행 | 섬/관광지 관련 사진 후보 조회 | `PHOTO_GALLERY_API_URL` |
| 캠핑 | 한국관광공사 | 고캠핑 정보 조회서비스 | 섬여행 | 캠핑장, 야영장 정보 조회 | `GOCAMPING_API_URL` |
| 캠핑 | 한국문화정보원 | 전국 문화 여가 활동 시설(캠핑) 데이터 | 섬여행 | 캠핑 데이터 보강 | `CULTURE_CAMPING_API_URL` |
| 캠핑 | 행정안전부 | 일반야영장업 조회서비스 | 섬여행 | 인허가 기반 야영장/캠핑장 보강 | `GENERAL_CAMPGROUND_API_URL` |
| 숙박 | 행정안전부 | 숙박업 조회서비스 | 섬여행 | 숙박업 인허가 데이터 조회 | `LODGINGS_API_URL` |
| 숙박 | 행정안전부 | 관광펜션업 조회서비스 | 섬여행 | 펜션/숙박 보강 | `TOURIST_PENSIONS_API_URL` |
| 식당 | 행정안전부 | 관광식당 조회서비스 | 섬여행 | 식당 인허가 데이터 조회 | `TOURIST_RESTAURANTS_API_URL` |
| 갯벌 | 해양수산부 | 갯벌 정보 제공 서비스 | 섬여행 | 갯벌 생태/체험마을 정보 조회 | `MUD_FLAT_API_URL` |
| 예보 | 기상청 | 단기예보 조회서비스 | 예보 | 기온, 강수, 하늘상태, 풍속, 파고 등 조회 | `WEATHER_SERVICE_KEY`, `SHORT_TERM_FORECAST_API_URL` |
| 예보 | 기상청 | 기상특보 조회서비스 | 예보 | 해양 여행 위험도 계산 보조 | `WEATHER_WARNING_API_URL` |
| 예보 | 국립해양조사원 | 조석예보(고, 저조) | 예보 | 조위/물때 조회 | `KHOA_SERVICE_KEY`, `TIDE_FORECAST_API_URL` |
| 예보 | 국립해양조사원 | 조위관측소 실측 수온 조회 | 예보 | 수온 정보 조회 | `WATER_TEMPERATURE_API_URL` |
| 예보 | 해양수산부 | 연속정보 염분(15분) | 예보 | 염분 정보 조회 | `SALINITY_API_URL` |
| 여행지수 | 국립해양조사원 | 바다여행지수 조회 | 섬여행/추천 보조 | 바다 여행 적합도 보조 정보 | `SEA_TRIP_INDEX_API_URL` |
| 섬사진 | 충청남도 보령시 | 섬사진 조회 서비스 | 섬여행 | 보령권 섬 사진 보강 | `BORYEONG_ISLAND_PHOTO_API_URL` |
| 크루즈 | 행정안전부 | 문화_관광유람선업 조회서비스 | 크루즈 | 등록 유람선 사업자 정보 | `CRUISE_SERVICE_KEY`, `CRUISE_TOURIST_API_URL` |

## 2. 파일/마스터 적재 데이터

| 구분 | 원천/파일 | 앱 사용 위치 | DB/분석 활용 |
| --- | --- | --- | --- |
| 여객선 항로 마스터 | `ref_api/시간표/해양수산부_해양안전종합정보시스템_여객선 운항정보(KOMSA)_20250828.csv` | 시간표 | `ferry_route_master` 계열 적재, 출발/도착 후보 보강 |
| 주소 마스터 | `ref_data/주소/zipcode_DB` | 여행권역, 행정권역 매칭 | `address_master`, 주소 기반 권역 매칭 |
| 섬 마스터 | VWorld 도서 데이터, 자체 섬 정제 데이터 | 섬여행, 섬지도, 추천 | `island_master`, 예보권역/여행권역/행정권역 연결 |
| 여행권역 마스터 | 자체 정의한 대한민국 섬여행 권역 | 섬여행, 추천 | `island_travel_region`, `island_master.travel_region_id` |
| 인허가 데이터 | `ref_data/인허가`, 행정안전부 인허가 계열 | 섬여행 상세 | `license_lodging`, `license_restaurant`, `license_camping`, `license_facility`, `island_license_match` |
| 여행추천 공공 파일 데이터 | `ref_data/여행추천/data-go-kr` | 섬여행 검색/상세, 추천 알고리즘 후보 | `public_data_file_dataset`, `travel_data_source`, `travel_asset`, `travel_asset_match` |
| 보령 추천섬 | 보령시 섬 관광 페이지 및 상세 | 섬여행 추천권역/추천섬 | `recommended_island` 계열 후보 데이터 |
| 크루즈 일정 | `ref_api/크루즈/부산항만공사_부산항 크루즈 스케줄 정보_20241231.csv` | 크루즈 | `cruise_schedule`, `cruise_vessel`, `cruise_port` |
| 크루즈 일정 | `ref_api/크루즈/26년 부산 여객 크루즈 스케쥴.xlsx`, `27년 부산 여객 크루즈 스케쥴.xlsx` | 크루즈 | 2026/2027 부산 크루즈 일정 보강 |
| 크루즈 일정/선박 | `ref_api/크루즈/여수광양항만공사_여수항 크루즈선 정보_20250831.csv`, `여수광양항만공사_크루즈입항스케줄_20250831.csv` | 크루즈 | 여수항 크루즈 선박/입항 일정 |
| 크루즈 상품 | `ref_api/크루즈/경상북도 포항시_포항운하크루즈_20221011.csv` | 크루즈 | 포항운하크루즈 관광상품 상세 |
| 인천 크루즈 일정 | 인천항 크루즈 운항정보 페이지 | 크루즈 | 인천항 크루즈 입항 일정 수집 |

## 3. 여행추천 수집 키워드

`ref_data/여행추천/data-go-kr`에는 공공데이터포털 파일데이터 검색 결과와 상세 메타데이터, 다운로드 파일, 컬럼 카탈로그가 저장되어 있습니다. 현재 카탈로그 기준 수집 키워드는 60개이고, 키워드별 수집 건수 합계는 8,241건입니다. 단, 동일 공공데이터가 여러 키워드에 중복 포함될 수 있으므로 실제 고유 데이터셋 수는 DB의 `public_data_file_dataset.public_data_pk` 기준으로 산정해야 합니다.

수집 키워드:

갯벌, 걷기, 공원, 관광, 낚시, 노을, 둘레길, 등대, 마리나, 맛집, 모텔, 무장애, 물때, 민박, 바다, 반려동물, 산책, 샤워장, 서핑, 선착장, 섬, 수산시장, 수상레저, 숙박, 스노클링, 식당, 야영, 어촌, 어항, 여객선, 여행, 요트, 일몰, 일출, 전망대, 전통시장, 주차장, 체험, 축제, 카약, 카페, 캠핑, 탐방로, 트레킹, 특산물, 펜션, 편의시설, 포토존, 항구, 해루질, 해변, 해산물, 해수욕장, 해안, 해안길, 해양, 해양레저, 해파랑길, 호텔, 화장실

## 4. 운영/고지 시 유의사항

- 운항 정보, 예보, 조위, 크루즈 일정은 실시간 현장 상황과 제공기관 갱신 주기에 따라 달라질 수 있으므로 앱 내에서 최종 확인 안내가 필요합니다.
- 공공데이터포털 파일데이터는 라이선스와 이용조건이 데이터셋별로 다를 수 있어, 추천 데이터로 노출하기 전에 `public_data_file_dataset.license`와 상세 페이지의 이용허락 범위를 확인해야 합니다.
- 사진 데이터는 출처, 저작권, 공공누리 유형이 중요하므로 추천섬 대표 이미지로 고정 사용하기 전 별도 검수가 필요합니다.
- 인허가 데이터는 영업상태, 폐업일자, 주소 정합성 검증이 필요합니다.
- 여행추천 파일 데이터는 수집 키워드와 파일명 중심의 1차 분류이므로, 서비스 노출 전 주소/좌표/시군구/섬명 매칭 품질 점검이 필요합니다.


## 추가 연동 예정/연동 데이터
- 경기관광공사 경기관광 OPEN API: 경기도 관광지, 축제, 체험, 음식, 숙박 등 섬 주변 관광추천 보강 데이터

