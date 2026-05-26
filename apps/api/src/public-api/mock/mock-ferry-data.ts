import { FORECAST_STATUS, RISK_LEVEL, SAILING_STATUS } from '@badagil/shared';
import type {
  Port,
  RouteStop,
  RouteSummary,
  SailingScheduleSummary,
  TodayStatusSummary,
  TomorrowForecastSummary,
  Vessel
} from '@badagil/shared';

export const mockPorts: Port[] = [
  {
    id: 'port-incheon',
    portCode: 'ICN',
    portName: '인천항',
    regionName: '인천광역시',
    latitude: 37.4603,
    longitude: 126.5922
  },
  {
    id: 'port-baengnyeong',
    portCode: 'BN',
    portName: '백령도',
    regionName: '인천광역시 옹진군',
    latitude: 37.9672,
    longitude: 124.6304
  },
  {
    id: 'port-deokjeok',
    portCode: 'DJ',
    portName: '덕적도',
    regionName: '인천광역시 옹진군',
    latitude: 37.2268,
    longitude: 126.1489
  },
  {
    id: 'port-socheong',
    portCode: 'SC',
    portName: '소청도',
    regionName: '인천광역시 옹진군',
    latitude: 37.7605,
    longitude: 124.7248
  },
  {
    id: 'port-daecheong',
    portCode: 'DC',
    portName: '대청도',
    regionName: '인천광역시 옹진군',
    latitude: 37.8244,
    longitude: 124.7056
  }
];

export const mockRoutes: RouteSummary[] = [
  {
    id: 'route-incheon-baengnyeong',
    departurePortName: '인천항',
    arrivalPortName: '백령도',
    operationRouteName: '인천-백령',
    licenseRouteName: '인천-백령',
    provider: 'KOMSA'
  },
  {
    id: 'route-incheon-deokjeok',
    departurePortName: '인천항',
    arrivalPortName: '덕적도',
    operationRouteName: '인천-덕적',
    licenseRouteName: '인천-덕적',
    provider: 'KOMSA'
  }
];

export const mockRouteStops: Record<string, RouteStop[]> = {
  'route-incheon-baengnyeong': [
    {
      id: 'stop-incheon',
      routeId: 'route-incheon-baengnyeong',
      stopSequence: 1,
      portCode: 'ICN',
      portName: '인천항',
      latitude: 37.4603,
      longitude: 126.5922
    },
    {
      id: 'stop-socheong',
      routeId: 'route-incheon-baengnyeong',
      stopSequence: 2,
      portCode: 'SC',
      portName: '소청도',
      latitude: 37.7605,
      longitude: 124.7248
    },
    {
      id: 'stop-daecheong',
      routeId: 'route-incheon-baengnyeong',
      stopSequence: 3,
      portCode: 'DC',
      portName: '대청도',
      latitude: 37.8244,
      longitude: 124.7056
    },
    {
      id: 'stop-baengnyeong',
      routeId: 'route-incheon-baengnyeong',
      stopSequence: 4,
      portCode: 'BN',
      portName: '백령도',
      latitude: 37.9672,
      longitude: 124.6304
    }
  ],
  'route-incheon-deokjeok': [
    {
      id: 'stop-incheon-deokjeok',
      routeId: 'route-incheon-deokjeok',
      stopSequence: 1,
      portCode: 'ICN',
      portName: '인천항',
      latitude: 37.4603,
      longitude: 126.5922
    },
    {
      id: 'stop-deokjeok',
      routeId: 'route-incheon-deokjeok',
      stopSequence: 2,
      portCode: 'DJ',
      portName: '덕적도',
      latitude: 37.2268,
      longitude: 126.1489
    }
  ]
};

export const mockVessels: Vessel[] = [
  {
    id: 'vessel-harmony-flower',
    vesselCode: 'HF001',
    vesselName: '하모니플라워호',
    passengerCapacity: 500,
    operatorName: '고려고속훼리'
  },
  {
    id: 'vessel-korea-pride',
    vesselCode: 'KP001',
    vesselName: '코리아프라이드호',
    passengerCapacity: 556,
    operatorName: '고려고속훼리'
  }
];

export const mockSchedules: SailingScheduleSummary[] = [
  {
    id: 'schedule-incheon-baengnyeong-0830',
    sailingDate: '2026-05-26',
    departureTime: '08:30',
    departurePortName: '인천항',
    arrivalPortName: '백령도',
    routeId: 'route-incheon-baengnyeong',
    vesselId: 'vessel-harmony-flower',
    vesselName: '하모니플라워호',
    status: SAILING_STATUS.NORMAL,
    controlReason: null,
    passengerCapacity: 500
  },
  {
    id: 'schedule-incheon-baengnyeong-1300',
    sailingDate: '2026-05-26',
    departureTime: '13:00',
    departurePortName: '인천항',
    arrivalPortName: '백령도',
    routeId: 'route-incheon-baengnyeong',
    vesselId: 'vessel-korea-pride',
    vesselName: '코리아프라이드호',
    status: SAILING_STATUS.SCHEDULED,
    controlReason: null,
    passengerCapacity: 556
  },
  {
    id: 'schedule-incheon-deokjeok-0930',
    sailingDate: '2026-05-26',
    departureTime: '09:30',
    departurePortName: '인천항',
    arrivalPortName: '덕적도',
    routeId: 'route-incheon-deokjeok',
    vesselId: null,
    vesselName: '코리아나호',
    status: SAILING_STATUS.NORMAL,
    controlReason: null,
    passengerCapacity: 300
  }
];

export const mockTodayStatuses: TodayStatusSummary[] = [
  {
    route: mockRoutes[0],
    status: SAILING_STATUS.NORMAL,
    nextDeparture: mockSchedules[0],
    updatedAt: '2026-05-26T06:00:00.000Z'
  },
  {
    route: mockRoutes[1],
    status: SAILING_STATUS.NORMAL,
    nextDeparture: mockSchedules[2],
    updatedAt: '2026-05-26T06:00:00.000Z'
  }
];

export const mockTomorrowForecasts: TomorrowForecastSummary[] = [
  {
    route: mockRoutes[0],
    status: FORECAST_STATUS.CAUTION,
    reason: '기상 영향 가능성',
    weatherSummary: '풍랑 또는 시정 악화 가능성이 있어 출발 전 재확인이 필요합니다.',
    riskLevel: RISK_LEVEL.MEDIUM,
    updatedAt: '2026-05-26T06:00:00.000Z'
  },
  {
    route: mockRoutes[1],
    status: FORECAST_STATUS.AVAILABLE,
    reason: null,
    weatherSummary: '현재 예보 기준 운항 가능성이 높습니다.',
    riskLevel: RISK_LEVEL.LOW,
    updatedAt: '2026-05-26T06:00:00.000Z'
  }
];
