# Schedule API Analysis

## Target API

`KOMSA operation schedule`

- Source: https://www.data.go.kr/data/15142302/openapi.do
- Endpoint: `https://apis.data.go.kr/B554035/oprt-schd-info-v2`
- Operation: `/get-oprt-schd-info-v2`
- Format: JSON/XML

## Live Verification Summary

The API is callable, but it requires both date and vessel name.

Required query parameters:

- `serviceKey`
- `pageNo`
- `numOfRows`
- `rlvtYmd`: date in `YYYYMMDD`
- `psnshpNm`: passenger ship name

Recommended optional query parameters:

- `dataType=JSON`
- `filters`: response field selection

## Observed Response Fields

| Field | Meaning | App usage |
| --- | --- | --- |
| `rlvt_ymd` | operation date | schedule date |
| `sail_tm` | sailing time, usually `HHmm` or `Hmm` | departure time |
| `psnshp_cd` | passenger ship code | vessel id/code |
| `psnshp_nm` | passenger ship name | vessel name |
| `oport_cd` | origin port code | departure port code |
| `oport_nm` | origin port name | departure port |
| `dest_cd` | destination port code | arrival port code |
| `dest_nm` | destination port name | arrival port |
| `lcns_seawy_cd` | licensed route code | route grouping |
| `lcns_seawy_nm` | licensed route name | route display |
| `nvg_seawy_cd` | operation route code | route id detail |
| `nvg_seawy_nm` | operation route name | route display |
| `nvg_drc_cd` | navigation direction code | outbound/return grouping |
| `nvg_drc_nm` | navigation direction name | outbound/return label |
| `nvg_se_cd` | navigation type code | normal/other category |
| `nvg_se_nm` | navigation type name | status context |
| `nvg_stts_cd` | navigation status code | status mapping |
| `nvg_stts_nm` | navigation status name | status label |
| `cntrl_rsn_cd` | control reason code | disruption reason |
| `cntrl_rsn_nm` | control reason name | disruption reason |
| `nnavi_rsn_cd` | non-navigation reason code | disruption reason |
| `nnavi_rsn_nm` | non-navigation reason name | disruption reason |
| `vsl_no` | vessel number | vessel metadata |
| `cnls_etc_rsn` | cancellation extra reason | disruption reason |
| `seawy_se_cd` | sea route type code | route type |
| `seawy_se_nm` | sea route type name | route type label |

## Search Strategy

The app should not rely on the schedule API alone for broad searches because
`psnshpNm` is required. Use the following flow:

1. Use ferry route status API with `rlvtYmd` to collect vessel and route candidates.
2. Filter candidates by departure port, destination port, route name, or vessel name.
3. Call schedule API for each selected vessel with `rlvtYmd + psnshpNm`.
4. Enrich route/stops from operation route and operation line APIs.

## First Implementation Slice

Done:

- Backend candidate endpoint: `GET /v1/schedules/candidates`
- Query: `date` required, `departure`, `arrival`, `vesselName` optional
- Source API: ferry route status API, filtered by date/route/vessel text
- Cache TTL: 5 minutes
- Normalized response type: `ScheduleSearchCandidate`
- Backend route option endpoint: `GET /v1/routes/options`
- Source API: KOMSA operation line API, normalized into departure/arrival route choices
- Mobile: date picker modal and route search modal for departure/arrival selection

Next:

1. Run the API server in real mode and verify `GET /v1/routes/options` against live operation line data.
2. Candidate selection: call `GET /v1/schedules/candidates` and let the user choose a vessel/route row.
3. Schedule detail: call `GET /v1/schedules` with `date`, `departure`, `arrival`, and selected `vesselName`.
4. Detail screen: show route, vessel, status, control reason, and departure time.
