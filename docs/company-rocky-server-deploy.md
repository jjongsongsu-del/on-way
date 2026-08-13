# Company Rocky Linux Server Deploy

Target:

- Domain: `seaload.aodata.co.kr`
- Test URL: `http://121.162.171.85:8093`
- App directory: `/home/seaload/sea-load`
- App user: `seaload`

## 1. DNS

Create an A record:

```text
seaload.aodata.co.kr -> 121.162.171.85
```

## 2. First Install

Run as `root` or a sudo user on the Rocky Linux server:

```bash
curl -fsSL https://raw.githubusercontent.com/jjongsongsu-del/on-way/main/scripts/install-company-rocky-server.sh -o /tmp/install-company-rocky-server.sh
chmod +x /tmp/install-company-rocky-server.sh
sudo APP_DIR=/home/seaload/sea-load APP_PORT=8093 APP_DOMAIN=seaload.aodata.co.kr /tmp/install-company-rocky-server.sh
```

Then edit production secrets:

```bash
sudo -u seaload vi /home/seaload/sea-load/.env.production
```

At minimum, change:

```text
POSTGRES_PASSWORD=change-me
```

Fill public API keys if real API calls are required:

```text
DATA_GO_KR_SERVICE_KEY=
KOMSA_SERVICE_KEY=
INCHEON_PORT_SERVICE_KEY=
VWORLD_API_KEY=
TOURISM_SERVICE_KEY=
WEATHER_SERVICE_KEY=
KHOA_SERVICE_KEY=
```

Forecast API URL overrides are optional. When left blank, the app uses these defaults:

```text
SHORT_TERM_FORECAST_API_URL=https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0
WEATHER_WARNING_API_URL=https://apis.data.go.kr/1360000/WthrWrnInfoService
TIDE_FORECAST_API_URL=https://apis.data.go.kr/1192136/tideFcstHghLw
WATER_TEMPERATURE_API_URL=https://apis.data.go.kr/1192136/surveyWaterTemp
SALINITY_API_URL=https://apis.data.go.kr/1192000/apVhdService_Tgcsy15
```

By default, the company server builds Docker images locally from `/home/sea-load`.

If you prefer pulling GHCR images instead:

```bash
sudo -u seaload docker login ghcr.io -u jjongsongsu-del
sudo -u seaload USE_REGISTRY=1 /home/seaload/sea-load/scripts/deploy-company-server.sh
```

## 3. Deploy

```bash
sudo -u seaload /home/seaload/sea-load/scripts/deploy-company-server.sh
```

## 4. Verify

```bash
curl -i http://127.0.0.1:8093/api/v1/health
curl -i http://121.162.171.85:8093/api/v1/health
curl -i http://seaload.aodata.co.kr:8093/api/v1/health
```

Open:

```text
http://121.162.171.85:8093/
http://seaload.aodata.co.kr:8093/
```

## 5. Android APK

The default release APK build points to:

```text
http://121.162.171.85:8093/api/v1
```

Build:

```bat
build-release-apk.bat
```

To build for the domain later:

```bat
set EXPO_PUBLIC_API_BASE_URL=http://seaload.aodata.co.kr:8093/api/v1
build-release-apk.bat
```
