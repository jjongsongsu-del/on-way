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
  islandTypeName?: string | null;
  connectionTypeName?: string | null;
  bridgeNames?: string | null;
  legalDongCode?: string | null;
  islandUniqueNo?: string | null;
  forecastLocationId?: string | null;
  forecastLocationName?: string | null;
  travelRegionId?: string | null;
  travelRegionName?: string | null;
  source: 'VWORLD' | 'MOCK' | 'LOCAL_ISLAND_MASTER';
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
  source: 'TOURIST_PENSION' | 'LOCAL_PENSION' | 'MOCK';
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
  source: 'TOURIST_RESTAURANT' | 'LOCAL_RESTAURANT' | 'MOCK';
};

export type IslandTravelFacility = {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  tel: string | null;
  status: string | null;
  detailFields?: IslandTravelDetailField[];
  source: 'LOCAL_FACILITY' | 'MOCK';
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
  otherFacilities: IslandTravelFacility[];
  mudFlats: IslandTravelMudFlat[];
  safetyIndexes: IslandTravelSafetyIndex[];
  photos: IslandTravelPhoto[];
  sourceSummary: {
    tourism: string;
    camping: string;
    lodging: string;
    pension: string;
    food: string;
    facility: string;
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
    facility: IslandTravelApiStatus;
    mudFlat: IslandTravelApiStatus;
    safety: IslandTravelApiStatus;
    photo: IslandTravelApiStatus;
  };
  updatedAt: string;
};

export type TripRecommendationAsset = {
  id: string;
  name: string;
  category: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceTitle: string;
  sourceDatasetPk: string;
  sourceKeywords?: string[];
  travelRegionId: string | null;
  travelRegionName: string | null;
  matchedIslandId: string | null;
  matchedIslandName: string | null;
  matchScore: number;
  recommendationScore: number;
  tags: string[];
  reasons: string[];
};

export type TripRecommendationCourse = {
  id: string;
  title: string;
  summary: string;
  regionName: string | null;
  style: string;
  duration: string | null;
  totalDistanceKm: number | null;
  estimatedTravelMinutes: number | null;
  distanceSummary: string | null;
  score: number;
  assets: TripRecommendationAsset[];
  stops: string[];
  tags: string[];
  reasons: string[];
};

export type TripRecommendationOverview = {
  query: {
    regionKind: 'all' | 'travel' | 'forecast' | 'admin' | null;
    regionId: string | null;
    regionName: string | null;
    keyword: string | null;
    assetId: string | null;
    travelRegionId: string | null;
    islandId: string | null;
    style: string | null;
    duration: string | null;
    companions: string | null;
    transport: string | null;
    difficulty: string | null;
    budget: string | null;
    stayType: string | null;
    facilities: string[];
    activities: string[];
    limit: number;
  };
  assets: TripRecommendationAsset[];
  courses: TripRecommendationCourse[];
  summary: {
    totalAssets: number;
    totalCourses: number;
    regionNames: string[];
    categories: Record<string, number>;
  };
  updatedAt: string;
};

export type RecommendedIsland = {
  id: string;
  islandName: string;
  displayName: string | null;
  provinceName: string | null;
  cityName: string | null;
  islandKey: string | null;
  description: string;
  address: string | null;
  contact: string | null;
  photoDescription: string | null;
  ferrySummary: string | null;
  trafficInfo: string | null;
  lodgingInfo: string | null;
  foodInfo: string | null;
  nearbyAttractions: string | null;
  photoUrls: string[];
  sourceData: Record<string, unknown> | null;
  highlights: string[];
  tags: string[];
  travelStyles: string[];
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  priority: number;
  matchedIsland: IslandSummary | null;
  photo: IslandTravelPhoto | null;
};

export type CruisePort = {
  id: string;
  portKey: string;
  portName: string;
  regionName: string | null;
  cityName: string | null;
  terminalName: string | null;
  sourceName: string;
  sourceUrl: string | null;
};

export type CruiseVessel = {
  id: string;
  vesselKey: string;
  vesselName: string;
  operatorName: string | null;
  registryCountry: string | null;
  grossTonnage: number | null;
  lengthMeter: number | null;
  maxDraftMeter: number | null;
  airDraftMeter: number | null;
  crewCount: number | null;
  passengerCapacity: number | null;
  sourceName: string;
};

export type CruiseSchedule = {
  id: string;
  scheduleKey: string;
  port: CruisePort;
  vessel: CruiseVessel | null;
  vesselName: string;
  operatorName: string | null;
  arrivalDate: string;
  arrivalTime: string | null;
  departureDate: string | null;
  departureTime: string | null;
  homePortCode: string | null;
  homePortName: string | null;
  previousPortCode: string | null;
  previousPortName: string | null;
  nextPortCode: string | null;
  nextPortName: string | null;
  berthName: string | null;
  scheduleType: string | null;
  agentName: string | null;
  agentTel: string | null;
  sourceName: string;
  sourceUrl: string | null;
  collectedAt: string;
};

export type CruiseTourProduct = {
  id: string;
  productKey: string;
  port: CruisePort | null;
  productName: string;
  address: string | null;
  priceText: string | null;
  operatingHours: string | null;
  closedDays: string | null;
  travelTimeText: string | null;
  imageIncluded: boolean;
  accessibility: Record<string, unknown> | null;
  description: string | null;
  sourceName: string;
  sourceUrl: string | null;
  referenceDate: string | null;
};

export type CruiseOperatorLicense = {
  id: string;
  licenseKey: string;
  port: CruisePort | null;
  managementNo: string | null;
  businessName: string;
  businessStatus: string | null;
  detailStatus: string | null;
  roadAddress: string | null;
  lotAddress: string | null;
  phone: string | null;
  permitDate: string | null;
  closeDate: string | null;
  localGovernmentCode: string | null;
  localGovernmentName: string | null;
  x: number | null;
  y: number | null;
  sourceName: string;
  sourceUrl: string | null;
  collectedAt: string;
};

export type CruiseOverview = {
  ports: CruisePort[];
  upcomingSchedules: CruiseSchedule[];
  tourProducts: CruiseTourProduct[];
  operatorLicenses: CruiseOperatorLicense[];
  summary: {
    totalPorts: number;
    totalVessels: number;
    totalSchedules: number;
    upcomingSchedules: number;
    totalTourProducts: number;
    totalOperatorLicenses: number;
    activeOperatorLicenses: number;
    sourceNames: string[];
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
