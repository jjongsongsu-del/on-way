import { Injectable } from '@nestjs/common';
import { FORECAST_STATUS, RISK_LEVEL, SAILING_STATUS } from '@badagil/shared';
import type {
  Port,
  RealtimeTrafficSummary,
  RouteStop,
  RouteSummary,
  SailingScheduleSummary,
  TodayStatusSummary,
  TomorrowForecastSummary,
  Vessel
} from '@badagil/shared';
import { IncheonPortApiClient } from './clients/incheon-port-api.client';
import { KomsaApiClient } from './clients/komsa-api.client';
import { extractItems, makeStableId, pickNumber, pickString } from './public-api-response.util';
import type {
  PublicApiResult,
  PublicFerryApiClient,
  PortOption,
  RouteOption,
  RouteSearchParams,
  ScheduleCandidateSearchParams,
  ScheduleSearchCandidate,
  ScheduleSearchParams,
  WeeklyScheduleSearchParams
} from './types/public-api.types';

type UnknownRecord = Record<string, unknown>;

@Injectable()
export class RealFerryApiClient implements PublicFerryApiClient {
  constructor(
    private readonly komsaClient: KomsaApiClient,
    private readonly incheonPortClient: IncheonPortApiClient
  ) {}

  async getPorts(): Promise<PublicApiResult<Port[]>> {
    const [routes, lineResponse] = await Promise.all([this.getRoutes(), this.komsaClient.getOperationLines()]);
    const names = new Set<string>();

    routes.data.forEach((route) => {
      if (route.departurePortName) names.add(route.departurePortName);
      if (route.arrivalPortName) names.add(route.arrivalPortName);
    });
    extractItems(lineResponse).forEach((item) => {
      const portName = pickString(item, FIELD_KEYS.stopPortName);
      if (portName) names.add(portName);
    });

    return this.result(
      [...names].sort().map((portName) => ({
        id: makeStableId('port', [portName]),
        portCode: '',
        portName,
        regionName: null,
        latitude: null,
        longitude: null
      })),
      'KOMSA',
      'komsa-derived-ports',
      'json'
    );
  }

  async getRoutes(): Promise<PublicApiResult<RouteSummary[]>> {
    const response = await this.komsaClient.getOperationRoutes();
    const routes = extractItems(response).map((item) => this.toRoute(item));

    return this.result(uniqueById(routes), 'KOMSA', 'komsa-operation-route', 'json');
  }

  async getRouteOptions(): Promise<PublicApiResult<RouteOption[]>> {
    const response = await this.komsaClient.getOperationLines({ numOfRows: 1000 });
    const groups = new Map<string, Array<{ sequence: number; portName: string; routeName: string }>>();

    extractItems(response).forEach((item) => {
      const routeName = pickString(item, FIELD_KEYS.operationRouteName) ?? pickString(item, FIELD_KEYS.licenseRouteName);
      const routeCode = pickString(item, FIELD_KEYS.operationRouteCode);
      const licenseRouteCode = pickString(item, FIELD_KEYS.licenseRouteCode);
      const portName = pickString(item, FIELD_KEYS.stopPortName);

      if (!routeName || !portName) {
        return;
      }

      const key = [licenseRouteCode, routeCode, routeName].filter(Boolean).join(':');
      const routeStops = groups.get(key) ?? [];
      routeStops.push({
        sequence: pickNumber(item, FIELD_KEYS.stopSequence) ?? routeStops.length + 1,
        portName,
        routeName
      });
      groups.set(key, routeStops);
    });

    const options = [...groups.entries()]
      .map(([key, stops]) => {
        const sortedStops = stops
          .sort((a, b) => a.sequence - b.sequence)
          .map((stop) => stop.portName)
          .filter(Boolean);
        const uniqueStops = [...new Set(sortedStops)];
        const departurePortName = uniqueStops[0] ?? '';
        const arrivalPortName = uniqueStops[uniqueStops.length - 1] ?? '';
        const routeName = stops[0]?.routeName ?? `${departurePortName}-${arrivalPortName}`;

        return {
          id: makeStableId('route-option', [key, routeName, departurePortName, arrivalPortName]),
          routeName,
          departurePortName,
          arrivalPortName,
          stopPortNames: uniqueStops
        };
      })
      .filter((option) => option.departurePortName && option.arrivalPortName);

    if (options.length > 0) {
      return this.result(uniqueById(options), 'KOMSA', 'komsa-operation-line:options', 'json');
    }

    const routes = await this.getRoutes();
    return this.result(
      routes.data.map((route) => ({
        id: route.id,
        routeName: route.operationRouteName,
        departurePortName: route.departurePortName,
        arrivalPortName: route.arrivalPortName,
        stopPortNames: [route.departurePortName, route.arrivalPortName]
      })),
      'KOMSA',
      'komsa-operation-route:options-fallback',
      'json'
    );
  }

  async getDeparturePortOptions(): Promise<PublicApiResult<PortOption[]>> {
    const response = await this.komsaClient.getOperationLines({ numOfRows: 1000 });
    const terminalsByRoute = buildTerminalStopMap(extractItems(response));
    const departures = [...terminalsByRoute.values()].map((terminal) => terminal.departurePortName);

    return this.result(
      toPortOptions(departures),
      'KOMSA',
      'komsa-operation-line:departure-options',
      'json'
    );
  }

  async getArrivalPortOptions(): Promise<PublicApiResult<PortOption[]>> {
    const response = await this.komsaClient.getOperationLines({ numOfRows: 1000 });
    const terminalsByRoute = buildTerminalStopMap(extractItems(response));
    const arrivals = [...terminalsByRoute.values()].map((terminal) => terminal.arrivalPortName);

    return this.result(
      toPortOptions(arrivals),
      'KOMSA',
      'komsa-operation-line:arrival-options',
      'json'
    );
  }

  async getRoute(routeId: string): Promise<PublicApiResult<RouteSummary | null>> {
    const routes = await this.getRoutes();
    return this.result(routes.data.find((route) => route.id === routeId) ?? null, 'KOMSA', 'komsa-operation-route', 'json');
  }

  async searchRoutes(params: RouteSearchParams): Promise<PublicApiResult<RouteSummary[]>> {
    const routes = await this.getRoutes();
    const departure = params.departure.trim();
    const arrival = params.arrival.trim();

    return this.result(
      routes.data.filter(
        (route) =>
          (!departure || route.departurePortName.includes(departure) || route.operationRouteName.includes(departure)) &&
          (!arrival || route.arrivalPortName.includes(arrival) || route.operationRouteName.includes(arrival))
      ),
      'KOMSA',
      'komsa-operation-route',
      'json'
    );
  }

  async getRouteStops(routeId: string): Promise<PublicApiResult<RouteStop[]>> {
    const response = await this.komsaClient.getOperationLines();
    const stops = extractItems(response).map((item, index) => this.toRouteStop(routeId, item, index + 1));

    return this.result(stops, 'KOMSA', 'komsa-operation-line', 'json');
  }

  async getScheduleCandidates(
    params: ScheduleCandidateSearchParams
  ): Promise<PublicApiResult<ScheduleSearchCandidate[]>> {
    const response = await this.komsaClient.getFerryRouteStatus({
      rlvtYmd: params.date.replace(/\D/g, ''),
      numOfRows: 1000,
      psnshpNm: params.vesselName || undefined
    });
    const departure = params.departure?.trim() ?? '';
    const arrival = params.arrival?.trim() ?? '';
    const vesselName = params.vesselName?.trim() ?? '';
    const candidates = extractItems(response)
      .map((item) => this.toScheduleCandidate(item))
      .filter(
        (candidate) =>
          (!departure || candidateMatchesDeparture(candidate, departure)) &&
          (!arrival || candidateMatchesArrival(candidate, arrival)) &&
          (!vesselName || candidate.vesselName.includes(vesselName))
      );

    return this.result(uniqueById(candidates), 'KOMSA', 'komsa-ferry-route-status:candidates', 'json');
  }

  async getSchedules(params: ScheduleSearchParams): Promise<PublicApiResult<SailingScheduleSummary[]>> {
    if (!params.vesselName) {
      return this.result([], 'KOMSA', 'komsa-operation-schedule:missing-vessel-name', 'json');
    }

    const response = await this.komsaClient.getOperationSchedules({
      rlvtYmd: params.date ? params.date.replace(/\D/g, '') : undefined,
      psnshpNm: params.vesselName
    });
    const schedules = extractItems(response)
      .map((item) => this.toSchedule(item))
      .filter(
        (schedule) =>
          (!params.date || schedule.sailingDate === params.date) &&
          (!params.departure || schedule.departurePortName.includes(params.departure)) &&
          (!params.arrival || schedule.arrivalPortName.includes(params.arrival))
      );

    return this.result(schedules, 'KOMSA', 'komsa-operation-schedule', 'json');
  }

  async getWeeklySchedules(params: WeeklyScheduleSearchParams): Promise<PublicApiResult<SailingScheduleSummary[]>> {
    const dates = getDateRangeBetween(params.startDate ?? params.date, params.endDate);
    const responses = await Promise.all(
      dates.map((date) =>
        this.komsaClient.getOperationSchedules({
          rlvtYmd: date.replace(/\D/g, ''),
          numOfRows: 1000,
          psnshpNm: params.vesselName || undefined
        })
      )
    );
    const departure = params.departure?.trim() ?? '';
    const arrival = params.arrival?.trim() ?? '';

    const schedules = responses
      .flatMap((response) => extractItems(response))
      .map((item) => this.toSchedule(item))
      .filter(
        (schedule) =>
          (!departure || schedule.departurePortName.includes(departure)) &&
          (!arrival || schedule.arrivalPortName.includes(arrival)) &&
          (!params.vesselName || (schedule.vesselName ?? '').includes(params.vesselName))
      )
      .sort((a, b) => `${a.sailingDate} ${a.departureTime}`.localeCompare(`${b.sailingDate} ${b.departureTime}`));

    return this.result(uniqueById(schedules), 'KOMSA', 'komsa-operation-schedule:weekly', 'json');
  }

  async getRealtimeTraffic(): Promise<PublicApiResult<RealtimeTrafficSummary[]>> {
    const response = await this.komsaClient.getRealtimeTraffic({ numOfRows: 1000 });
    const observedAt = new Date().toISOString();
    const traffic = extractItems(response)
      .map((item) => this.toRealtimeTraffic(item, observedAt))
      .sort((a, b) => (b.density ?? -1) - (a.density ?? -1));

    return this.result(uniqueById(traffic), 'KOMSA', 'komsa-realtime-traffic', 'json');
  }

  async getTodayStatus(params: RouteSearchParams): Promise<PublicApiResult<TodayStatusSummary | null>> {
    const response = await this.komsaClient.getFerryRouteStatus({
      rlvtYmd: new Date().toISOString().slice(0, 10).replace(/\D/g, ''),
      psnshpNm: params.departure || undefined
    });
    const item = extractItems(response).find(
      (record) =>
        (!params.departure || (pickString(record, FIELD_KEYS.departurePortName) ?? '').includes(params.departure)) &&
        (!params.arrival || (pickString(record, FIELD_KEYS.arrivalPortName) ?? '').includes(params.arrival))
    );

    if (!item) {
      return this.result(null, 'KOMSA', 'komsa-ferry-route-status', 'json');
    }

    const route = this.toRoute(item);
    return this.result(
      {
        route,
        status: normalizeSailingStatus(pickString(item, FIELD_KEYS.status)),
        nextDeparture: this.toSchedule(item),
        updatedAt: new Date().toISOString()
      },
      'KOMSA',
      'komsa-ferry-route-status',
      'json'
    );
  }

  async getTomorrowForecast(params: RouteSearchParams): Promise<PublicApiResult<TomorrowForecastSummary | null>> {
    const response = await this.komsaClient.getTomorrowForecastDetail({
      ilja: getTomorrowYmd(),
      gicdName: params.departure || undefined
    });
    const item = extractItems(response).find(
      (record) =>
        (!params.departure || (pickString(record, FIELD_KEYS.departurePortName) ?? '').includes(params.departure)) &&
        (!params.arrival || (pickString(record, FIELD_KEYS.arrivalPortName) ?? '').includes(params.arrival))
    );

    if (!item) {
      return this.result(null, 'KOMSA', 'komsa-tomorrow-forecast-detail', 'json');
    }

    return this.result(
      {
        route: this.toRoute(item),
        status: normalizeForecastStatus(pickString(item, FIELD_KEYS.forecastStatus)),
        reason: pickString(item, FIELD_KEYS.reason),
        weatherSummary: pickString(item, FIELD_KEYS.weatherSummary),
        riskLevel: normalizeRiskLevel(pickString(item, FIELD_KEYS.riskLevel)),
        updatedAt: new Date().toISOString()
      },
      'KOMSA',
      'komsa-tomorrow-forecast-detail',
      'json'
    );
  }

  async getVessels(): Promise<PublicApiResult<Vessel[]>> {
    const [scheduleResponse, statusResponse] = await Promise.all([
      this.komsaClient.getOperationSchedules({ rlvtYmd: getTodayYmd(), psnshpNm: '섬사랑12호' }).catch(() => null),
      this.komsaClient.getFerryRouteStatus({ rlvtYmd: getTodayYmd() }).catch(() => null)
    ]);
    const items = [...extractItems(scheduleResponse), ...extractItems(statusResponse)];
    const vessels = items
      .map((item) => ({
        id: makeStableId('vessel', [pickString(item, FIELD_KEYS.vesselCode), pickString(item, FIELD_KEYS.vesselName)]),
        vesselCode: pickString(item, FIELD_KEYS.vesselCode),
        vesselName: pickString(item, FIELD_KEYS.vesselName) ?? '',
        passengerCapacity: pickNumber(item, FIELD_KEYS.passengerCapacity),
        operatorName: pickString(item, FIELD_KEYS.operatorName)
      }))
      .filter((vessel) => vessel.vesselName);

    return this.result(uniqueById(vessels), 'KOMSA', 'komsa-vessel-derived', 'json');
  }

  async getIncheonTerminalNavigation(params: Record<string, string | number | undefined> = {}) {
    return this.incheonPortClient.getTerminalNavigation(params);
  }

  private toRoute(item: UnknownRecord): RouteSummary {
    const operationRouteName = pickString(item, FIELD_KEYS.operationRouteName) ?? '';
    const fallbackPorts = splitRouteName(operationRouteName);
    const departurePortName = pickString(item, FIELD_KEYS.departurePortName) ?? fallbackPorts[0] ?? '';
    const arrivalPortName = pickString(item, FIELD_KEYS.arrivalPortName) ?? fallbackPorts[1] ?? '';

    return {
      id: makeStableId('route', [
        pickString(item, FIELD_KEYS.licenseRouteCode),
        pickString(item, FIELD_KEYS.operationRouteCode),
        operationRouteName,
        departurePortName,
        arrivalPortName
      ]),
      departurePortName,
      arrivalPortName,
      operationRouteName,
      licenseRouteName: pickString(item, FIELD_KEYS.licenseRouteName),
      provider: 'KOMSA'
    };
  }

  private toRouteStop(routeId: string, item: UnknownRecord, sequence: number): RouteStop {
    const portName = pickString(item, FIELD_KEYS.stopPortName) ?? pickString(item, FIELD_KEYS.departurePortName) ?? '';

    return {
      id: makeStableId('route-stop', [routeId, sequence, portName]),
      routeId,
      stopSequence: pickNumber(item, FIELD_KEYS.stopSequence) ?? sequence,
      portCode: pickString(item, FIELD_KEYS.portCode),
      portName,
      latitude: pickNumber(item, FIELD_KEYS.latitude),
      longitude: pickNumber(item, FIELD_KEYS.longitude)
    };
  }

  private toSchedule(item: UnknownRecord): SailingScheduleSummary {
    const route = this.toRoute(item);
    const sailingDate = normalizeDate(pickString(item, FIELD_KEYS.sailingDate));
    const departureTime = normalizeTime(pickString(item, FIELD_KEYS.departureTime));

    return {
      id: makeStableId('schedule', [
        sailingDate,
        departureTime,
        route.departurePortName,
        route.arrivalPortName,
        pickString(item, FIELD_KEYS.vesselCode)
      ]),
      sailingDate,
      departureTime,
      departurePortName: route.departurePortName,
      arrivalPortName: route.arrivalPortName,
      routeId: route.id,
      vesselId: makeStableId('vessel', [pickString(item, FIELD_KEYS.vesselCode), pickString(item, FIELD_KEYS.vesselName)]),
      vesselName: pickString(item, FIELD_KEYS.vesselName),
      status: normalizeItemSailingStatus(item),
      controlReason: pickString(item, FIELD_KEYS.reason),
      passengerCapacity: pickNumber(item, FIELD_KEYS.passengerCapacity)
    };
  }

  private toScheduleCandidate(item: UnknownRecord): ScheduleSearchCandidate {
    const sailingDate = normalizeDate(pickString(item, FIELD_KEYS.sailingDate));
    const departureTime = normalizeTime(pickString(item, FIELD_KEYS.departureTime));
    const vesselCode = pickString(item, FIELD_KEYS.vesselCode);
    const vesselName = pickString(item, FIELD_KEYS.vesselName) ?? '';
    const routeCode = pickString(item, FIELD_KEYS.operationRouteCode);
    const routeName = pickString(item, FIELD_KEYS.operationRouteName);
    const licenseRouteName = pickString(item, FIELD_KEYS.licenseRouteName);
    const currentPortName = pickString(item, FIELD_KEYS.stopPortName);

    return {
      id: makeStableId('schedule-candidate', [sailingDate, departureTime, vesselCode, vesselName, routeCode]),
      sailingDate,
      departureTime,
      vesselCode,
      vesselName,
      routeCode,
      routeName,
      licenseRouteName,
      currentPortName,
      status: normalizeItemSailingStatus(item)
    };
  }

  private toRealtimeTraffic(item: UnknownRecord, observedAt: string): RealtimeTrafficSummary {
    const gridId = pickString(item, FIELD_KEYS.gridId) ?? '';
    const density = pickNumber(item, FIELD_KEYS.trafficDensity);

    return {
      id: makeStableId('traffic', [gridId]),
      gridId,
      vesselTrafficCount: pickNumber(item, FIELD_KEYS.vesselTrafficCount),
      density,
      congestionLevel: normalizeCongestionLevel(density),
      observedAt
    };
  }

  private result<T>(
    data: T,
    provider: PublicApiResult<T>['meta']['provider'],
    source: string,
    rawFormat: PublicApiResult<T>['meta']['rawFormat']
  ): PublicApiResult<T> {
    return {
      data,
      meta: {
        provider,
        source,
        fetchedAt: new Date().toISOString(),
        rawFormat
      }
    };
  }
}

const FIELD_KEYS = {
  operationRouteCode: ['oprtRouteCd', 'oprtRtCd', 'routeCd', 'routeCode', 'nvg_seawy_cd'],
  licenseRouteCode: ['lcns_seawy_cd'],
  operationRouteName: ['oprtRouteNm', 'oprtRtNm', 'routeNm', 'routeName', 'lineNm', 'nvg_seawy_nm'],
  licenseRouteName: ['licnsRouteNm', 'lcncRouteNm', 'licenseRouteNm', 'lcns_seawy_nm'],
  departurePortName: ['dptrPortNm', 'dptrePortNm', 'depPortNm', 'startPortNm', 'fromPortNm', 'dep_port_nm', 'oport_nm'],
  arrivalPortName: ['arvlPortNm', 'arrPortNm', 'arrivalPortNm', 'endPortNm', 'toPortNm', 'arr_port_nm', 'dest_nm'],
  stopPortName: ['clngPortNm', 'portNm', 'trmnlNm', 'stopPortNm', 'portcl_nm'],
  portCode: ['portCd', 'trmnlCd', 'terminalCd', 'portcl_cd'],
  stopSequence: ['seq', 'clngSeq', 'portSeq', 'stopSeq', 'portcl_sn'],
  latitude: ['lat', 'latitude', 'la'],
  longitude: ['lon', 'lng', 'longitude', 'lo'],
  sailingDate: ['oprtDe', 'sailingDate', 'date', 'schdDate', 'oprt_ymd', 'sail_ymd', 'base_ymd', 'rlvt_ymd'],
  departureTime: ['dptrTm', 'dptrTime', 'depTime', 'shipDptrTm', 'dptr_tm', 'dep_tm', 'sail_tm'],
  vesselCode: ['fshipCd', 'shipCd', 'vsslCd', 'vesselCd', 'fship_cd', 'ship_cd', 'vssl_cd', 'psnshp_cd'],
  vesselName: ['fshipNm', 'shipNm', 'vsslNm', 'vesselNm', 'fship_nm', 'ship_nm', 'vssl_nm', 'psnshp_nm'],
  passengerCapacity: ['psngrCpcty', 'passengerCapacity', 'psncap', 'psng_cpcty', 'psngr_cpcty'],
  operatorName: ['cmpnyNm', 'operatorNm', 'companyNm', 'cmpny_nm', 'oprtr_nm'],
  status: ['oprtStts', 'oprtStatus', 'status', 'sailingStatus', 'oprt_stts', 'oprt_stts_nm', 'nvg_stts_nm'],
  statusCode: ['oprtSttsCd', 'oprt_status_cd', 'oprt_stts_cd', 'nvg_stts_cd', 'nvg_se_cd'],
  forecastStatus: ['oprtPsblYn', 'forecastStatus', 'oprtYn', 'status', 'oprt_psbl_yn', 'oprt_yn'],
  reason: ['ctrlRsn', 'reason', 'rsn', 'remark', 'ctrl_rsn', 'rmrk'],
  weatherSummary: ['weather', 'weatherSummary', 'wthr', 'seaWeather', 'wthr_cn', 'sea_wthr_cn'],
  riskLevel: ['riskLevel', 'risk', 'wrnLevel', 'risk_level', 'wrn_level'],
  gridId: ['gridId', 'grid_id'],
  vesselTrafficCount: ['vmtc', 'vesselTrafficCount', 'trafficCount'],
  trafficDensity: ['dnsty', 'density', 'trafficDensity']
} as const;

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function normalizeItemSailingStatus(item: UnknownRecord) {
  const status = normalizeSailingStatus(pickString(item, FIELD_KEYS.status));
  if (status !== SAILING_STATUS.UNKNOWN) {
    return status;
  }

  const code = pickString(item, FIELD_KEYS.statusCode);
  switch (code) {
    case '1':
    case '4':
      return SAILING_STATUS.NORMAL;
    case '2':
      return SAILING_STATUS.SCHEDULED;
    case '3':
    case '5':
      return SAILING_STATUS.COMPLETED;
    case '6':
      return SAILING_STATUS.CANCELED;
    case '7':
      return SAILING_STATUS.CONTROLLED;
    default:
      return SAILING_STATUS.UNKNOWN;
  }
}

function toPortOptions(portNames: string[]): PortOption[] {
  return [...new Set(portNames.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'ko'))
    .map((portName) => ({
      id: makeStableId('port-option', [portName]),
      portName
    }));
}

function candidateMatches(candidate: ScheduleSearchCandidate, keyword: string) {
  return [
    candidate.vesselName,
    candidate.routeName,
    candidate.licenseRouteName,
    candidate.currentPortName
  ].some((value) => (value ?? '').includes(keyword));
}

function candidateMatchesDeparture(candidate: ScheduleSearchCandidate, keyword: string) {
  const [departure] = splitRouteName(candidate.licenseRouteName ?? '');
  if (departure) {
    return departure.includes(keyword);
  }

  return candidateMatches(candidate, keyword);
}

function candidateMatchesArrival(candidate: ScheduleSearchCandidate, keyword: string) {
  const [, arrival] = splitRouteName(candidate.licenseRouteName ?? '');
  if (arrival) {
    return arrival.includes(keyword);
  }

  return candidateMatches(candidate, keyword);
}

function buildTerminalStopMap(items: UnknownRecord[]) {
  const terminals = new Map<
    string,
    {
      firstSequence: number;
      lastSequence: number;
      departurePortName: string;
      arrivalPortName: string;
    }
  >();

  items.forEach((item) => {
    const key = makeRouteKey(item);
    const portName = pickString(item, FIELD_KEYS.stopPortName);
    if (!key || !portName) {
      return;
    }

    const sequence = pickNumber(item, FIELD_KEYS.stopSequence) ?? Number.MAX_SAFE_INTEGER;
    const current = terminals.get(key);
    if (!current) {
      terminals.set(key, {
        firstSequence: sequence,
        lastSequence: sequence,
        departurePortName: portName,
        arrivalPortName: portName
      });
      return;
    }

    if (sequence < current.firstSequence) {
      current.firstSequence = sequence;
      current.departurePortName = portName;
    }

    if (sequence > current.lastSequence) {
      current.lastSequence = sequence;
      current.arrivalPortName = portName;
    }
  });

  return terminals;
}

function makeRouteKey(item: UnknownRecord) {
  return [
    pickString(item, FIELD_KEYS.licenseRouteCode),
    pickString(item, FIELD_KEYS.operationRouteCode)
  ]
    .filter(Boolean)
    .join(':');
}

function normalizeDate(value: string | null) {
  if (!value) {
    return '';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  return value;
}

function normalizeTime(value: string | null) {
  if (!value) {
    return '';
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length === 3) {
    return `0${digits.slice(0, 1)}:${digits.slice(1, 3)}`;
  }

  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  if (digits.length === 6) {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  return value;
}

function splitRouteName(routeName: string): [string, string] | [] {
  const separators = ['<->', '->', '-', '~'];
  for (const separator of separators) {
    if (routeName.includes(separator)) {
      const [departure, arrival] = routeName.split(separator).map((part) => cleanRouteNamePart(part));
      if (departure && arrival) {
        return [departure, arrival];
      }
    }
  }

  return [];
}

function cleanRouteNamePart(value: string) {
  return value
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSailingStatus(value: string | null) {
  const normalized = (value ?? '').toLowerCase();

  if (!normalized) return SAILING_STATUS.UNKNOWN;
  if (normalized.includes('cancel') || normalized.includes('abort')) return SAILING_STATUS.CANCELED;
  if (normalized.includes('control') || normalized.includes('stop')) return SAILING_STATUS.CONTROLLED;
  if (normalized.includes('delay')) return SAILING_STATUS.DELAYED;
  if (normalized.includes('complete') || normalized.includes('arrival')) return SAILING_STATUS.COMPLETED;
  if (normalized.includes('schedule') || normalized.includes('ready')) return SAILING_STATUS.SCHEDULED;
  if (normalized.includes('normal') || normalized.includes('depart') || value === 'Y') return SAILING_STATUS.NORMAL;

  return SAILING_STATUS.UNKNOWN;
}

function normalizeForecastStatus(value: string | null) {
  const normalized = (value ?? '').toLowerCase();

  if (!normalized) return FORECAST_STATUS.UNKNOWN;
  if (normalized === 'n' || normalized.includes('no') || normalized.includes('unavailable')) return FORECAST_STATUS.UNAVAILABLE;
  if (normalized.includes('control')) return FORECAST_STATUS.CONTROL_POSSIBLE;
  if (normalized.includes('uncertain')) return FORECAST_STATUS.UNCERTAIN;
  if (normalized.includes('caution') || normalized.includes('warning')) return FORECAST_STATUS.CAUTION;
  if (normalized === 'y' || normalized.includes('available') || normalized.includes('normal')) return FORECAST_STATUS.AVAILABLE;

  return FORECAST_STATUS.UNKNOWN;
}

function normalizeRiskLevel(value: string | null) {
  const normalized = (value ?? '').toLowerCase();

  if (!normalized) return RISK_LEVEL.UNKNOWN;
  if (normalized.includes('high')) return RISK_LEVEL.HIGH;
  if (normalized.includes('medium') || normalized.includes('mid')) return RISK_LEVEL.MEDIUM;
  if (normalized.includes('low') || normalized.includes('normal')) return RISK_LEVEL.LOW;

  return RISK_LEVEL.UNKNOWN;
}

function normalizeCongestionLevel(density: number | null): RealtimeTrafficSummary['congestionLevel'] {
  if (density === null) return 'UNKNOWN';
  if (density >= 70) return 'HIGH';
  if (density >= 35) return 'MEDIUM';
  return 'LOW';
}

function getDateRange(startDate: string, days: number) {
  const start = new Date(startDate);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function getDateRangeBetween(startDate: string, endDate?: string) {
  if (!endDate) return getDateRange(startDate, 7);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const days = Math.min(Math.max(diffDays, 1), 31);

  return getDateRange(startDate, days);
}

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10).replace(/\D/g, '');
}

function getTomorrowYmd() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10).replace(/\D/g, '');
}
