import type { ForecastStatus } from '../constants/forecast-status';
import type { FavoriteType } from '../constants/favorite-type';
import type { RiskLevel } from '../constants/risk-level';
import type { SailingStatus } from '../constants/sailing-status';

export type Port = {
  id: string;
  portCode: string;
  portName: string;
  regionName: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Terminal = {
  id: string;
  portId: string | null;
  terminalCode: string | null;
  terminalName: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
};

export type RouteSummary = {
  id: string;
  departurePortName: string;
  arrivalPortName: string;
  operationRouteName: string;
  licenseRouteName: string | null;
  provider: string;
};

export type RouteStop = {
  id: string;
  routeId: string;
  stopSequence: number;
  portCode: string | null;
  portName: string;
  latitude: number | null;
  longitude: number | null;
};

export type Vessel = {
  id: string;
  vesselCode: string | null;
  vesselName: string;
  passengerCapacity: number | null;
  operatorName: string | null;
};

export type VesselDetail = {
  id: string;
  shipNo: string;
  vesselName: string;
  imageUrl: string | null;
  imageDataUrl: string | null;
  sourceUrl: string;
  grossTonnage: string | null;
  dimensions: string | null;
  shipType: string | null;
  shipKind: string | null;
  maxSpeed: string | null;
  cruiseSpeed: string | null;
  engineType: string | null;
  enginePower: string | null;
  navigationArea: string | null;
  passengerCapacity: string | null;
  routeName: string | null;
  operatorName: string | null;
  collectedAt: string;
};

export type SailingScheduleSummary = {
  id: string;
  sailingDate: string;
  departureTime: string;
  departurePortName: string;
  arrivalPortName: string;
  routeId: string | null;
  vesselId: string | null;
  vesselName: string | null;
  status: SailingStatus;
  controlReason: string | null;
  passengerCapacity: number | null;
};

export type RealtimeTrafficSummary = {
  id: string;
  gridId: string;
  vesselTrafficCount: number | null;
  density: number | null;
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  observedAt: string;
};

export type IslandSummary = {
  id: string;
  islandName: string;
  provinceName: string | null;
  cityName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  areaSquareMeters: number | null;
  coastlineLengthMeters: number | null;
  population: number | null;
  description: string | null;
  source: 'VWORLD' | 'MOCK';
  updatedAt: string;
};

export type IslandTravelAttraction = {
  id: string;
  title: string;
  category: string | null;
  address: string | null;
  imageUrl: string | null;
  mapX: number | null;
  mapY: number | null;
  detailFields?: IslandTravelDetailField[];
  source: 'TOUR_API' | 'MOCK';
};

export type IslandTravelDetailField = {
  label: string;
  value: string;
};

export type IslandTravelCamp = {
  id: string;
  name: string;
  address: string | null;
  facilitySummary: string | null;
  reservation: string | null;
  restriction: string | null;
  status: 'AVAILABLE' | 'PARTIAL' | 'CHECK_REQUIRED' | 'RESTRICTED' | 'PROHIBITED';
  detailFields?: IslandTravelDetailField[];
  source: 'GOCAMPING' | 'CULTURE_CAMPING' | 'LOCAL_CAMPGROUND' | 'MOCK';
};

export type IslandTravelSafetyIndex = {
  id: string;
  title: string;
  areaName: string | null;
  score: string | null;
  advisory: string;
  forecastDate: string | null;
  source: 'KHOA_SEA_TRIP' | 'MOCK';
};

export type IslandTravelLodging = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tel: string | null;
  status: string | null;
  detailFields?: IslandTravelDetailField[];
  source: 'LOCAL_LODGING' | 'MOCK';
};

export type IslandTravelPension = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tel: string | null;
  status: string | null;
  detailFields?: IslandTravelDetailField[];
  source: 'TOURIST_PENSION' | 'MOCK';
};

export type IslandTravelRestaurant = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tel: string | null;
  representativeMenu: string | null;
  status: string | null;
  detailFields?: IslandTravelDetailField[];
  source: 'TOURIST_RESTAURANT' | 'MOCK';
};

export type IslandTravelMudFlat = {
  id: string;
  name: string;
  address: string | null;
  areaName: string | null;
  description: string | null;
  experience: string | null;
  tel: string | null;
  source: 'MUD_FLAT' | 'MOCK';
};

export type IslandTravelPhoto = {
  id: string;
  title: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  locationName: string | null;
  photographer: string | null;
  searchKeywords?: string | null;
  source: 'TOUR_PHOTO' | 'BORYEONG_ISLAND_PHOTO' | 'MOCK';
};

export type IslandTravelApiStatus = {
  status: 'OK' | 'EMPTY' | 'ERROR';
  message: string;
};

export type IslandTravelInfo = {
  islandName: string;
  attractions: IslandTravelAttraction[];
  camps: IslandTravelCamp[];
  lodgings: IslandTravelLodging[];
  pensions: IslandTravelPension[];
  restaurants: IslandTravelRestaurant[];
  mudFlats: IslandTravelMudFlat[];
  safetyIndexes: IslandTravelSafetyIndex[];
  photos: IslandTravelPhoto[];
  sourceSummary: {
    tourism: string;
    camping: string;
    lodging: string;
    pension: string;
    food: string;
    mudFlat: string;
    safety: string;
    photo: string;
  };
  apiStatus: {
    tourism: IslandTravelApiStatus;
    camping: IslandTravelApiStatus;
    lodging: IslandTravelApiStatus;
    pension: IslandTravelApiStatus;
    food: IslandTravelApiStatus;
    mudFlat: IslandTravelApiStatus;
    safety: IslandTravelApiStatus;
    photo: IslandTravelApiStatus;
  };
  updatedAt: string;
};

export type TodayStatusSummary = {
  route: RouteSummary;
  status: SailingStatus;
  nextDeparture: SailingScheduleSummary | null;
  updatedAt: string;
};

export type TomorrowForecastSummary = {
  route: RouteSummary;
  status: ForecastStatus;
  reason: string | null;
  weatherSummary: string | null;
  riskLevel: RiskLevel;
  updatedAt: string;
};

export type MarineForecastApiStatus = {
  status: 'OK' | 'EMPTY' | 'ERROR';
  message: string;
};

export type MarineForecastLocation = {
  id: string;
  label: string;
  helper: string;
  kind: 'PORT' | 'ISLAND' | 'SEA_AREA';
  aliases: string[];
  nx: number;
  ny: number;
  stationCode: string;
  stationName: string;
  salinityGridCode: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceNote: string;
};

export type MarineShortTermForecast = {
  id: string;
  forecastDate: string | null;
  forecastTime: string | null;
  category: string;
  label: string;
  value: string;
  unit: string | null;
};

export type MarineWeatherWarning = {
  id: string;
  title: string;
  areaName: string | null;
  issuedAt: string | null;
  message: string;
};

export type MarineTideForecast = {
  id: string;
  stationName: string | null;
  eventType: string | null;
  eventTime: string | null;
  tideLevel: string | null;
};

export type MarineWaterTemperature = {
  id: string;
  stationName: string | null;
  observedAt: string | null;
  temperature: string | null;
};

export type MarineSalinity = {
  id: string;
  stationName: string | null;
  observedAt: string | null;
  salinity: string | null;
};

export type MarineForecastOverview = {
  locationName: string;
  generatedAt: string;
  summary: string;
  riskLevel: RiskLevel;
  shortTermForecasts: MarineShortTermForecast[];
  weatherWarnings: MarineWeatherWarning[];
  tideForecasts: MarineTideForecast[];
  waterTemperatures: MarineWaterTemperature[];
  salinities: MarineSalinity[];
  sourceSummary: {
    shortTerm: string;
    warning: string;
    tide: string;
    waterTemperature: string;
    salinity: string;
  };
  apiStatus: {
    shortTerm: MarineForecastApiStatus;
    warning: MarineForecastApiStatus;
    tide: MarineForecastApiStatus;
    waterTemperature: MarineForecastApiStatus;
    salinity: MarineForecastApiStatus;
  };
};

export type UserFavorite = {
  id: string;
  userId: string;
  favoriteType: FavoriteType;
  targetId: string;
  notificationEnabled: boolean;
  createdAt: string;
};

export type NotificationRule = {
  id: string;
  userId: string;
  favoriteId: string | null;
  notifyStatusChange: boolean;
  notifyDepartureMinutesBefore: number | null;
  notifyForecastUpdate: boolean;
  updatedAt: string;
};
