# 섬똑 Google Play 등록 체크리스트

## 1. 앱 기본 정보

- 앱 이름: 섬똑
- 패키지명: `kr.seomttok.app`
- 현재 버전: `0.1.0`
- 현재 versionCode: `1`
- 배포 형식: Android App Bundle (`.aab`)
- API 서버: `https://seaload.aodata.co.kr/api/v1`
- 개인정보 처리방침 URL: `https://seaload.aodata.co.kr/privacy-policy`
- Play Console 앱 아이콘: `docs/play-store/assets/seomttok-play-icon-512.png`
  - 형식: PNG
  - 크기: 512 x 512px
  - 용량: 1MB 미만
- Play Console 그래픽 이미지: `docs/play-store/assets/seomttok-feature-graphic-1024x500.png`
  - 형식: PNG
  - 크기: 1024 x 500px
  - 용량: 15MB 미만

## 2. 업로드 전 필수 확인

- Google Play Console 앱 생성
- 앱 아이콘 업로드: `docs/play-store/assets/seomttok-play-icon-512.png`
- 그래픽 이미지 업로드: `docs/play-store/assets/seomttok-feature-graphic-1024x500.png`
- 휴대전화 스크린샷 업로드:
  - `docs/play-store/screenshots/phone/01-home.png`
  - `docs/play-store/screenshots/phone/02-schedule.png`
  - `docs/play-store/screenshots/phone/03-island-trip.png`
  - `docs/play-store/screenshots/phone/05-forecast.png`
  - 선택: `docs/play-store/screenshots/phone/04-cruise.png`
- 7인치 태블릿 스크린샷 업로드:
  - `docs/play-store/screenshots/tablet-7/01-home-tablet7.png`
  - `docs/play-store/screenshots/tablet-7/02-schedule-tablet7.png`
  - `docs/play-store/screenshots/tablet-7/03-island-trip-tablet7.png`
  - `docs/play-store/screenshots/tablet-7/04-forecast-tablet7.png`
  - 선택: `docs/play-store/screenshots/tablet-7/05-cruise-tablet7.png`
- 10인치 태블릿 스크린샷 업로드:
  - `docs/play-store/screenshots/tablet-10/01-home-tablet10.png`
  - `docs/play-store/screenshots/tablet-10/02-schedule-tablet10.png`
  - `docs/play-store/screenshots/tablet-10/03-island-trip-tablet10.png`
  - `docs/play-store/screenshots/tablet-10/04-forecast-tablet10.png`
  - 선택: `docs/play-store/screenshots/tablet-10/05-cruise-tablet10.png`
- 앱 카테고리: 여행 및 지역정보
- 앱 또는 게임: 앱
- 무료/유료: 무료 권장
- 국가/지역: 대한민국 우선
- 연락처 이메일 등록
- 개인정보 처리방침 URL 등록: `https://seaload.aodata.co.kr/privacy-policy`
- 데이터 보안 양식 작성
- 콘텐츠 등급 설문 작성
- 타겟층 및 콘텐츠: 일반 사용자, 만 14세 미만 대상 아님
- 광고 포함 여부: 현재 광고 SDK가 없으면 "아니요"
- 앱 액세스: 로그인 없이 사용 가능

## 3. Android 빌드/서명

Google Play 신규 앱은 AAB 업로드와 Play App Signing 사용을 권장합니다.

1. 업로드 키 생성

```powershell
keytool -genkeypair `
  -v `
  -keystore C:\dev\sea-load\secrets\seomttok-upload-key.jks `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias seomttok-upload
```

2. 환경값 설정

```powershell
$env:SEOMTTOK_UPLOAD_STORE_FILE="C:\dev\sea-load\secrets\seomttok-upload-key.jks"
$env:SEOMTTOK_UPLOAD_KEY_ALIAS="seomttok-upload"
$env:SEOMTTOK_UPLOAD_STORE_PASSWORD="실제_스토어_비밀번호"
$env:SEOMTTOK_UPLOAD_KEY_PASSWORD="실제_키_비밀번호"
```

3. AAB 생성

```powershell
.\scripts\build-play-aab.ps1
```

생성 파일:

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## 4. 등록 전 QA

- 실제 서버 도메인으로 앱 연결 확인
- 시간표 조회: 인천 출발/덕적, 백령 등 주요 항로
- 예보 조회: 권역 선택, 오늘/내일 예보
- 섬여행 조회: 섬 검색, 관광·체험 상세
- 크루즈 조회: 월별 입항 일정 접기/펼치기, 상세 모달
- 네트워크 오류 화면 확인
- Android 실기기 설치 후 첫 실행 확인

## 5. Google Play 정책상 현재 유의사항

- 2026년 8월 31일부터 신규 앱/업데이트는 Android 16, API 36 이상 타깃이 필요합니다.
- 모든 게시 앱은 데이터 보안 양식을 작성해야 합니다.
- 사용자 데이터를 수집하지 않는 앱도 개인정보 처리방침 링크가 필요합니다.
- Play App Signing 사용 시 Google Play의 앱 서명 인증서 지문을 API 제공자 콘솔에 등록해야 할 수 있습니다.

공식 참고:

- https://developer.android.com/google/play/requirements/target-sdk
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/9842756
