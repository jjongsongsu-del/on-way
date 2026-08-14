import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import {
  Anchor,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Car,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Compass,
  Heart,
  History,
  Images,
  MapPin,
  Sailboat,
  Search,
  ShieldCheck,
  Star,
  Tent,
  Trash2,
  Users,
  Waves,
  X
} from 'lucide-react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import type { IslandSummary, MarineForecastLocation, MarineForecastOverview, RecommendedIsland, SailingStatus, TripRecommendationAsset } from '@badagil/shared';
import { fetchIslandsResponse } from '@/api/islands';
import { fetchIslandTravelInfo, fetchRecommendedIslands, searchTravelAssets } from '@/api/island-trips';
import { fetchMarineForecast, fetchMarineForecastLocations } from '@/api/forecasts';
import { fetchRouteOptions, type RouteOption } from '@/api/routes';
import { fetchScheduleCandidates, type ScheduleCandidate } from '@/api/schedules';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { setCurrentIsland, setCurrentRoute } from '@/state/app-selection-context';
import { colors } from '@/theme/colors';

type TripType = 'day' | 'overnight' | 'camping' | 'carcamping' | 'family' | 'leisure' | 'quiet';
type TripSectionKey = 'available' | 'types' | 'detail' | 'course' | 'saved';
type TravelDetailTab = 'basic' | 'ferry' | 'attractions' | 'camping' | 'lodging' | 'food' | 'mudflat' | 'facilities' | 'safety';

type TripRecommendation = {
  id: string;
  islandName: string;
  departurePortName: string;
  routeName: string;
  firstDeparture: string | null;
  lastDeparture: string | null;
  durationLabel: string;
  status: SailingStatus;
  tripTypes: TripType[];
  island: IslandSummary | null;
};

type TripTypeGuide = {
  headline: string;
  summary: string;
  bestFor: string[];
  checklist: string[];
  nextTab: TravelDetailTab;
};

type SavedIslandSearch = {
  id: string;
  kind?: 'island' | 'keyword';
  islandName: string;
  provinceName: string | null;
  cityName: string | null;
  displayName?: string;
  keyword?: string;
  savedAt?: string;
  searchedAt?: string;
};

type UnifiedSearchResult = {
  id: string;
  group:
    | '기본정보'
    | '배편·선착장'
    | '관광·체험'
    | '걷기·트레킹'
    | '해변·해수욕'
    | '해양레저'
    | '맛집·시장'
    | '숙박'
    | '캠핑·야영'
    | '갯벌·물때'
    | '편의시설'
    | '공원·무장애'
    | '축제·행사'
    | '사진·전망'
    | '안전정보';
  title: string;
  description: string;
  tab: TravelDetailTab;
  island: IslandSummary | null;
  badge?: string | null;
  address?: string | null;
  source?: string | null;
  detailRows?: { label: string; value: string | null | undefined }[];
};

type UnifiedSearchFilter = '전체' | UnifiedSearchResult['group'];

type IslandTravelRegionOption = {
  id: string;
  name: string;
  count: number;
};

type TravelInfoCardItem = {
  id: string;
  tab?: TravelDetailTab;
  group?: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  badge?: string | null;
  address?: string | null;
  tel?: string | null;
  source?: string | null;
  detailRows?: { label: string; value: string | null | undefined }[];
};

type PurposeChecklistItem = {
  id: string;
  title: string;
  description: string;
  tone: 'good' | 'warning' | 'danger' | 'neutral';
};

const ISLAND_TRIP_FAVORITES_KEY = 'badagil:island-trip:favorites';
const ISLAND_TRIP_RECENTS_KEY = 'badagil:island-trip:recents';
const unifiedSearchFilters: UnifiedSearchFilter[] = [
  '전체',
  '기본정보',
  '배편·선착장',
  '관광·체험',
  '걷기·트레킹',
  '해변·해수욕',
  '해양레저',
  '맛집·시장',
  '숙박',
  '캠핑·야영',
  '갯벌·물때',
  '편의시설',
  '공원·무장애',
  '축제·행사',
  '사진·전망',
  '안전정보'
];

const defaultDeparturePorts = ['인천', '목포', '통영', '여수', '포항', '완도'];

const regionDeparturePortMap: Record<string, string[]> = {
  'incheon-coast': ['인천'],
  'daechung-baengnyeong': ['인천'],
  'deokjeok-guleop': ['인천'],
  'mokpo-coast': ['목포'],
  'heuksan-hongdo': ['목포'],
  'gunsan-coast': ['군산'],
  'boryeong-coast': ['보령', '대천'],
  'wando-coast': ['완도'],
  'yeosu-coast': ['여수'],
  'tongyeong-coast': ['통영'],
  'geoje-coast': ['통영'],
  'pohang-ulleung': ['포항'],
  'jeju-coast': ['제주']
};

const tripTypes: { id: TripType; label: string; description: string; icon: typeof Clock3 }[] = [
  { id: 'day', label: '당일치기', description: '첫 배와 마지막 배 기준으로 하루 안에 다녀오기 좋은 섬', icon: Clock3 },
  { id: 'overnight', label: '1박 2일', description: '숙박 또는 캠핑을 곁들이기 좋은 일정', icon: CalendarDays },
  { id: 'camping', label: '캠핑', description: '야영장, 해수욕장, 편의시설을 함께 확인', icon: Tent },
  { id: 'carcamping', label: '차박', description: '차량 이동, 주차, 화장실 접근성을 우선 확인', icon: Car },
  { id: 'family', label: '가족여행', description: '이동 난이도가 낮고 편의시설이 좋은 섬', icon: Users },
  { id: 'leisure', label: '낚시·레저', description: '낚시 포인트와 해양레저 중심 코스', icon: Waves },
  { id: 'quiet', label: '조용한 여행', description: '혼잡도가 낮은 힐링형 섬', icon: Heart }
];

const statusLabel: Record<SailingStatus, string> = {
  NORMAL: '정상',
  SCHEDULED: '예정',
  DELAYED: '지연',
  CANCELED: '결항',
  CONTROLLED: '통제',
  COMPLETED: '완료',
  UNKNOWN: '확인 필요'
};

const statusTone: Record<SailingStatus, 'good' | 'warning' | 'danger' | 'neutral'> = {
  NORMAL: 'good',
  SCHEDULED: 'neutral',
  DELAYED: 'warning',
  CANCELED: 'danger',
  CONTROLLED: 'danger',
  COMPLETED: 'neutral',
  UNKNOWN: 'neutral'
};

const tripTypeText: Record<TripType, string> = {
  day: '당일치기',
  overnight: '1박 2일',
  camping: '캠핑',
  carcamping: '차박',
  family: '가족여행',
  leisure: '낚시·레저',
  quiet: '조용한 여행'
};

const tripTypeGuides: Record<TripType, TripTypeGuide> = {
  day: {
    headline: '첫 배와 마지막 배 사이가 넉넉한 섬을 우선 추천해요',
    summary: '당일치기는 복귀 배편이 핵심이라 운항 후보가 2건 이상 있는 섬을 먼저 보여줍니다.',
    bestFor: ['첫 배 빠름', '복귀 배편 있음', '도보 이동 쉬움'],
    checklist: ['마지막 배 시간 확인', '식사 가능 시간 확인', '항구 이동 시간 확보'],
    nextTab: 'ferry'
  },
  overnight: {
    headline: '숙박과 다음 날 복귀까지 고려해 여유 있는 섬을 골라요',
    summary: '1박 2일은 숙박 후보와 안전 정보를 함께 보면서 날씨 변동에 대비하는 흐름이 좋아요.',
    bestFor: ['숙박 후보', '여유 일정', '기상 확인'],
    checklist: ['숙박·펜션 확인', '내일 운항예보 확인', '비상 복귀 동선 확인'],
    nextTab: 'lodging'
  },
  camping: {
    headline: '야영장·해수욕장·편의시설 정보를 함께 확인해요',
    summary: '캠핑은 공식 허용 여부와 현장 통제가 자주 바뀌므로 가능성보다 확인 절차를 먼저 보여줍니다.',
    bestFor: ['야영 후보', '화장실', '급수·매점'],
    checklist: ['야영 제한 확인', '화장실·급수대 확인', '풍속·강수 확인'],
    nextTab: 'camping'
  },
  carcamping: {
    headline: '차량 이동과 주차 접근성을 우선으로 봐요',
    summary: '차박은 공식 허용 여부가 중요해서 주차, 화장실, 현장 안내문 확인을 한 묶음으로 안내합니다.',
    bestFor: ['차량 선적', '주차 접근', '화장실'],
    checklist: ['차량 선적 가능 여부', '주차 가능 구역', '현장 안내문 확인'],
    nextTab: 'facilities'
  },
  family: {
    headline: '이동 난이도가 낮고 편의시설이 있는 섬을 먼저 봐요',
    summary: '가족여행은 짧은 이동, 식사, 화장실, 복귀 안정성이 중요해 편의 정보를 함께 확인합니다.',
    bestFor: ['짧은 이동', '식당·편의', '안전한 복귀'],
    checklist: ['소요시간 확인', '식당·편의시설 확인', '아이 동반 위험 구간 확인'],
    nextTab: 'food'
  },
  leisure: {
    headline: '낚시·레저 포인트와 바다 상태를 같이 봐요',
    summary: '레저 목적이면 파고, 풍속, 갯벌·해안 접근 정보를 함께 확인하는 편이 안전합니다.',
    bestFor: ['해안 접근', '갯벌·레저', '바다 상태'],
    checklist: ['파고·풍속 확인', '갯벌 물때 확인', '기상특보 확인'],
    nextTab: 'mudflat'
  },
  quiet: {
    headline: '혼잡도가 낮고 머무는 시간이 긴 섬을 골라요',
    summary: '조용한 여행은 빠른 이동보다 여유 시간과 안전한 복귀가 중요해 숙박·안전 정보를 같이 봅니다.',
    bestFor: ['여유 체류', '전망·산책', '혼잡도 낮음'],
    checklist: ['복귀 배편 여유', '숙박 후보 확인', '날씨 변화 확인'],
    nextTab: 'safety'
  }
};

const tripSectionMenu: { key: TripSectionKey; label: string; description: string }[] = [
  { key: 'detail', label: '섬 상세', description: '검색·이해' },
  { key: 'saved', label: '저장한 섬', description: '다시 보기' }
];

const travelDetailTabs: { key: TravelDetailTab; label: string }[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'ferry', label: '배편' },
  { key: 'attractions', label: '관광지' },
  { key: 'camping', label: '캠핑·차박' },
  { key: 'lodging', label: '숙박·펜션' },
  { key: 'food', label: '식당' },
  { key: 'mudflat', label: '갯벌' },
  { key: 'facilities', label: '편의시설' },
  { key: 'safety', label: '안전정보' }
];

export default function IslandTripScreen() {
  const routeParams = useLocalSearchParams<{
    section?: string | string[];
    islandName?: string | string[];
    provinceName?: string | string[];
    cityName?: string | string[];
    tab?: string | string[];
  }>();
  const today = useMemo(() => formatDate(new Date()), []);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [activeSection, setActiveSection] = useState<TripSectionKey>('detail');
  const [sectionPositions, setSectionPositions] = useState<Partial<Record<TripSectionKey, number>>>({});
  const [departurePort, setDeparturePort] = useState(defaultDeparturePorts[0]);
  const [availableDepartureFilter, setAvailableDepartureFilter] = useState('ALL');
  const [availableTypeFilter, setAvailableTypeFilter] = useState<TripType | 'ALL'>('ALL');
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [pendingDetailScroll, setPendingDetailScroll] = useState(false);
  const [selectedType, setSelectedType] = useState<TripType>('day');
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<TravelDetailTab>('attractions');
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [detailIslandOverride, setDetailIslandOverride] = useState<IslandSummary | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [unifiedSearchKeyword, setUnifiedSearchKeyword] = useState('');
  const [submittedUnifiedKeyword, setSubmittedUnifiedKeyword] = useState('');
  const [unifiedSearchVisible, setUnifiedSearchVisible] = useState(false);
  const [isQuickPanelExpanded, setQuickPanelExpanded] = useState(false);
  const [favoriteIslands, setFavoriteIslands] = useState<SavedIslandSearch[]>(() => readSavedIslandSearches(ISLAND_TRIP_FAVORITES_KEY));
  const [recentIslandSearches, setRecentIslandSearches] = useState<SavedIslandSearch[]>(() => readSavedIslandSearches(ISLAND_TRIP_RECENTS_KEY));
  const [favoriteNameModalVisible, setFavoriteNameModalVisible] = useState(false);
  const [favoriteNameDraft, setFavoriteNameDraft] = useState('');
  const [pendingFavoriteIsland, setPendingFavoriteIsland] = useState<IslandSummary | null>(null);
  const [selectedTravelItem, setSelectedTravelItem] = useState<TravelInfoCardItem | null>(null);
  const [selectedTravelRegionId, setSelectedTravelRegionId] = useState<string | null>(null);
  const [selectedRecommendedRegionId, setSelectedRecommendedRegionId] = useState<string | null>(null);

  const islandsQuery = useQuery({
    queryKey: ['island-trip-islands'],
    queryFn: () => fetchIslandsResponse(),
    staleTime: 24 * 60 * 60 * 1000
  });
  const routeOptionsQuery = useQuery({
    queryKey: ['island-trip-route-options'],
    queryFn: fetchRouteOptions,
    staleTime: 30 * 60 * 1000
  });
  const forecastLocationsQuery = useQuery({
    queryKey: ['marine-forecast-locations'],
    queryFn: fetchMarineForecastLocations,
    staleTime: 24 * 60 * 60 * 1000
  });
  const travelRegions = forecastLocationsQuery.data ?? [];
  const islandTravelRegions = useMemo(() => buildIslandTravelRegionOptions(islandsQuery.data?.data ?? []), [islandsQuery.data?.data]);
  const selectedRecommendedRegion = islandTravelRegions.find((region) => region.id === selectedRecommendedRegionId) ?? islandTravelRegions[0] ?? null;
  const recommendedIslandsQuery = useQuery({
    queryKey: ['island-trip-recommended-islands', selectedRecommendedRegion?.id],
    queryFn: () =>
      fetchRecommendedIslands(18, {
        travelRegionId: selectedRecommendedRegion?.id,
        regionName: selectedRecommendedRegion?.name
      }),
    enabled: Boolean(selectedRecommendedRegion?.id),
    staleTime: 30 * 60 * 1000
  });
  const selectedTravelRegion = travelRegions.find((region) => region.id === selectedTravelRegionId) ?? null;
  const regionDeparturePorts = useMemo(() => getRegionDeparturePorts(selectedTravelRegion), [selectedTravelRegion]);
  const activeDeparturePorts = useMemo(
    () => (availableDepartureFilter === 'ALL' ? regionDeparturePorts : regionDeparturePorts.filter((port) => port === availableDepartureFilter)),
    [availableDepartureFilter, regionDeparturePorts]
  );
  const scheduleQueries = useQueries({
    queries: activeDeparturePorts.map((port) => ({
      queryKey: ['island-trip-candidates', today, port],
      queryFn: () => fetchScheduleCandidates({ date: today, departure: port }),
      staleTime: 3 * 60 * 1000
    }))
  });
  const isAvailableLoading = scheduleQueries.some((query) => query.isFetching);
  const isAvailableError = scheduleQueries.some((query) => query.isError);

  const recommendations = useMemo(
    () =>
      activeDeparturePorts.flatMap((port, index) =>
        buildTripRecommendations({
          candidates: scheduleQueries[index]?.data ?? [],
          islands: islandsQuery.data?.data ?? [],
          routeOptions: routeOptionsQuery.data ?? [],
          departurePort: port
        })
      ),
    [activeDeparturePorts, islandsQuery.data?.data, routeOptionsQuery.data, scheduleQueries]
  );

  const filteredRecommendations = useMemo(
    () => recommendations.filter((trip) => trip.tripTypes.includes(selectedType)),
    [recommendations, selectedType]
  );
  const availableTypeCounts = useMemo(() => countTripsByType(recommendations), [recommendations]);
  const availableTypeFilteredRecommendations = useMemo(
    () => (availableTypeFilter === 'ALL' ? recommendations : recommendations.filter((trip) => trip.tripTypes.includes(availableTypeFilter))),
    [availableTypeFilter, recommendations]
  );
  const regionRecommendations = useMemo(
    () => filterTripsByRegion(availableTypeFilteredRecommendations, selectedTravelRegion),
    [availableTypeFilteredRecommendations, selectedTravelRegion]
  );
  const visibleRecommendations = selectedTravelRegion && regionRecommendations.length > 0 ? regionRecommendations : availableTypeFilteredRecommendations;
  const selectedTypeGuide = tripTypeGuides[selectedType];
  const typeMatchedTrips = filteredRecommendations.length > 0 ? filteredRecommendations : visibleRecommendations.slice(0, 3);
  const primaryTrip = visibleRecommendations.find((trip) => trip.id === focusedTripId) ?? visibleRecommendations[0] ?? null;
  const detailIsland = detailIslandOverride ?? primaryTrip?.island ?? null;
  const detailIslandName = detailIslandOverride?.islandName ?? primaryTrip?.islandName ?? null;
  const detailIslandRegion = [detailIsland?.provinceName, detailIsland?.cityName].filter(Boolean).join(' ');
  const detailForecastLocation = useMemo(
    () => travelRegions.find((region) => region.id === detailIsland?.forecastLocationId) ?? findForecastLocationByKeyword(detailIslandName, travelRegions),
    [detailIsland?.forecastLocationId, detailIslandName, travelRegions]
  );
  const isPrimaryTripSaved = Boolean(
    detailIsland ? favoriteIslands.some((item) => item.id === toSavedIslandSearch(detailIsland).id) : primaryTrip && savedTripIds.includes(primaryTrip.id)
  );
  const travelInfoQuery = useQuery({
    queryKey: ['island-trip-travel-info', detailIslandName, detailIsland?.provinceName, detailIsland?.cityName],
    queryFn: () =>
      fetchIslandTravelInfo({
        islandName: detailIslandName ?? '',
        provinceName: detailIsland?.provinceName,
        cityName: detailIsland?.cityName,
        latitude: detailIsland?.latitude,
        longitude: detailIsland?.longitude
      }),
    enabled: Boolean(detailIslandName),
    staleTime: 30 * 60 * 1000
  });
  const detailForecastQuery = useQuery({
    queryKey: ['island-trip-marine-forecast', detailIslandName],
    queryFn: () => fetchMarineForecast({ locationName: detailIslandName ?? '' }),
    enabled: Boolean(detailIslandName),
    staleTime: 10 * 60 * 1000
  });
  const travelInfo = travelInfoQuery.data;
  const unifiedSearchQuery = useQuery({
    queryKey: ['island-trip-unified-search', submittedUnifiedKeyword],
    queryFn: async () => {
      const islandsResponse = await fetchIslandsResponse(submittedUnifiedKeyword);
      const primaryIsland = islandsResponse.data[0];
      const [info, travelAssets] = await Promise.all([
        fetchIslandTravelInfo({
          islandName: submittedUnifiedKeyword,
          provinceName: primaryIsland?.provinceName,
          cityName: primaryIsland?.cityName,
          latitude: primaryIsland?.latitude,
          longitude: primaryIsland?.longitude
        }),
        searchTravelAssets(submittedUnifiedKeyword, 24)
      ]);

      return buildUnifiedSearchResults(submittedUnifiedKeyword, islandsResponse.data, info, travelAssets);
    },
    enabled: submittedUnifiedKeyword.trim().length >= 2,
    staleTime: 10 * 60 * 1000
  });
  const unifiedSearchResults = unifiedSearchQuery.data ?? [];

  useEffect(() => {
    writeSavedIslandSearches(ISLAND_TRIP_FAVORITES_KEY, favoriteIslands);
  }, [favoriteIslands]);

  useEffect(() => {
    if (!pendingDetailScroll || sectionPositions.detail === undefined) return;

    scrollViewRef.current?.scrollTo({
      y: Math.max(sectionPositions.detail - 12, 0),
      animated: true
    });
    setPendingDetailScroll(false);
  }, [pendingDetailScroll, sectionPositions.detail]);

  useEffect(() => {
    setAvailableDepartureFilter('ALL');
    setAvailableTypeFilter('ALL');
    setExpandedTripId(null);
  }, [selectedTravelRegionId]);

  useEffect(() => {
    writeSavedIslandSearches(ISLAND_TRIP_RECENTS_KEY, recentIslandSearches);
  }, [recentIslandSearches]);

  useEffect(() => {
    const islandName = getRouteParam(routeParams.islandName);
    const section = getRouteParam(routeParams.section);
    const tab = toTravelDetailTab(getRouteParam(routeParams.tab)) ?? 'basic';

    if (islandName) {
      const island = createRouteIsland({
        islandName,
        provinceName: getRouteParam(routeParams.provinceName),
        cityName: getRouteParam(routeParams.cityName)
      });

      setDetailIslandOverride(island);
      setFocusedTripId(null);
      setActiveDetailTab(tab);
      setActiveSection('detail');
      addRecentIsland(island);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      return;
    }

    if (section && isTripSectionKey(section)) {
      setActiveSection(section);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [routeParams.cityName, routeParams.islandName, routeParams.provinceName, routeParams.section, routeParams.tab]);

  const registerSection = (key: TripSectionKey) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setSectionPositions((positions) => (positions[key] === y ? positions : { ...positions, [key]: y }));
  };

  const moveToSection = (key: TripSectionKey) => {
    setActiveSection(key);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const focusTrip = (trip: TripRecommendation, nextTab: TravelDetailTab = 'attractions') => {
    setDetailIslandOverride(null);
    setFocusedTripId(trip.id);
    setActiveDetailTab(nextTab);
    setPendingDetailScroll(true);
    setCurrentIsland({
      islandName: trip.islandName,
      provinceName: trip.island?.provinceName,
      cityName: trip.island?.cityName,
      source: 'island-trip'
    });
    setCurrentRoute({
      departure: trip.departurePortName,
      arrival: trip.islandName,
      name: trip.routeName,
      departureTime: trip.firstDeparture,
      source: 'island-trip'
    });
  };

  const selectTripType = (type: TripType) => {
    const guide = tripTypeGuides[type];

    setDetailIslandOverride(null);
    setSelectedType(type);
    setActiveDetailTab(guide.nextTab);
    setFocusedTripId(null);
  };

  const selectRecommendedIsland = (island: RecommendedIsland) => {
    const detailIsland = island.matchedIsland ?? createSearchIsland(island.islandName, {
      provinceName: island.provinceName,
      cityName: island.cityName
    });

    setDetailIslandOverride(detailIsland);
    setFocusedTripId(null);
    setActiveDetailTab('basic');
    addRecentIsland(detailIsland);
    moveToSection('detail');
  };

  const runUnifiedSearch = () => {
    const keyword = unifiedSearchKeyword.trim();
    if (keyword.length < 2) return;

    setSubmittedUnifiedKeyword(keyword);
    setUnifiedSearchVisible(true);
    setActiveSection('detail');
    addRecentKeyword(keyword);
  };

  const openUnifiedSearchForDetail = () => {
    const keyword = (detailIslandName ?? '').trim();
    if (keyword.length < 2) return;

    setUnifiedSearchKeyword(keyword);
    setSubmittedUnifiedKeyword(keyword);
    setUnifiedSearchVisible(true);
    addRecentKeyword(keyword);
  };

  const selectUnifiedSearchResult = (result: UnifiedSearchResult) => {
    if (result.island) {
      setDetailIslandOverride(result.island);
      addRecentIsland(result.island);
    }

    setFocusedTripId(null);
    setActiveDetailTab(result.tab);
    setUnifiedSearchVisible(false);
    setActiveSection('detail');
    setPendingDetailScroll(true);
  };

  const addRecentIsland = (island: IslandSummary) => {
    setCurrentIsland({
      islandName: island.islandName,
      provinceName: island.provinceName,
      cityName: island.cityName,
      source: 'island-trip'
    });
    const item = toSavedIslandSearch(island, { searchedAt: new Date().toISOString() });
    setRecentIslandSearches((items) => [item, ...items.filter((saved) => saved.id !== item.id)].slice(0, 8));
  };

  const selectSavedIsland = (item: SavedIslandSearch) => {
    if (item.kind === 'keyword') {
      const keyword = item.keyword ?? item.islandName;
      setUnifiedSearchKeyword(keyword);
      setSubmittedUnifiedKeyword(keyword);
      setUnifiedSearchVisible(true);
      setQuickPanelExpanded(false);
      addRecentKeyword(keyword);
      return;
    }

    const island = findIslandBySaved(item, islandsQuery.data?.data ?? []);
    setDetailIslandOverride(island);
    setFocusedTripId(null);
    setActiveDetailTab('basic');
    setQuickPanelExpanded(false);
    setRecentIslandSearches((items) => [{ ...item, searchedAt: new Date().toISOString() }, ...items.filter((saved) => saved.id !== item.id)].slice(0, 8));
    moveToSection('detail');
  };

  const toggleFavoriteIsland = () => {
    if (!detailIsland) return;

    const item = toSavedIslandSearch(detailIsland);
    setFavoriteIslands((items) =>
      items.some((saved) => saved.id === item.id) ? items.filter((saved) => saved.id !== item.id) : items
    );

    if (!favoriteIslands.some((saved) => saved.id === item.id)) {
      setPendingFavoriteIsland(detailIsland);
      setFavoriteNameDraft(detailIsland.islandName);
      setFavoriteNameModalVisible(true);
    }
  };

  const saveFavoriteIslandName = () => {
    if (!pendingFavoriteIsland) return;

    const item = toSavedIslandSearch(pendingFavoriteIsland, {
      displayName: favoriteNameDraft.trim() || pendingFavoriteIsland.islandName,
      savedAt: new Date().toISOString()
    });

    setFavoriteIslands((items) => [item, ...items.filter((saved) => saved.id !== item.id)].slice(0, 12));
    setPendingFavoriteIsland(null);
    setFavoriteNameModalVisible(false);
  };

  const addRecentKeyword = (keyword: string) => {
    const item = toRecentKeywordSearch(keyword);
    setRecentIslandSearches((items) => [item, ...items.filter((saved) => saved.id !== item.id)].slice(0, 10));
  };

  const removeFavoriteIsland = (item: SavedIslandSearch) => {
    setFavoriteIslands((items) => items.filter((saved) => saved.id !== item.id));
  };

  const removeRecentIsland = (item: SavedIslandSearch) => {
    setRecentIslandSearches((items) => items.filter((saved) => saved.id !== item.id));
  };

  const toggleSavedTrip = () => {
    if (detailIsland) {
      toggleFavoriteIsland();
      return;
    }

    if (!primaryTrip) return;

    setSavedTripIds((ids) =>
      ids.includes(primaryTrip.id) ? ids.filter((id) => id !== primaryTrip.id) : [primaryTrip.id, ...ids]
    );
  };

  return (
    <Screen
      title="섬관광"
      subtitle="섬 하나를 검색하고, 배편·예보·지도·숙박·식당·캠핑·사진 정보를 이어서 확인합니다."
      mascotSource={require('../../assets/mascot/boogi_bg6.png')}
      scrollRef={scrollViewRef}
    >
      <MascotBanner
        eyebrow="ISLAND TRIP"
        title="찾고 싶은 섬을 먼저 이해합니다"
        description="검색어로 관련 섬을 고르고, 선택한 섬의 기본정보와 배편, 예보, 지도, 숙박, 식당, 캠핑, 사진을 한 화면에서 연결합니다."
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        tone="mint"
      />

      <View style={styles.unifiedSearchPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>통합검색</Text>
            <Text style={styles.sectionTitle}>섬 이름, 관광지, 식당, 숙소 한 번에 찾기</Text>
          </View>
          <Search color={colors.primary} size={22} />
        </View>
        <View style={styles.unifiedSearchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            value={unifiedSearchKeyword}
            onChangeText={setUnifiedSearchKeyword}
            onSubmitEditing={runUnifiedSearch}
            placeholder="예: 가거도, 울릉도, 백령도"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.unifiedSearchInput}
          />
          <Pressable
            accessibilityRole="button"
            onPress={runUnifiedSearch}
            style={[styles.unifiedSearchButton, unifiedSearchKeyword.trim().length < 2 ? styles.actionButtonDisabled : null]}
            disabled={unifiedSearchKeyword.trim().length < 2}
          >
            <Text style={styles.unifiedSearchButtonText}>검색</Text>
          </Pressable>
        </View>
      </View>

      <RecommendedRegionPanel
        regions={islandTravelRegions}
        selectedRegionId={selectedRecommendedRegion?.id ?? null}
        islands={recommendedIslandsQuery.data ?? []}
        loading={recommendedIslandsQuery.isLoading || islandsQuery.isLoading}
        onSelectRegion={setSelectedRecommendedRegionId}
        onSelectIsland={selectRecommendedIsland}
      />

      <IslandQuickPanel
        expanded={isQuickPanelExpanded}
        favorites={favoriteIslands}
        recents={recentIslandSearches}
        onToggle={() => setQuickPanelExpanded((value) => !value)}
        onSelect={selectSavedIsland}
        onRemoveFavorite={removeFavoriteIsland}
        onRemoveRecent={removeRecentIsland}
      />

      <View style={styles.subMenuPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>섬관광 메뉴</Text>
            <Text style={styles.subMenuTitle}>검색한 섬을 중심으로 확인하세요</Text>
          </View>
          <Compass color={colors.primary} size={22} />
        </View>
        <View style={styles.subMenuStrip}>
          {tripSectionMenu.map((item) => {
            const selected = activeSection === item.key;

            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() => moveToSection(item.key)}
                style={[styles.subMenuItem, selected && styles.subMenuItemSelected]}
              >
                <Text style={[styles.subMenuItemLabel, selected && styles.subMenuItemLabelSelected]}>{item.label}</Text>
                <Text style={[styles.subMenuItemDescription, selected && styles.subMenuItemDescriptionSelected]}>{item.description}</Text>
              </Pressable>
            );
          })}
          <Link
            href={{
              pathname: '/islands',
              params: {
                mode: 'map',
                ...(detailIslandName ? { islandName: detailIslandName } : {}),
                ...(detailIsland?.provinceName ? { provinceName: detailIsland.provinceName } : {}),
                ...(detailIsland?.cityName ? { cityName: detailIsland.cityName } : {})
              }
            }}
            asChild
          >
            <Pressable accessibilityRole="button" style={styles.subMenuItem}>
              <Text style={styles.subMenuItemLabel}>섬지도</Text>
              <Text style={styles.subMenuItemDescription}>지도에서 보기</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {activeSection === 'available' ? (
      <>
      <View style={styles.section} onLayout={registerSection('available')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>지금 갈 수 있는 섬</Text>
            <Text style={styles.sectionTitle}>
              {selectedTravelRegion ? `${selectedTravelRegion.label} 권역 출발 가능` : '전체 권역 출발 가능'}
            </Text>
          </View>
          <Text style={styles.todayBadge}>{today}</Text>
        </View>
        <Text style={styles.sectionDescription}>
          {selectedTravelRegion
            ? `${selectedTravelRegion.label} 권역의 출발 가능한 항구와 오늘 운항 후보를 기준으로 보여줍니다.`
            : '전체 권역의 출발 가능한 항구와 오늘 운항 후보를 기준으로 보여줍니다.'}
        </Text>
        <View style={styles.availableFilterGroup}>
          <Text style={styles.availableFilterTitle}>출발 가능 항구</Text>
          <View style={styles.badgeChipGrid}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAvailableDepartureFilter('ALL')}
              style={[styles.badgeChip, availableDepartureFilter === 'ALL' ? styles.badgeChipSelected : null]}
            >
              <Anchor color={availableDepartureFilter === 'ALL' ? colors.surface : colors.primary} size={14} />
              <Text style={[styles.badgeChipText, availableDepartureFilter === 'ALL' ? styles.badgeChipTextSelected : null]}>
                전체 {regionDeparturePorts.length}
              </Text>
            </Pressable>
            {regionDeparturePorts.map((port) => {
              const selected = availableDepartureFilter === port;

              return (
                <Pressable
                  key={port}
                  accessibilityRole="button"
                  onPress={() => setAvailableDepartureFilter(port)}
                  style={[styles.badgeChip, selected ? styles.badgeChipSelected : null]}
                >
                  <Text style={[styles.badgeChipText, selected ? styles.badgeChipTextSelected : null]}>{port}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.availableFilterGroup}>
          <Text style={styles.availableFilterTitle}>여행 유형별 후보</Text>
          <View style={styles.badgeChipGrid}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAvailableTypeFilter('ALL')}
              style={[styles.badgeChip, availableTypeFilter === 'ALL' ? styles.badgeChipSelected : null]}
            >
              <Text style={[styles.badgeChipText, availableTypeFilter === 'ALL' ? styles.badgeChipTextSelected : null]}>
                전체 {recommendations.length}
              </Text>
            </Pressable>
            {tripTypes.map((type) => {
              const selected = availableTypeFilter === type.id;
              const count = availableTypeCounts[type.id] ?? 0;

              return (
                <Pressable
                  key={type.id}
                  accessibilityRole="button"
                  onPress={() => setAvailableTypeFilter(type.id)}
                  style={[styles.badgeChip, selected ? styles.badgeChipSelected : null]}
                >
                  <Text style={[styles.badgeChipText, selected ? styles.badgeChipTextSelected : null]}>
                    {type.label} {count}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.availableList}>
        {isAvailableLoading ? <Text style={styles.travelInfoEmpty}>권역의 운항 후보를 불러오는 중입니다.</Text> : null}
        {isAvailableError ? <Text style={styles.travelInfoEmpty}>운항 후보를 불러오지 못했습니다. 시간표 API 상태를 확인해 주세요.</Text> : null}
        {!isAvailableLoading && visibleRecommendations.length === 0 ? (
          <View style={styles.emptyWideCard}>
            <Text style={styles.travelInfoItemTitle}>오늘 조회 가능한 섬 후보가 없습니다.</Text>
            <Text style={styles.travelInfoItemDescription}>선택한 예보 권역과 출발항 기준으로 운항 후보가 없습니다. 전체 권역 또는 다른 유형을 선택해 주세요.</Text>
          </View>
        ) : null}
        {visibleRecommendations.map((trip) => {
          const focused = primaryTrip?.id === trip.id;
          const expanded = expandedTripId === trip.id;

          return (
            <View key={trip.id} style={[styles.tripAccordion, focused ? styles.tripAccordionFocused : null]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  focusTrip(trip);
                  setExpandedTripId((id) => (id === trip.id ? null : trip.id));
                }}
                style={styles.tripAccordionHeader}
              >
                <View style={styles.tripIconBox}>
                  <Image source={require('../../assets/mascot/boogi_bg6.png')} style={styles.tripIcon} resizeMode="contain" />
                </View>
                <View style={styles.tripAccordionCopy}>
                  <Text style={styles.tripName} numberOfLines={1}>{trip.islandName}</Text>
                  <Text style={styles.tripRoute} numberOfLines={1}>
                    {trip.departurePortName} 출발 · {trip.routeName}
                  </Text>
                </View>
                <View style={styles.tripAccordionSide}>
                  <StatusPill label={statusLabel[trip.status]} tone={statusTone[trip.status]} />
                  <Text style={styles.tripAccordionToggle}>{expanded ? '접기' : '펼치기'}</Text>
                </View>
              </Pressable>
              <View style={styles.tripTags}>
                {trip.tripTypes.map((type) => (
                  <Text key={type} style={styles.tripTag}>
                    {tripTypeText[type]}
                  </Text>
                ))}
              </View>
              {expanded ? (
                <View style={styles.tripAccordionBody}>
                  <View style={styles.tripMetaGrid}>
                    <MiniStat label="첫 배" value={trip.firstDeparture ?? '확인'} />
                    <MiniStat label="막배" value={trip.lastDeparture ?? '확인'} />
                    <MiniStat label="소요" value={trip.durationLabel} />
                  </View>
                  <Text style={styles.tripReason}>{getRecommendationReason(trip)}</Text>
                  <Pressable accessibilityRole="button" onPress={() => focusTrip(trip)} style={styles.tripDetailButton}>
                    <Text style={styles.tripDetailButtonText}>섬 상세 보기</Text>
                    <ChevronRight color={colors.primary} size={16} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      </>
      ) : null}

      {activeSection === 'types' ? (
      <View style={styles.section} onLayout={registerSection('types')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>여행 유형 선택</Text>
            <Text style={styles.sectionTitle}>{tripTypeText[selectedType]} 추천</Text>
          </View>
          <Compass color={colors.primary} size={22} />
        </View>
        <View style={styles.typeGrid}>
          {tripTypes.map((type) => {
            const Icon = type.icon;
            const selected = selectedType === type.id;

            return (
              <Pressable
                key={type.id}
                accessibilityRole="button"
                onPress={() => selectTripType(type.id)}
                style={[styles.typeButton, selected && styles.typeButtonSelected]}
              >
                <Icon color={selected ? colors.surface : colors.primary} size={18} />
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{type.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.typeGuideCard}>
          <View style={styles.typeGuideHeader}>
            <View style={styles.typeGuideIconBox}>
              {(() => {
                const Icon = tripTypes.find((type) => type.id === selectedType)?.icon ?? Compass;
                return <Icon color={colors.primary} size={22} />;
              })()}
            </View>
            <View style={styles.typeGuideCopy}>
              <Text style={styles.typeGuideTitle} numberOfLines={2}>
                {selectedTypeGuide.headline}
              </Text>
              <Text style={styles.typeGuideSummary}>{selectedTypeGuide.summary}</Text>
            </View>
          </View>

          <View style={styles.typeInsightRow}>
            <MiniStat label="추천 후보" value={`${filteredRecommendations.length}곳`} />
            <MiniStat label="우선 확인" value={tripTypeText[selectedType]} />
          </View>

          <PurposeRecommendationPanel
            selectedType={selectedType}
            trips={typeMatchedTrips}
            travelInfo={travelInfo}
            onSelectTrip={(trip) => focusTrip(trip, selectedTypeGuide.nextTab)}
          />
          <PurposeChecklistPanel selectedType={selectedType} trip={primaryTrip} travelInfo={travelInfo} forecast={detailForecastQuery.data} />

          <View style={styles.typeGuideGroup}>
            <Text style={styles.typeGuideGroupTitle}>추천 기준</Text>
            <View style={styles.typeGuideChips}>
              {selectedTypeGuide.bestFor.map((item) => (
                <Text key={item} style={styles.typeGuideChip} numberOfLines={1}>
                  {item}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.typeGuideGroup}>
            <Text style={styles.typeGuideGroupTitle}>출발 전 체크</Text>
            <View style={styles.typeChecklist}>
              {selectedTypeGuide.checklist.map((item) => (
                <View key={item} style={styles.typeChecklistItem}>
                  <CheckCircle2 color={colors.mint} size={15} />
                  <Text style={styles.typeChecklistText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.typeGuideGroup}>
            <View style={styles.typeGuideActionHeader}>
              <Text style={styles.typeGuideGroupTitle}>이 유형으로 바로 보기</Text>
              {filteredRecommendations.length === 0 ? <Text style={styles.typeFallbackText}>근접 후보 표시</Text> : null}
            </View>
            <View style={styles.typeSuggestionList}>
              {typeMatchedTrips.length === 0 ? <Text style={styles.travelInfoEmpty}>현재 선택한 유형에 맞는 실제 운항 후보가 없습니다.</Text> : null}
              {typeMatchedTrips.slice(0, 3).map((trip) => (
                <Pressable
                  key={trip.id}
                  accessibilityRole="button"
                      onPress={() => focusTrip(trip, selectedTypeGuide.nextTab)}
                  style={styles.typeSuggestionItem}
                >
                  <View style={styles.typeSuggestionCopy}>
                    <Text style={styles.typeSuggestionTitle} numberOfLines={1}>
                      {trip.islandName}
                    </Text>
                    <Text style={styles.typeSuggestionMeta} numberOfLines={1}>
                      {trip.firstDeparture ?? '첫 배 확인'} · {trip.lastDeparture ?? '복귀 확인'} · {trip.durationLabel}
                    </Text>
                  </View>
                  <Text style={styles.typeSuggestionAction}>보기</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
      ) : null}

      {(activeSection === 'detail' || ((activeSection === 'available' || activeSection === 'types') && Boolean(focusedTripId || detailIslandOverride))) ? (
      <View style={styles.detailPanel} onLayout={registerSection('detail')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>섬 상세</Text>
            <Text style={styles.sectionTitle}>{detailIslandName ?? '섬을 선택해 주세요'}</Text>
          </View>
          <MapPin color={colors.primary} size={22} />
        </View>
        {activeSection === 'available' || activeSection === 'types' ? (
          <Text style={styles.inlineDetailNotice}>
            선택한 섬의 상세 정보를 아래에서 바로 확인할 수 있어요.
          </Text>
        ) : null}
        <Text style={styles.detailDescription}>
          {detailIslandName
            ? `${detailIslandName}의 기본정보, 배편, 관광·체험, 걷기·트레킹, 해양레저, 맛집·시장, 숙박, 캠핑·야영, 갯벌·물때 정보를 함께 확인합니다.`
            : '통합검색이나 아래 검색창에서 섬을 찾고 관련 섬 목록에서 하나를 선택해 주세요.'}
        </Text>
        <View style={styles.detailTabs}>
          {travelDetailTabs.map((tab) => {
            const selected = activeDetailTab === tab.key;
            const count = getTravelDetailTabCount(tab.key, travelInfo, detailIslandOverride ? null : primaryTrip);
            const label = count === null ? tab.label : `${tab.label}(${count}건)`;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                onPress={() => setActiveDetailTab(tab.key)}
                style={[styles.detailTab, selected && styles.detailTabSelected]}
              >
                <Text style={[styles.detailTabText, selected && styles.detailTabTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.travelInfoGrid}>
          <TravelDetailContent
            tab={activeDetailTab}
            trip={detailIslandOverride ? null : primaryTrip}
            island={detailIsland}
            islandName={detailIslandName}
            travelInfo={travelInfo}
            forecast={detailForecastQuery.data}
            forecastLoading={detailForecastQuery.isFetching}
            forecastError={detailForecastQuery.isError}
            onSelectItem={setSelectedTravelItem}
            onOpenSearch={openUnifiedSearchForDetail}
            onOpenPhotos={() => setPhotoModalVisible(true)}
          />
        </View>
        <View style={styles.nextActionPanel}>
          {detailIslandName ? (
            <Link
              href={{
                pathname: '/islands',
                params: {
                  mode: 'my-trip',
                  islandName: detailIslandName,
                  ...(detailIsland?.provinceName ? { provinceName: detailIsland.provinceName } : {}),
                  ...(detailIsland?.cityName ? { cityName: detailIsland.cityName } : {})
                }
              }}
              asChild
            >
              <Pressable accessibilityRole="button" style={styles.primaryActionButton}>
                <Compass color={colors.surface} size={17} />
                <Text style={styles.primaryActionText}>섬코스 만들기</Text>
              </Pressable>
            </Link>
          ) : null}
          <Pressable accessibilityRole="button" onPress={toggleSavedTrip} style={styles.secondaryActionButton}>
            <Bookmark color={isPrimaryTripSaved ? colors.warning : colors.primary} size={17} />
            <Text style={styles.secondaryActionText}>{isPrimaryTripSaved ? '저장 해제' : '섬 저장'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPhotoModalVisible(true)}
            style={styles.secondaryActionButton}
          >
            <Images color={colors.primary} size={17} />
            <Text style={styles.secondaryActionText}>관련사진</Text>
          </Pressable>
          <Link href={{ pathname: '/islands', params: { islandName: detailIslandName ?? primaryTrip?.islandName ?? '' } }} asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryActionButton}>
              <MapPin color={colors.primary} size={17} />
              <Text style={styles.secondaryActionText}>섬지도</Text>
            </Pressable>
          </Link>
          <Link
            href={{
              pathname: '/forecast',
              params: {
                locationName: detailIslandName ?? primaryTrip?.islandName ?? '',
                ...(detailForecastLocation ? { locationId: detailForecastLocation.id } : {})
              }
            }}
            asChild
          >
            <Pressable accessibilityRole="button" style={styles.secondaryActionButton}>
              <Waves color={colors.primary} size={17} />
              <Text style={styles.secondaryActionText}>예보 보기</Text>
            </Pressable>
          </Link>
          <Link href="/schedule" asChild>
            <Pressable accessibilityRole="button" style={styles.secondaryActionButton}>
              <CalendarDays color={colors.primary} size={17} />
              <Text style={styles.secondaryActionText}>시간표 보기</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.campingNotice}>
          <Tent color={colors.warning} size={18} />
          <Text style={styles.campingNoticeText}>차박 가능성이 있는 장소는 현장 안내문과 지자체 공지를 반드시 확인하세요.</Text>
        </View>
      </View>
      ) : null}

      {activeSection === 'course' ? (
      <>
      <View style={styles.coursePanel} onLayout={registerSection('course')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>추천 코스</Text>
            <Text style={styles.sectionTitle}>배 시간표 기반 코스</Text>
          </View>
          <Sailboat color={colors.primary} size={22} />
        </View>
        {buildTravelCourseSteps({
          trip: primaryTrip,
          selectedType,
          travelInfo,
          departurePort
        }).map((step) => (
          <CourseStep key={`${step.time}-${step.title}`} time={step.time} title={step.title} />
        ))}
      </View>

      <View style={styles.safetyPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>안전 체크</Text>
            <Text style={styles.sectionTitle}>떠나기 전 확인할 것</Text>
          </View>
          <ShieldCheck color={colors.primary} size={22} />
        </View>
        <View style={styles.safetyGrid}>
          {['운항상태', '내일 운항예보', '해양 날씨', '조석 정보', '기상특보', '복귀 배편', '야영 제한'].map((item) => (
            <View key={item} style={styles.safetyItem}>
              <CheckCircle2 color={colors.mint} size={16} />
              <Text style={styles.safetyText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.safetyHint}>마지막 복귀 배편을 먼저 확인하고, 파고·풍속이 높아지는 시간대는 피하는 흐름으로 안내합니다.</Text>
      </View>
      </>
      ) : null}

      {activeSection === 'saved' ? (
      <View style={styles.section} onLayout={registerSection('saved')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>저장한 여행</Text>
            <Text style={styles.sectionTitle}>다시 보고 싶은 코스</Text>
          </View>
          <Star color={colors.warning} size={22} />
        </View>
        <View style={styles.savedList}>
          {savedTripIds
            .map((id) => visibleRecommendations.find((trip) => trip.id === id))
            .filter((trip): trip is TripRecommendation => Boolean(trip))
            .map((trip) => (
              <View key={trip.id} style={styles.savedItem}>
                <BadgeCheck color={colors.primary} size={18} />
                <View style={styles.savedCopy}>
                  <Text style={styles.savedTitle}>{`${trip.departurePortName} 출발 ${trip.islandName}`}</Text>
                  <Text style={styles.savedMeta}>{`${trip.firstDeparture ?? '첫 배 확인'} · ${trip.durationLabel}`}</Text>
                </View>
              </View>
            ))}
          {savedTripIds.length === 0 ? <Text style={styles.travelInfoEmpty}>저장한 여행이 없습니다. 실제 조회 결과에서 저장하면 여기에 표시됩니다.</Text> : null}
        </View>
      </View>
      ) : null}

      <PhotoGalleryModal
        islandName={detailIslandName}
        photos={travelInfo?.photos ?? []}
        sourceLabel={travelInfo?.sourceSummary.photo}
        photoStatus={travelInfo?.apiStatus.photo}
        isLoading={travelInfoQuery.isFetching}
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
      />
      <TravelInfoItemModal
        item={selectedTravelItem}
        visible={Boolean(selectedTravelItem)}
        onClose={() => setSelectedTravelItem(null)}
        onOpenPhotos={() => {
          setSelectedTravelItem(null);
          setPhotoModalVisible(true);
        }}
      />
      <UnifiedSearchModal
        keyword={submittedUnifiedKeyword}
        visible={unifiedSearchVisible}
        isLoading={unifiedSearchQuery.isFetching}
        isError={unifiedSearchQuery.isError}
        results={unifiedSearchResults}
        onClose={() => setUnifiedSearchVisible(false)}
        onRetry={() => unifiedSearchQuery.refetch()}
        onSelect={selectUnifiedSearchResult}
      />
      <FavoriteIslandNameModal
        visible={favoriteNameModalVisible}
        islandName={pendingFavoriteIsland?.islandName ?? ''}
        name={favoriteNameDraft}
        onNameChange={setFavoriteNameDraft}
        onClose={() => {
          setFavoriteNameModalVisible(false);
          setPendingFavoriteIsland(null);
        }}
        onSave={saveFavoriteIslandName}
      />
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function RecommendedRegionPanel({
  regions,
  selectedRegionId,
  islands,
  loading,
  onSelectRegion,
  onSelectIsland
}: {
  regions: IslandTravelRegionOption[];
  selectedRegionId: string | null;
  islands: RecommendedIsland[];
  loading: boolean;
  onSelectRegion: (regionId: string) => void;
  onSelectIsland: (island: RecommendedIsland) => void;
}) {
  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? regions[0] ?? null;

  return (
    <View style={styles.recommendedRegionPanel}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.eyebrow}>추천권역으로 찾기</Text>
          <Text style={styles.sectionTitle}>{selectedRegion ? `${selectedRegion.name} 추천섬` : '여행 권역별 추천섬'}</Text>
        </View>
        <MapPin color={colors.primary} size={22} />
      </View>
      <Text style={styles.sectionDescription}>섬마스터의 여행 권역 기준으로 추천섬 마스터를 묶어 보여줍니다.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendedRegionStrip}>
        {regions.map((region) => {
          const selected = region.id === selectedRegion?.id;
          return (
            <Pressable
              key={region.id}
              accessibilityRole="button"
              onPress={() => onSelectRegion(region.id)}
              style={[styles.recommendedRegionChip, selected ? styles.recommendedRegionChipSelected : null]}
            >
              <Text style={[styles.recommendedRegionChipText, selected ? styles.recommendedRegionChipTextSelected : null]}>{region.name}</Text>
              <Text style={[styles.recommendedRegionChipCount, selected ? styles.recommendedRegionChipTextSelected : null]}>{region.count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? <Text style={styles.travelInfoEmpty}>추천섬 목록을 불러오고 있습니다.</Text> : null}
      {!loading && islands.length === 0 ? <Text style={styles.travelInfoEmpty}>선택한 권역에 등록된 추천섬이 아직 없습니다.</Text> : null}
      <View style={styles.recommendedIslandGrid}>
        {islands.map((island) => (
          <Pressable key={island.id} accessibilityRole="button" onPress={() => onSelectIsland(island)} style={styles.recommendedIslandCard}>
            {island.photoUrls[0] ? <Image source={{ uri: island.photoUrls[0] }} style={styles.recommendedIslandImage} /> : null}
            <View style={styles.recommendedIslandCopy}>
              <Text style={styles.recommendedIslandTitle}>{island.displayName ?? island.islandName}</Text>
              <Text style={styles.recommendedIslandMeta} numberOfLines={1}>
                {[island.matchedIsland?.travelRegionName, island.address, island.contact].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.recommendedIslandDescription} numberOfLines={3}>
                {island.description}
              </Text>
              <View style={styles.recommendedIslandTags}>
                {island.highlights.slice(0, 3).map((highlight) => (
                  <Text key={highlight} style={styles.recommendedIslandTag}>
                    {highlight}
                  </Text>
                ))}
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function IslandQuickPanel({
  expanded,
  favorites,
  recents,
  onToggle,
  onSelect,
  onRemoveFavorite,
  onRemoveRecent
}: {
  expanded: boolean;
  favorites: SavedIslandSearch[];
  recents: SavedIslandSearch[];
  onToggle: () => void;
  onSelect: (item: SavedIslandSearch) => void;
  onRemoveFavorite: (item: SavedIslandSearch) => void;
  onRemoveRecent: (item: SavedIslandSearch) => void;
}) {
  const count = new Set([...favorites, ...recents].map((item) => item.id)).size;
  const recentKeywords = recents.filter((item) => item.kind === 'keyword');
  const recentIslands = recents.filter((item) => item.kind !== 'keyword');

  return (
    <View style={styles.quickPanel}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.quickPanelHeader}>
        <View style={styles.quickPanelTitleRow}>
          <Bookmark color={colors.primary} size={18} />
          <Text style={styles.quickPanelTitle}>빠른 조회</Text>
          <Text style={styles.quickPanelCount}>{count}개</Text>
        </View>
        <View style={styles.quickPanelToggle}>
          <Text style={styles.quickPanelToggleText}>{expanded ? '접기' : '펼치기'}</Text>
          <ChevronRight color={colors.primary} size={19} style={expanded ? styles.chevronExpanded : null} />
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.quickPanelBody}>
          <IslandQuickGroup title="즐겨찾기" icon={Star} items={favorites} emptyText="자주 보는 섬을 즐겨찾기로 저장해 보세요." onSelect={onSelect} onRemove={onRemoveFavorite} />
          <IslandQuickGroup title="최근 검색어" icon={Search} items={recentKeywords} emptyText="통합검색을 실행하면 검색어가 여기에 표시됩니다." onSelect={onSelect} onRemove={onRemoveRecent} />
          <IslandQuickGroup title="최근 선택 섬" icon={History} items={recentIslands} emptyText="섬상세를 열면 선택한 섬이 여기에 표시됩니다." onSelect={onSelect} onRemove={onRemoveRecent} />
        </View>
      ) : (
        <Text style={styles.quickPanelHint}>즐겨찾기와 최근검색을 펼쳐서 섬 상세로 바로 이동합니다.</Text>
      )}
    </View>
  );
}

function IslandQuickGroup({
  title,
  icon: Icon,
  items,
  emptyText,
  onSelect,
  onRemove
}: {
  title: string;
  icon: typeof Star;
  items: SavedIslandSearch[];
  emptyText: string;
  onSelect: (item: SavedIslandSearch) => void;
  onRemove: (item: SavedIslandSearch) => void;
}) {
  return (
    <View style={styles.quickGroup}>
      <View style={styles.quickSectionHeader}>
        <Icon color={colors.primary} size={17} />
        <Text style={styles.quickGroupTitle}>{title}</Text>
        <Text style={styles.quickSectionText}>{items.length > 0 ? '누르면 섬상세로 이동' : emptyText}</Text>
      </View>
      {items.length > 0 ? (
        <View style={styles.quickRouteList}>
          {items.slice(0, 5).map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelect(item)} style={styles.islandQuickRow}>
              <View style={styles.islandQuickCopy}>
                <Text style={styles.routeChipTitle} numberOfLines={1}>
                  {item.displayName ?? item.keyword ?? item.islandName}
                </Text>
                <Text style={styles.recentRouteLine} numberOfLines={1}>
                  {item.kind === 'keyword'
                    ? ['통합검색어', formatSavedIslandTime(item)].filter(Boolean).join(' · ')
                    : [item.islandName, item.provinceName, item.cityName, formatSavedIslandTime(item)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.islandName} ${title} 삭제`}
                onPress={(event) => {
                  event.stopPropagation();
                  onRemove(item);
                }}
                style={styles.favoriteInlineAction}
              >
                <Trash2 color={colors.muted} size={14} />
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function UnifiedSearchModal({
  keyword,
  visible,
  isLoading,
  isError,
  results,
  onClose,
  onRetry,
  onSelect
}: {
  keyword: string;
  visible: boolean;
  isLoading: boolean;
  isError: boolean;
  results: UnifiedSearchResult[];
  onClose: () => void;
  onRetry: () => void;
  onSelect: (result: UnifiedSearchResult) => void;
}) {
  const grouped = groupUnifiedResults(results);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<UnifiedSearchFilter>('전체');
  const filteredResults = activeFilter === '전체' ? results : results.filter((result) => result.group === activeFilter);
  const filteredGrouped = groupUnifiedResults(filteredResults);

  useEffect(() => {
    if (!visible) {
      setExpandedResultId(null);
      setActiveFilter('전체');
    }
  }, [visible, keyword]);

  useEffect(() => {
    setExpandedResultId(null);
  }, [activeFilter, keyword]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.searchModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.eyebrow}>통합검색 결과</Text>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {keyword || '검색어'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.searchResultStack} showsVerticalScrollIndicator={false}>
            <View style={styles.searchFilterStrip}>
              {unifiedSearchFilters.map((filter) => {
                const selected = activeFilter === filter;
                const count = filter === '전체' ? results.length : results.filter((result) => result.group === filter).length;

                return (
                  <Pressable
                    key={filter}
                    accessibilityRole="button"
                    onPress={() => setActiveFilter(filter)}
                    style={[styles.searchFilterChip, selected ? styles.searchFilterChipSelected : null]}
                  >
                    <Text style={[styles.searchFilterChipText, selected ? styles.searchFilterChipTextSelected : null]}>
                      {filter} {count}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {isLoading ? <UnifiedSearchProgress keyword={keyword} /> : null}
            {isError ? <UnifiedSearchFailure keyword={keyword} onRetry={onRetry} onClose={onClose} /> : null}
            {!isLoading && !isError && filteredGrouped.length === 0 ? <Text style={styles.travelInfoEmpty}>선택한 영역의 검색 결과가 없습니다.</Text> : null}
            {!isLoading && !isError
              ? filteredGrouped.map((group) => (
                  <View key={group.title} style={styles.searchResultGroup}>
                    <View style={styles.quickSectionHeader}>
                      <Text style={styles.searchResultGroupTitle}>{group.title}</Text>
                      <Text style={styles.quickSectionText}>{group.items.length}건</Text>
                    </View>
                    {group.items.map((item) => {
                      const expanded = expandedResultId === item.id;

                      return (
                        <View key={item.id} style={styles.searchResultAccordion}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setExpandedResultId(expanded ? null : item.id)}
                            style={[styles.searchResultItem, expanded ? styles.searchResultItemExpanded : null]}
                          >
                            <View style={styles.searchResultCopy}>
                              <Text style={styles.searchResultTitle} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text style={styles.searchResultDescription} numberOfLines={2}>
                                {item.description}
                              </Text>
                            </View>
                            <Text style={styles.typeSuggestionAction}>{expanded ? '접기' : '상세'}</Text>
                          </Pressable>
                          {expanded ? (
                            <View style={styles.searchDetailPanel}>
                              <View style={styles.searchDetailBadgeRow}>
                                <Text style={styles.searchDetailBadge}>{item.group}</Text>
                                {item.badge ? <Text style={styles.searchDetailBadge}>{item.badge}</Text> : null}
                                <Text style={styles.quickSectionText}>{item.island?.islandName ?? keyword}</Text>
                              </View>
                              <Text style={styles.searchDetailTitle}>{item.title}</Text>
                              <Text style={styles.searchDetailDescription}>{item.description || '상세 설명이 없습니다.'}</Text>
                              {item.address ? (
                                <View style={styles.searchDetailMetaBox}>
                                  <Text style={styles.searchDetailMetaLabel}>주소</Text>
                                  <Text style={styles.searchDetailMetaValue}>{item.address}</Text>
                                </View>
                              ) : null}
                              {item.source ? (
                                <View style={styles.searchDetailMetaBox}>
                                  <Text style={styles.searchDetailMetaLabel}>출처</Text>
                                  <Text style={styles.searchDetailMetaValue}>{item.source}</Text>
                                </View>
                              ) : null}
                              <View style={styles.searchDetailMetaBox}>
                                <Text style={styles.searchDetailMetaLabel}>연결 섬</Text>
                                <Text style={styles.searchDetailMetaValue}>
                                  {[item.island?.islandName, item.island?.provinceName, item.island?.cityName].filter(Boolean).join(' · ') || '검색어 기준'}
                                </Text>
                              </View>
                              {item.detailRows?.map((row) =>
                                row.value ? (
                                  <View key={`${item.id}-${row.label}`} style={styles.searchDetailMetaBox}>
                                    <Text style={styles.searchDetailMetaLabel}>{row.label}</Text>
                                    <Text style={styles.searchDetailMetaValue}>{row.value}</Text>
                                  </View>
                                ) : null
                              )}
                              <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={styles.primaryActionButton}>
                                <Text style={styles.primaryActionText}>섬상세에서 보기</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ))
              : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function UnifiedSearchProgress({ keyword }: { keyword: string }) {
  const steps = [
    { title: '섬 기본정보', description: `${keyword || '검색어'} 도서정보를 조회합니다.` },
    { title: '관광·걷기·전망', description: '관광, 걷기, 둘레길, 노을, 등대, 전망 데이터를 나눠 봅니다.' },
    { title: '맛집·숙박·시장', description: '식당, 숙박, 전통시장, 수산시장, 특산물 데이터를 대조합니다.' },
    { title: '해변·레저·갯벌', description: '해수욕장, 해양레저, 낚시, 갯벌, 물때 정보를 묶어 봅니다.' },
    { title: '편의·안전정보', description: '화장실, 샤워장, 주차장, 예보와 안전 체크 데이터를 반영합니다.' }
  ];

  return (
    <View style={styles.searchProgressPanel}>
      <View style={styles.searchProgressHeader}>
        <Search color={colors.primary} size={18} />
        <View style={styles.searchProgressCopy}>
          <Text style={styles.searchProgressTitle}>통합검색 중입니다</Text>
          <Text style={styles.searchProgressDescription}>여러 공공 API를 동시에 조회하고 결과를 분류하고 있어요.</Text>
        </View>
      </View>
      <View style={styles.searchProgressSteps}>
        {steps.map((step, index) => (
          <View key={step.title} style={styles.searchProgressStep}>
            <View style={styles.searchProgressDot}>
              <Text style={styles.searchProgressDotText}>{index + 1}</Text>
            </View>
            <View style={styles.searchProgressStepCopy}>
              <Text style={styles.searchProgressStepTitle}>{step.title}</Text>
              <Text style={styles.searchProgressStepDescription}>{step.description}</Text>
            </View>
            <Text style={styles.searchProgressStatus}>조회중</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function UnifiedSearchFailure({ keyword, onRetry, onClose }: { keyword: string; onRetry: () => void; onClose: () => void }) {
  return (
    <View style={styles.searchFailurePanel}>
      <View style={styles.searchProgressHeader}>
        <ShieldCheck color={colors.danger} size={18} />
        <View style={styles.searchProgressCopy}>
          <Text style={styles.searchFailureTitle}>통합검색 API 호출에 실패했습니다.</Text>
          <Text style={styles.searchProgressDescription}>
            {keyword || '검색어'} 기준으로 여러 API를 조회하는 중 일부 연결이 실패했습니다. 다시 시도하거나 섬상세에서 개별 정보를 확인해 주세요.
          </Text>
        </View>
      </View>
      <View style={styles.searchFailureActionRow}>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.primaryActionButton}>
          <Text style={styles.primaryActionText}>다시 시도</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryActionButton}>
          <Text style={styles.secondaryActionText}>섬상세로 돌아가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getTravelDetailTabCount(
  tab: TravelDetailTab,
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined,
  trip: TripRecommendation | null
) {
  if (!travelInfo && tab !== 'ferry') return null;
  if (tab === 'ferry') return trip ? 1 : 0;
  if (tab === 'attractions') return travelInfo?.attractions.length ?? 0;
  if (tab === 'camping') return travelInfo?.camps.length ?? 0;
  if (tab === 'lodging') return (travelInfo?.lodgings.length ?? 0) + (travelInfo?.pensions.length ?? 0);
  if (tab === 'food') return travelInfo?.restaurants.length ?? 0;
  if (tab === 'mudflat') return travelInfo?.mudFlats.length ?? 0;
  if (tab === 'facilities') return travelInfo?.otherFacilities.length ?? 0;
  if (tab === 'safety') return travelInfo?.safetyIndexes.length ?? 0;
  return null;
}

function CourseStep({ time, title }: { time: string; title: string }) {
  return (
    <View style={styles.courseStep}>
      <Text style={styles.courseTime}>{time}</Text>
      <Text style={styles.courseTitle}>{title}</Text>
    </View>
  );
}

function TravelInfoBlock({
  title,
  items,
  emptyText,
  emptyActions = [],
  onSelectItem
}: {
  title: string;
  items: TravelInfoCardItem[];
  emptyText: string;
  emptyActions?: { label: string; onPress: () => void; primary?: boolean }[];
  onSelectItem?: (item: TravelInfoCardItem) => void;
}) {
  return (
    <View style={styles.travelInfoBlock}>
      <Text style={styles.travelInfoBlockTitle}>{title}</Text>
      {items.length > 0 ? (
        items.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" onPress={() => onSelectItem?.(item)} style={styles.travelInfoItem}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.travelInfoItemImage} resizeMode="cover" /> : null}
            <View style={styles.travelInfoItemBody}>
              <View style={styles.travelInfoItemHeader}>
                <Text style={styles.travelInfoItemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.badge ? <Text style={styles.travelInfoItemBadge} numberOfLines={1}>{item.badge}</Text> : null}
              </View>
              <Text style={styles.travelInfoItemDescription} numberOfLines={3}>
                {item.description}
              </Text>
              {item.address || item.tel || item.source ? (
                <View style={styles.travelInfoMetaList}>
                  {item.address ? <Text style={styles.travelInfoMetaText} numberOfLines={1}>주소 {item.address}</Text> : null}
                  {item.tel ? <Text style={styles.travelInfoMetaText} numberOfLines={1}>전화 {item.tel}</Text> : null}
                  {item.source ? <Text style={styles.travelInfoSourceText}>{item.source}</Text> : null}
                </View>
              ) : null}
            </View>
          </Pressable>
        ))
      ) : (
        <View style={styles.travelInfoEmptyBox}>
          <Text style={styles.travelInfoEmpty}>{emptyText}</Text>
          {emptyActions.length > 0 ? (
            <View style={styles.emptyActionRow}>
              {emptyActions.map((action) => (
                <Pressable
                  key={action.label}
                  accessibilityRole="button"
                  onPress={action.onPress}
                  style={[styles.emptyActionButton, action.primary && styles.emptyActionButtonPrimary]}
                >
                  <Text style={[styles.emptyActionText, action.primary && styles.emptyActionTextPrimary]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function buildIslandForecastSafetyItems(
  forecast: MarineForecastOverview | undefined,
  options: { islandName: string; isLoading: boolean; isError: boolean }
): TravelInfoCardItem[] {
  if (options.isLoading) {
    return [
      {
        id: 'forecast-loading',
        tab: 'safety',
        group: '현재 예보',
        title: `${options.islandName} 예보 조회 중`,
        badge: '조회 중',
        source: '기상청·국립해양조사원 통합 예보',
        description: '현재 예보 요약, 조석, 기상특보를 불러오고 있습니다.'
      }
    ];
  }

  if (options.isError) {
    return [
      {
        id: 'forecast-error',
        tab: 'safety',
        group: '현재 예보',
        title: '예보 API 실패',
        badge: '확인 필요',
        source: '기상청·국립해양조사원 통합 예보',
        description: '현재 예보 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.'
      }
    ];
  }

  if (!forecast) return [];

  const firstTide = forecast.tideForecasts[0];
  const firstWarning = forecast.weatherWarnings[0];
  const wind = forecast.shortTermForecasts.find((item) => item.category === 'WSD');
  const wave = forecast.shortTermForecasts.find((item) => item.category === 'WAV');
  const rain = forecast.shortTermForecasts.find((item) => item.category === 'POP' || item.category === 'PTY');

  return [
    {
      id: 'forecast-summary',
      tab: 'safety',
      group: '현재 예보',
      title: `${forecast.locationName} 현재 예보`,
      badge: islandForecastRiskLabel(forecast),
      source: '기상청 단기예보',
      description: forecast.summary,
      detailRows: [
        { label: '풍속', value: wind ? `${wind.value}${wind.unit ? ` ${wind.unit}` : ''}` : null },
        { label: '파고', value: wave ? `${wave.value}${wave.unit ? ` ${wave.unit}` : ''}` : null },
        { label: '강수', value: rain ? `${rain.value}${rain.unit ? ` ${rain.unit}` : ''}` : null }
      ]
    },
    {
      id: 'forecast-tide',
      tab: 'safety',
      group: '조석',
      title: firstTide ? `${firstTide.stationName ?? '관측소'} ${firstTide.eventType ?? '조석'}` : '조석 정보 확인',
      badge: firstTide?.tideLevel ? `${firstTide.tideLevel} cm` : '확인 필요',
      source: '국립해양조사원 조석예보',
      description: firstTide?.eventTime ?? forecast.apiStatus.tide.message,
      detailRows: forecast.tideForecasts.slice(0, 4).map((item) => ({
        label: item.eventType ?? '조석',
        value: [item.eventTime, item.tideLevel ? `${item.tideLevel} cm` : null].filter(Boolean).join(' · ')
      }))
    },
    {
      id: 'forecast-warning',
      tab: 'safety',
      group: '기상특보',
      title: firstWarning?.title ?? '기상특보',
      badge: forecast.weatherWarnings.length ? `${forecast.weatherWarnings.length}건` : '특보 없음',
      source: '기상청 기상특보',
      description: firstWarning?.message ?? forecast.apiStatus.warning.message,
      detailRows: forecast.weatherWarnings.slice(0, 3).map((item) => ({
        label: item.areaName ?? '특보',
        value: [item.title, item.issuedAt].filter(Boolean).join(' · ')
      }))
    }
  ];
}

function islandForecastRiskLabel(forecast: MarineForecastOverview | undefined) {
  if (forecast?.riskLevel === 'HIGH') return '위험 높음';
  if (forecast?.riskLevel === 'MEDIUM') return '주의';
  if (forecast?.riskLevel === 'LOW') return '양호';
  return '확인 필요';
}

function TravelDetailContent({
  tab,
  trip,
  island,
  islandName,
  travelInfo,
  forecast,
  forecastLoading,
  forecastError,
  onSelectItem,
  onOpenSearch,
  onOpenPhotos
}: {
  tab: TravelDetailTab;
  trip: TripRecommendation | null;
  island: IslandSummary | null;
  islandName: string | null;
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
  forecast: MarineForecastOverview | undefined;
  forecastLoading: boolean;
  forecastError: boolean;
  onSelectItem: (item: TravelInfoCardItem) => void;
  onOpenSearch: () => void;
  onOpenPhotos: () => void;
}) {
  const detailName = islandName ?? trip?.islandName ?? '선택한 섬';
  const emptyActions = [
    { label: '통합검색', onPress: onOpenSearch, primary: true },
    { label: '사진 보기', onPress: onOpenPhotos }
  ];

  if (tab === 'basic') {
    return (
      <TravelInfoBlock
        title="기본정보"
        emptyText="선택한 섬의 기본정보가 없습니다."
        onSelectItem={onSelectItem}
        items={[
          {
            id: 'basic-route',
            tab: 'basic',
            group: '기본정보',
            title: trip ? `${trip.departurePortName} 출발 ${trip.islandName}` : detailName,
            badge: trip ? '운항 후보' : '도서정보',
            address: island?.address,
            source: getIslandSourceLabel(island?.source),
            description: trip
              ? `${trip.routeName} · ${trip.durationLabel}`
              : [island?.provinceName, island?.cityName, island?.address].filter(Boolean).join(' · ') || '도서 기본정보를 조회했습니다.',
            detailRows: [
              { label: '지역', value: [island?.provinceName, island?.cityName].filter(Boolean).join(' ') },
              { label: '도서구분', value: island?.islandTypeName },
              { label: '연결유형', value: island?.connectionTypeName },
              { label: '다리/제방', value: island?.bridgeNames },
              { label: '예보 권역', value: island?.forecastLocationName },
              { label: '항로', value: trip?.routeName },
              { label: '소요시간', value: trip?.durationLabel }
            ]
          },
          {
            id: 'basic-type',
            tab: 'basic',
            group: '기본정보',
            title: island?.description ? '도서 설명' : '추천 여행 유형',
            badge: island?.description ? '기본정보' : '추천',
            description: island?.description ?? (trip ? trip.tripTypes.map((type) => tripTypeText[type]).join(', ') : '섬 검색 결과 기준 상세정보'),
            detailRows: [
              { label: '추천 유형', value: trip?.tripTypes.map((type) => tripTypeText[type]).join(', ') },
              { label: '법정동코드', value: island?.legalDongCode },
              { label: '도서고유번호', value: island?.islandUniqueNo },
              { label: '데이터 출처', value: getIslandSourceLabel(island?.source) ?? '섬 검색 결과' }
            ]
          }
        ]}
      />
    );
  }

  if (tab === 'ferry') {
    return (
      <TravelInfoBlock
        title="배편"
        emptyText="선택한 섬의 배편 정보가 없습니다. 시간표에서 출발항과 도착항으로 다시 검색해 주세요."
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={[
          {
            id: 'ferry-first',
            tab: 'ferry',
            group: '배편',
            title: `첫 배 ${trip?.firstDeparture ?? '확인 필요'}`,
            badge: '출발',
            source: '운항 스케줄',
            description: trip ? `${trip.departurePortName}에서 출발하는 오늘 운항 후보 기준입니다.` : '검색한 섬의 배편은 시간표 메뉴에서 출발항과 도착항을 선택해 확인하세요.',
            detailRows: [
              { label: '출발항', value: trip?.departurePortName },
              { label: '도착 섬', value: trip?.islandName },
              { label: '항로명', value: trip?.routeName }
            ]
          },
          {
            id: 'ferry-last',
            tab: 'ferry',
            group: '배편',
            title: `복귀 기준 ${trip?.lastDeparture ?? '확인 필요'}`,
            badge: '복귀',
            source: '운항 스케줄',
            description: '당일치기는 마지막 복귀 배편을 먼저 확인하는 흐름으로 안내합니다.',
            detailRows: [
              { label: '마지막 배', value: trip?.lastDeparture },
              { label: '운항상태', value: trip ? statusLabel[trip.status] : null }
            ]
          }
        ]}
      />
    );
  }

  if (tab === 'facilities') {
    return (
      <TravelInfoBlock
        title="편의시설"
        emptyText={getApiStatusMessage(travelInfo, 'facility', '편의시설 정보가 존재하지 않습니다.')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={(travelInfo?.otherFacilities ?? []).slice(0, 6).map((item) => ({
          id: item.id,
          tab: 'facilities',
          group: '편의시설',
          title: item.name,
          badge: item.category,
          address: item.address,
          tel: item.tel,
          source: '지자체 인허가 DB',
          description: [item.category, item.status].filter(Boolean).join(' · ') || '편의시설 정보 확인 필요',
          detailRows: [
            { label: '분류', value: item.category },
            { label: '상태', value: item.status },
            { label: '전화', value: item.tel },
            ...(item.detailFields ?? [])
          ]
        }))}
      />
    );
  }

  if (tab === 'camping') {
    return (
      <TravelInfoBlock
        title="캠핑·차박"
        emptyText={getApiStatusMessage(travelInfo, 'camping', '캠핑/차박정보가 존재하지 않습니다.')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={(travelInfo?.camps ?? []).slice(0, 4).map((item) => ({
          id: item.id,
          tab,
          group: '캠핑·차박',
          title: item.name,
          badge: campStatusLabel(item.status),
          address: item.address,
          source: campSourceLabel(item.source),
          description: item.facilitySummary ?? item.reservation ?? item.restriction ?? '현장 확인 필요',
          detailRows: [
            { label: '이용 상태', value: campStatusLabel(item.status) },
            { label: '편의시설', value: item.facilitySummary },
            { label: '예약', value: item.reservation },
            { label: '제한사항', value: item.restriction },
            ...(item.detailFields ?? [])
          ]
        }))}
      />
    );
  }

  if (tab === 'lodging') {
    const lodgingItems = [
      ...(travelInfo?.lodgings ?? []).map((item) => ({
        id: item.id,
        tab: 'lodging' as const,
        group: '숙박·펜션',
        title: item.name,
        badge: item.status ?? item.category,
        address: item.address,
        tel: item.tel,
        source: '행정안전부 숙박업',
        description: [item.category, item.status].filter(Boolean).join(' · ') || '숙박 정보 확인 필요',
        detailRows: [
          { label: '업종', value: item.category },
          { label: '영업상태', value: item.status },
          { label: '전화', value: item.tel },
          ...(item.detailFields ?? [])
        ]
      })),
      ...(travelInfo?.pensions ?? []).map((item) => ({
        id: item.id,
        tab: 'lodging' as const,
        group: '숙박·펜션',
        title: item.name,
        badge: item.status ?? '관광펜션',
        address: item.address,
        tel: item.tel,
        source: '행정안전부 관광펜션업',
        description: ['관광펜션', item.category, item.status].filter(Boolean).join(' · ') || '펜션 정보 확인 필요',
        detailRows: [
          { label: '업종', value: item.category },
          { label: '영업상태', value: item.status },
          { label: '전화', value: item.tel },
          ...(item.detailFields ?? [])
        ]
      }))
    ];

    return (
      <TravelInfoBlock
        title="숙박·펜션"
        emptyText={[
          getApiStatusMessage(travelInfo, 'lodging', '숙박정보가 존재하지 않습니다.'),
          getApiStatusMessage(travelInfo, 'pension', '펜션정보가 존재하지 않습니다.')
        ].join('\n')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={lodgingItems.slice(0, 6)}
      />
    );
  }

  if (tab === 'food') {
    return (
      <TravelInfoBlock
        title="식당"
        emptyText={getApiStatusMessage(travelInfo, 'food', '식당정보가 존재하지 않습니다.')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={(travelInfo?.restaurants ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          tab: 'food',
          group: '식당',
          title: item.name,
          badge: item.status ?? item.category,
          address: item.address,
          tel: item.tel,
          source: '행정안전부 관광식당',
          description:
            [item.representativeMenu, item.category, item.status].filter(Boolean).join(' · ') ||
            '식당 정보 확인 필요',
          detailRows: [
            { label: '대표메뉴', value: item.representativeMenu },
            { label: '업종', value: item.category },
            { label: '영업상태', value: item.status },
            ...(item.detailFields ?? [])
          ]
        }))}
      />
    );
  }

  if (tab === 'mudflat') {
    return (
      <TravelInfoBlock
        title="갯벌"
        emptyText={getApiStatusMessage(travelInfo, 'mudFlat', '갯벌정보가 존재하지 않습니다.')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={(travelInfo?.mudFlats ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          tab: 'mudflat',
          group: '갯벌',
          title: item.name,
          badge: item.areaName,
          address: item.address,
          tel: item.tel,
          source: '해양수산부 갯벌 정보',
          description:
            [item.experience, item.description].filter(Boolean).join(' · ') ||
            '물때와 현장 통제 여부 확인 필요',
          detailRows: [
            { label: '권역', value: item.areaName },
            { label: '체험', value: item.experience },
            { label: '설명', value: item.description }
          ]
        }))}
      />
    );
  }

  if (tab === 'safety') {
    const forecastItems = buildIslandForecastSafetyItems(forecast, {
      islandName: detailName,
      isLoading: forecastLoading,
      isError: forecastError
    });

    return (
      <TravelInfoBlock
        title="안전정보·예보"
        emptyText={getApiStatusMessage(travelInfo, 'safety', '안전정보와 예보 정보가 존재하지 않습니다.')}
        emptyActions={emptyActions}
        onSelectItem={onSelectItem}
        items={[
          ...forecastItems,
          ...(travelInfo?.safetyIndexes ?? []).slice(0, 3).map((item) => ({
            id: item.id,
            tab: 'safety' as const,
            group: '안전정보·여행지수',
            title: item.title,
            badge: item.score ?? '확인 필요',
            source: '국립해양조사원 바다여행지수',
            description: `${item.score ?? '확인 필요'} · ${item.advisory}`,
            detailRows: [
              { label: '권역', value: item.areaName },
              { label: '지수', value: item.score },
              { label: '안내', value: item.advisory }
            ]
          }))
        ]}
      />
    );
  }

  return (
    <TravelInfoBlock
      title="관광지"
      emptyText={getApiStatusMessage(travelInfo, 'tourism', '관광정보가 존재하지 않습니다.')}
      emptyActions={emptyActions}
      onSelectItem={onSelectItem}
      items={(travelInfo?.attractions ?? []).slice(0, 4).map((item) => ({
        id: item.id,
        tab: 'attractions',
        group: '관광지',
        title: item.title,
        imageUrl: item.imageUrl,
        badge: item.category,
        address: item.address,
        source: '한국관광공사 관광정보',
        description: item.address ?? item.category ?? '관광지 정보',
        detailRows: [
          { label: '분류', value: item.category },
          { label: '주소', value: item.address },
          ...(item.detailFields ?? []),
          { label: '출처', value: '한국관광공사 국문 관광정보' }
        ]
      }))}
    />
  );
}

function getApiStatusMessage(
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined,
  key: keyof Awaited<ReturnType<typeof fetchIslandTravelInfo>>['apiStatus'],
  fallback: string
) {
  return travelInfo?.apiStatus[key]?.message ?? fallback;
}

function PhotoGalleryModal({
  islandName,
  photos,
  sourceLabel,
  photoStatus,
  isLoading,
  visible,
  onClose
}: {
  islandName: string | null;
  photos: Awaited<ReturnType<typeof fetchIslandTravelInfo>>['photos'];
  sourceLabel: string | undefined;
  photoStatus: Awaited<ReturnType<typeof fetchIslandTravelInfo>>['apiStatus']['photo'] | undefined;
  isLoading: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0] ?? null;
  const selectedImageUri = selectedPhoto?.imageUrl ?? selectedPhoto?.thumbnailUrl;

  useEffect(() => {
    if (!visible) return;
    setSelectedPhotoId(null);
  }, [islandName, visible]);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.photoModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.eyebrow}>{sourceLabel ?? '관광사진'}</Text>
              <Text style={styles.modalTitle}>{islandName ?? '섬'} 관련사진</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.photoGrid} showsVerticalScrollIndicator={false}>
            {isLoading ? <Text style={styles.travelInfoEmpty}>관광사진 정보를 불러오는 중입니다.</Text> : null}
            {!isLoading && photos.length > 0 ? (
              <>
                {selectedPhoto ? (
                  <View style={styles.selectedPhotoPanel}>
                    {selectedImageUri ? (
                      <Image source={{ uri: selectedImageUri }} style={styles.selectedPhotoImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.selectedPhotoPlaceholder}>
                        <Images color={colors.muted} size={30} />
                      </View>
                    )}
                    <View style={styles.photoCopy}>
                      <Text style={styles.photoTitle}>{selectedPhoto.title}</Text>
                      <Text style={styles.photoMeta}>
                        {[selectedPhoto.locationName, selectedPhoto.photographer].filter(Boolean).join(' · ') || '사진 위치 확인 필요'}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.photoGridList}>
                  {photos.map((photo) => {
                    const imageUri = photo.thumbnailUrl ?? photo.imageUrl;
                    const selected = selectedPhoto?.id === photo.id;

                    return (
                      <Pressable
                        key={photo.id}
                        accessibilityRole="button"
                        onPress={() => setSelectedPhotoId(photo.id)}
                        style={[styles.photoCard, selected && styles.photoCardSelected]}
                      >
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.photoImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Images color={colors.muted} size={26} />
                          </View>
                        )}
                        <View style={styles.photoCopy}>
                          <Text style={styles.photoTitle} numberOfLines={2}>
                            {photo.title}
                          </Text>
                          <Text style={styles.photoMeta} numberOfLines={2}>
                            {[photo.locationName, photo.photographer].filter(Boolean).join(' · ') || '사진 위치 확인 필요'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            {!isLoading && photos.length === 0 ? (
              <Text style={styles.travelInfoEmpty}>{photoStatus?.message ?? '관련 관광사진이 존재하지 않습니다.'}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TravelInfoItemModal({
  item,
  visible,
  onClose,
  onOpenPhotos
}: {
  item: TravelInfoCardItem | null;
  visible: boolean;
  onClose: () => void;
  onOpenPhotos: () => void;
}) {
  if (!item) return null;

  const visibleRows = (item.detailRows ?? []).filter((row) => Boolean(row.value));

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.travelItemModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.eyebrow}>{item.group ?? '상세정보'}</Text>
              <Text style={styles.modalTitle} numberOfLines={2}>{item.title}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.travelItemModalImage} resizeMode="cover" /> : null}
          <Text style={styles.modalDescription}>{item.description}</Text>
          <View style={styles.travelItemDetailList}>
            {item.badge ? <DetailRow label="상태" value={item.badge} /> : null}
            {item.address ? <DetailRow label="주소" value={item.address} /> : null}
            {item.tel ? <DetailRow label="전화" value={item.tel} /> : null}
            {visibleRows.map((row) => (
              <DetailRow key={`${row.label}-${row.value}`} label={row.label} value={row.value ?? ''} />
            ))}
            {item.source ? <DetailRow label="출처" value={item.source} /> : null}
          </View>
          <View style={styles.nextActionPanel}>
            <Pressable accessibilityRole="button" onPress={onOpenPhotos} style={styles.secondaryActionButton}>
              <Images color={colors.primary} size={17} />
              <Text style={styles.secondaryActionText}>사진 보기</Text>
            </Pressable>
            <Link href="/schedule" asChild>
              <Pressable accessibilityRole="button" style={styles.primaryActionButton}>
                <CalendarDays color={colors.surface} size={17} />
                <Text style={styles.primaryActionText}>시간표 보기</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.travelItemDetailRow}>
      <Text style={styles.travelItemDetailLabel}>{label}</Text>
      <Text style={styles.travelItemDetailValue}>{value}</Text>
    </View>
  );
}

function PurposeRecommendationPanel({
  selectedType,
  trips,
  travelInfo,
  onSelectTrip
}: {
  selectedType: TripType;
  trips: TripRecommendation[];
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
  onSelectTrip?: (trip: TripRecommendation) => void;
}) {
  const summaries = buildPurposeRecommendationSummaries(selectedType, trips, travelInfo);

  return (
    <View style={styles.purposePanel}>
      <View style={styles.purposeHeader}>
        <View>
          <Text style={styles.typeGuideGroupTitle}>목적별 섬 추천</Text>
          <Text style={styles.purposeHint}>배편, 여행 데이터, 안전 확인 항목을 함께 계산합니다.</Text>
        </View>
        <BadgeCheck color={colors.primary} size={20} />
      </View>
      <View style={styles.purposeCardList}>
        {summaries.map((summary) => (
          <Pressable
            key={summary.id}
            accessibilityRole={summary.trip ? 'button' : undefined}
            disabled={!summary.trip}
            onPress={() => {
              if (summary.trip) onSelectTrip?.(summary.trip);
            }}
            style={styles.purposeCard}
          >
            <View style={styles.purposeCardTop}>
              <View style={styles.purposeScoreBadge}>
                <Text style={styles.purposeScore}>{summary.score}</Text>
                <Text style={styles.purposeScoreUnit}>점</Text>
              </View>
              <View style={styles.purposeCardCopy}>
                <Text style={styles.purposeTitle} numberOfLines={1}>
                  {summary.title}
                </Text>
                <Text style={styles.purposeDescription}>{summary.description}</Text>
              </View>
            </View>
            <View style={styles.purposeMetricRow}>
              {summary.metrics.map((metric) => (
                <Text key={metric} style={styles.purposeMetric} numberOfLines={1}>
                  {metric}
                </Text>
              ))}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function PurposeChecklistPanel({
  selectedType,
  trip,
  travelInfo,
  forecast
}: {
  selectedType: TripType;
  trip: TripRecommendation | null;
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
  forecast: MarineForecastOverview | undefined;
}) {
  const checklist = buildPurposeChecklist({ selectedType, trip, travelInfo, forecast });

  return (
    <View style={styles.purposePanel}>
      <View style={styles.purposeHeader}>
        <View>
          <Text style={styles.typeGuideGroupTitle}>목적별 체크리스트</Text>
          <Text style={styles.purposeHint}>출발 전에 놓치기 쉬운 확인 항목만 모았습니다.</Text>
        </View>
        <ShieldCheck color={colors.primary} size={20} />
      </View>
      <View style={styles.purposeChecklistList}>
        {checklist.map((item) => (
          <View key={item.id} style={styles.purposeChecklistRow}>
            <View style={[styles.purposeCheckDot, { backgroundColor: purposeToneColor(item.tone) }]} />
            <View style={styles.purposeChecklistCopy}>
              <Text style={styles.purposeChecklistTitle}>{item.title}</Text>
              <Text style={styles.purposeChecklistText}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function FavoriteIslandNameModal({
  visible,
  islandName,
  name,
  onNameChange,
  onClose,
  onSave
}: {
  visible: boolean;
  islandName: string;
  name: string;
  onNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.favoriteNameCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.eyebrow}>즐겨찾기 이름</Text>
              <Text style={styles.modalTitle}>{islandName || '섬'}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          <View style={styles.favoriteNameInputBox}>
            <TextInput
              value={name}
              onChangeText={onNameChange}
              placeholder="예: 가족여행 후보 섬"
              placeholderTextColor={colors.muted}
              style={styles.favoriteNameInput}
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
          </View>
          <View style={styles.nextActionPanel}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryActionButton}>
              <Text style={styles.secondaryActionText}>취소</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onSave} style={styles.primaryActionButton}>
              <Text style={styles.primaryActionText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildPurposeRecommendationSummaries(
  selectedType: TripType,
  trips: TripRecommendation[],
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined
) {
  const baseTrips = trips.length > 0 ? trips.slice(0, 3) : [];
  const infoScore = calculateTravelInfoScore(selectedType, travelInfo);

  if (baseTrips.length === 0) {
    return [];
  }

  return baseTrips.map((trip, index) => {
    const ferryScore = trip.tripTypes.includes(selectedType) ? 32 : 16;
    const statusScore = trip.status === 'NORMAL' ? 18 : trip.status === 'SCHEDULED' ? 12 : 6;
    const timeScore = trip.firstDeparture && trip.lastDeparture ? 14 : 7;
    const score = Math.min(96, ferryScore + statusScore + timeScore + infoScore - index * 4);

    return {
      id: `${trip.id}-${selectedType}`,
      title: trip.islandName,
      score,
      description: `${trip.departurePortName} 출발 · ${trip.durationLabel} · ${statusLabel[trip.status]}`,
      metrics: buildPurposeMetrics(selectedType, travelInfo, trip),
      trip
    };
  });
}

function buildPurposeMetrics(
  selectedType: TripType,
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined,
  trip: TripRecommendation | null
) {
  const lodgingCount = (travelInfo?.lodgings.length ?? 0) + (travelInfo?.pensions.length ?? 0);
  const metrics = [
    trip?.lastDeparture ? `복귀 ${trip.lastDeparture}` : '복귀편 확인',
    `${travelInfo?.restaurants.length ?? 0} 식당`,
    `${lodgingCount} 숙박`,
    `${travelInfo?.camps.length ?? 0} 캠핑`
  ];

  if (selectedType === 'leisure') metrics.unshift(`${travelInfo?.mudFlats.length ?? 0} 갯벌`);
  if (selectedType === 'family') metrics.unshift(`${travelInfo?.attractions.length ?? 0} 관광지`);
  if (selectedType === 'camping' || selectedType === 'carcamping') metrics.unshift(`${travelInfo?.camps.length ?? 0} 야영 후보`);

  return metrics.slice(0, 4);
}

function calculateTravelInfoScore(selectedType: TripType, travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined) {
  if (!travelInfo) return 18;

  const lodgingCount = travelInfo.lodgings.length + travelInfo.pensions.length;
  const foodScore = Math.min(12, travelInfo.restaurants.length * 3);
  const attractionScore = Math.min(12, travelInfo.attractions.length * 2);
  const safetyScore = Math.min(10, travelInfo.safetyIndexes.length * 5);
  const campingScore = Math.min(14, travelInfo.camps.length * 4);
  const lodgingScore = Math.min(14, lodgingCount * 4);
  const mudFlatScore = Math.min(10, travelInfo.mudFlats.length * 5);

  if (selectedType === 'day') return foodScore + attractionScore + safetyScore;
  if (selectedType === 'overnight' || selectedType === 'quiet') return lodgingScore + foodScore + safetyScore;
  if (selectedType === 'camping' || selectedType === 'carcamping') return campingScore + foodScore + safetyScore;
  if (selectedType === 'family') return foodScore + attractionScore + lodgingScore;
  if (selectedType === 'leisure') return mudFlatScore + safetyScore + foodScore;

  return foodScore + attractionScore + safetyScore;
}

function buildPurposeChecklist({
  selectedType,
  trip,
  travelInfo,
  forecast
}: {
  selectedType: TripType;
  trip: TripRecommendation | null;
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
  forecast: MarineForecastOverview | undefined;
}) {
  const lodgingCount = (travelInfo?.lodgings.length ?? 0) + (travelInfo?.pensions.length ?? 0);
  const items: PurposeChecklistItem[] = [
    {
      id: 'ferry',
      title: '배편과 복귀편',
      description: trip?.lastDeparture ? `마지막 배 ${trip.lastDeparture} 기준으로 체류 시간을 잡으세요.` : '복귀편이 확인되지 않았습니다. 시간표에서 먼저 확인하세요.',
      tone: trip?.lastDeparture ? 'good' : 'warning'
    },
    {
      id: 'forecast',
      title: '해양 예보',
      description: forecast ? `${forecast.summary} · 위험도 ${forecast.riskLevel}` : '예보 데이터가 아직 없으면 예보 화면에서 섬 또는 권역을 조회하세요.',
      tone: forecast?.riskLevel === 'HIGH' ? 'danger' : forecast?.riskLevel === 'MEDIUM' ? 'warning' : forecast ? 'good' : 'neutral'
    }
  ];

  if (selectedType === 'camping' || selectedType === 'carcamping') {
    items.push({
      id: 'camping',
      title: '캠핑·차박 가능성',
      description:
        (travelInfo?.camps.length ?? 0) > 0
          ? `${travelInfo?.camps.length ?? 0}개 후보가 있습니다. 현장 안내문과 지자체 공지를 함께 확인하세요.`
          : '캠핑/차박정보가 존재하지 않습니다. 야영 가능 여부는 현장 확인이 필요합니다.',
      tone: (travelInfo?.camps.length ?? 0) > 0 ? 'good' : 'warning'
    });
  }

  if (selectedType === 'overnight' || selectedType === 'quiet' || selectedType === 'family') {
    items.push({
      id: 'lodging',
      title: '숙박·펜션',
      description: lodgingCount > 0 ? `${lodgingCount}개 숙박 후보가 있습니다. 전화번호와 영업상태를 확인하세요.` : '숙박/펜션정보가 존재하지 않습니다. 섬명과 행정구역 기준을 다시 확인하세요.',
      tone: lodgingCount > 0 ? 'good' : 'warning'
    });
  }

  items.push({
    id: 'food',
    title: '식당·식사',
    description:
      (travelInfo?.restaurants.length ?? 0) > 0
        ? `${travelInfo?.restaurants.length ?? 0}개 식당 정보가 있습니다. 성수기/비수기 운영 여부를 확인하세요.`
        : '식당정보가 존재하지 않습니다. 선착장 주변 운영 여부를 출발 전에 확인하세요.',
    tone: (travelInfo?.restaurants.length ?? 0) > 0 ? 'good' : 'warning'
  });

  if (selectedType === 'leisure') {
    items.push({
      id: 'tide',
      title: '물때와 출입 제한',
      description:
        (travelInfo?.mudFlats.length ?? 0) > 0
          ? `${travelInfo?.mudFlats.length ?? 0}개 갯벌/체험 정보가 있습니다. 만조·간조와 출입 제한을 확인하세요.`
          : '갯벌정보가 존재하지 않습니다. 낚시·해루질은 조석과 기상특보를 먼저 확인하세요.',
      tone: (travelInfo?.mudFlats.length ?? 0) > 0 ? 'good' : 'warning'
    });
  }

  return items;
}

function purposeToneColor(tone: 'good' | 'warning' | 'danger' | 'neutral') {
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'good') return colors.mint;
  return colors.primary;
}

function buildTravelCourseSteps({
  trip,
  selectedType,
  travelInfo,
  departurePort
}: {
  trip: TripRecommendation | null;
  selectedType: TripType;
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
  departurePort: string;
}) {
  const islandName = trip?.islandName ?? '추천 섬';
  const attraction = travelInfo?.attractions[0];
  const restaurant = travelInfo?.restaurants[0];
  const camp = travelInfo?.camps[0];
  const lodging = travelInfo ? [...travelInfo.lodgings, ...travelInfo.pensions][0] : null;
  const mudFlat = travelInfo?.mudFlats[0];
  const safety = travelInfo?.safetyIndexes[0];
  const steps: { time: string; title: string }[] = [
    {
      time: trip?.firstDeparture ?? '출발 전',
      title: `${trip?.departurePortName ?? departurePort}항에서 ${islandName} 배편 확인`
    }
  ];

  if (attraction) {
    steps.push({ time: '도착 후', title: `${attraction.title} 둘러보기` });
  } else {
    steps.push({ time: '도착 후', title: `${islandName} 중심지와 선착장 주변 동선 확인` });
  }

  if (restaurant) {
    steps.push({ time: '점심', title: `${restaurant.name}${restaurant.representativeMenu ? ` · ${restaurant.representativeMenu}` : ''}` });
  } else {
    steps.push({ time: '점심', title: '식당 정보가 없으면 현지 운영 여부 먼저 확인' });
  }

  if ((selectedType === 'camping' || selectedType === 'carcamping') && camp) {
    steps.push({ time: '오후', title: `${camp.name} 편의시설·야영 제한 확인` });
  } else if ((selectedType === 'overnight' || selectedType === 'family') && lodging) {
    steps.push({ time: '오후', title: `${lodging.name} 숙박 가능 여부 확인` });
  } else if (mudFlat) {
    steps.push({ time: '오후', title: `${mudFlat.name} 갯벌 체험과 물때 확인` });
  } else {
    steps.push({ time: '오후', title: '해수욕장·전망 포인트·편의시설 확인' });
  }

  if (safety) {
    steps.push({ time: '안전', title: `${safety.title} ${safety.score ?? ''} · ${safety.advisory}`.trim() });
  }

  steps.push({
    time: trip?.lastDeparture ?? '복귀 전',
    title: trip?.lastDeparture ? '복귀 배편 탑승' : '시간표에서 복귀 배편 재확인'
  });

  return steps;
}

function filterTripsByRegion(trips: TripRecommendation[], region: MarineForecastLocation | null) {
  if (!region) return trips;

  const keywords = [region.label, region.helper, region.stationName, ...region.aliases].filter(Boolean).map((value) => value.trim());
  return trips.filter((trip) => {
    const haystack = [trip.islandName, trip.departurePortName, trip.routeName, trip.island?.provinceName, trip.island?.cityName]
      .filter(Boolean)
      .join(' ');

    return keywords.some((keyword) => keyword && (haystack.includes(keyword) || keyword.includes(trip.islandName)));
  });
}

function buildIslandTravelRegionOptions(islands: IslandSummary[]): IslandTravelRegionOption[] {
  const counts = new Map<string, IslandTravelRegionOption>();
  islands.forEach((island) => {
    if (!island.travelRegionId || !island.travelRegionName) return;
    const current = counts.get(island.travelRegionId);
    counts.set(island.travelRegionId, {
      id: island.travelRegionId,
      name: island.travelRegionName,
      count: (current?.count ?? 0) + 1
    });
  });

  return [...counts.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ko-KR'));
}

function getRegionDeparturePorts(region: MarineForecastLocation | null) {
  if (!region) return defaultDeparturePorts;

  const mapped = regionDeparturePortMap[region.id];
  if (mapped?.length) return mapped;

  const keywords = [region.label, region.helper, region.stationName, ...region.aliases].filter(Boolean).join(' ');
  const matched = defaultDeparturePorts.filter((port) => keywords.includes(port));

  return matched.length ? matched : defaultDeparturePorts;
}

function findForecastLocationByKeyword(keyword: string | null | undefined, locations: MarineForecastLocation[]) {
  const normalizedKeyword = normalizeForecastKeyword(keyword);
  if (!normalizedKeyword) return null;

  return locations
    .map((location) => ({
      location,
      score: getForecastLocationMatchScore(normalizedKeyword, location)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.location ?? null;
}

function getForecastLocationMatchScore(normalizedKeyword: string, location: MarineForecastLocation) {
  const aliases = [location.label, location.helper, location.stationName, ...location.aliases]
    .map((value) => normalizeForecastKeyword(value))
    .filter(Boolean);

  return aliases.reduce((best, alias) => {
    if (normalizedKeyword.includes(alias) || alias.includes(normalizedKeyword)) {
      const specificityBonus = location.kind === 'ISLAND' ? 0.5 : location.kind === 'PORT' ? 0.25 : 0;
      return Math.max(best, alias.length + specificityBonus);
    }

    return best;
  }, 0);
}

function normalizeForecastKeyword(value: string | null | undefined) {
  return value?.replace(/\s/g, '').replace(/항$/g, '').toLowerCase() ?? '';
}

function countTripsByType(trips: TripRecommendation[]) {
  return trips.reduce<Record<TripType, number>>(
    (counts, trip) => {
      trip.tripTypes.forEach((type) => {
        counts[type] = (counts[type] ?? 0) + 1;
      });
      return counts;
    },
    {
      day: 0,
      overnight: 0,
      camping: 0,
      carcamping: 0,
      family: 0,
      leisure: 0,
      quiet: 0
    }
  );
}

function buildTripRecommendations({
  candidates,
  islands,
  routeOptions,
  departurePort
}: {
  candidates: ScheduleCandidate[];
  islands: IslandSummary[];
  routeOptions: RouteOption[];
  departurePort: string;
}): TripRecommendation[] {
  const grouped = new Map<string, ScheduleCandidate[]>();

  candidates
    .filter((candidate) => candidate.status !== 'CANCELED' && candidate.status !== 'CONTROLLED')
    .forEach((candidate) => {
      const islandName = inferIslandName(candidate, routeOptions);
      if (!islandName) return;

      grouped.set(islandName, [...(grouped.get(islandName) ?? []), candidate]);
    });

  const fromCandidates = [...grouped.entries()].map(([islandName, items]) => {
    const sorted = [...items].sort((a, b) => (a.departureTime ?? '').localeCompare(b.departureTime ?? ''));
    const island = findIsland(islandName, islands);
    const representative = sorted[0];

    return {
      id: `${departurePort}-${islandName}`,
      island,
      islandName,
      departurePortName: departurePort,
      routeName: representative.routeName ?? representative.licenseRouteName ?? `${departurePort}-${islandName}`,
      firstDeparture: sorted[0]?.departureTime ?? null,
      lastDeparture: sorted[sorted.length - 1]?.departureTime ?? null,
      durationLabel: inferDurationLabel(islandName),
      status: representative.status,
      tripTypes: inferTripTypes(islandName, sorted)
    };
  });

  return fromCandidates.slice(0, 8);
}

function inferIslandName(candidate: ScheduleCandidate, routeOptions: RouteOption[]) {
  const route = routeOptions.find((item) => item.routeName === candidate.routeName || item.id === candidate.routeCode);
  const names = [
    route?.arrivalPortName,
    route?.stopPortNames.at(-1),
    candidate.routeName,
    candidate.licenseRouteName,
    candidate.currentPortName
  ].filter((value): value is string => Boolean(value));

  return names.map(cleanPortName).find((value) => value.length >= 2) ?? null;
}

function cleanPortName(value: string) {
  return value.replace(/항|항로|여객선|터미널/g, '').split('-').at(-1)?.trim() ?? value.trim();
}

function findIsland(islandName: string, islands: IslandSummary[]) {
  const normalized = islandName.replace(/도$/, '');
  return islands.find((island) => island.islandName.includes(normalized) || normalized.includes(island.islandName.replace(/도$/, ''))) ?? null;
}

function inferDurationLabel(islandName: string) {
  if (islandName.includes('백령')) return '약 4시간';
  if (islandName.includes('울릉')) return '약 3시간';
  if (islandName.includes('제주')) return '약 5시간';
  if (islandName.includes('덕적')) return '약 1시간 50분';
  return '배편 기준 확인';
}

function inferTripTypes(islandName: string, candidates: ScheduleCandidate[]): TripType[] {
  const types: TripType[] = candidates.length >= 2 ? ['day'] : ['overnight'];

  if (islandName.includes('덕적') || islandName.includes('자월')) types.push('camping', 'family');
  if (islandName.includes('백령') || islandName.includes('울릉')) types.push('overnight', 'quiet');
  if (islandName.includes('제주')) types.push('family', 'leisure');
  if (!types.includes('leisure')) types.push('leisure');

  return Array.from(new Set(types));
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function campStatusLabel(status: 'AVAILABLE' | 'PARTIAL' | 'CHECK_REQUIRED' | 'RESTRICTED' | 'PROHIBITED') {
  if (status === 'AVAILABLE') return '가능';
  if (status === 'PARTIAL') return '일부 가능';
  if (status === 'RESTRICTED') return '제한';
  if (status === 'PROHIBITED') return '금지';
  return '확인 필요';
}

function campSourceLabel(source: 'GOCAMPING' | 'CULTURE_CAMPING' | 'LOCAL_CAMPGROUND' | 'MOCK') {
  if (source === 'GOCAMPING') return '한국관광공사 고캠핑';
  if (source === 'CULTURE_CAMPING') return '한국문화정보원 캠핑';
  if (source === 'LOCAL_CAMPGROUND') return '행정안전부 일반야영장업';
  return null;
}

function getIslandSourceLabel(source: IslandSummary['source'] | undefined) {
  if (source === 'LOCAL_ISLAND_MASTER') return '행정안전부 도서지역 데이터';
  if (source === 'VWORLD') return 'VWorld 도서정보';
  if (source === 'MOCK') return '데이터 출처 확인 필요';
  return null;
}

function getRecommendationReason(trip: TripRecommendation) {
  if (trip.tripTypes.includes('day')) {
    return '첫 배와 마지막 배가 있어 당일 일정으로 검토하기 좋습니다.';
  }

  if (trip.tripTypes.includes('camping')) {
    return '캠핑·해수욕장 정보와 함께 확인하기 좋은 섬입니다.';
  }

  if (trip.status === 'UNKNOWN') {
    return '운항상태 확인 후 여행을 확정하는 것이 좋습니다.';
  }

  return '배편과 여행 정보를 함께 비교할 수 있는 추천 섬입니다.';
}

function buildUnifiedSearchResults(
  keyword: string,
  islands: IslandSummary[],
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>>,
  travelAssets: TripRecommendationAsset[] = []
): UnifiedSearchResult[] {
  const primaryIsland = islands[0] ?? createSearchIsland(keyword);
  const normalizedKeyword = keyword.trim();
  const results: UnifiedSearchResult[] = islands.slice(0, 8).map((island) => ({
    id: `island-${island.id}`,
    group: '기본정보',
    title: island.islandName,
    description: [island.provinceName, island.cityName, island.address].filter(Boolean).join(' · ') || '도서 기본정보',
    tab: 'basic',
    island
  }));

  const push = (
    group: UnifiedSearchResult['group'],
    id: string,
    title: string,
    description: string,
    tab: TravelDetailTab
  ) => {
    if (!matchesUnifiedKeyword([title, description], normalizedKeyword)) return;
    results.push({ id, group, title, description, tab, island: primaryIsland });
  };

  travelInfo.attractions.forEach((item) => {
    const mapped = mapTextToUnifiedSearchGroup([item.title, item.category, item.address].filter(Boolean).join(' '));
    push(mapped.group, `attraction-${item.id}`, item.title, item.address ?? item.category ?? '관광지 정보', mapped.tab);
  });
  travelInfo.camps.forEach((item) =>
    push('캠핑·야영', `camp-${item.id}`, item.name, [campStatusLabel(item.status), item.address, item.facilitySummary].filter(Boolean).join(' · '), 'camping')
  );
  travelInfo.lodgings.forEach((item) => push('숙박', `lodging-${item.id}`, item.name, [item.category, item.address, item.tel].filter(Boolean).join(' · '), 'lodging'));
  travelInfo.pensions.forEach((item) => push('숙박', `pension-${item.id}`, item.name, ['관광펜션', item.category, item.address, item.tel].filter(Boolean).join(' · '), 'lodging'));
  travelInfo.restaurants.forEach((item) => push('맛집·시장', `food-${item.id}`, item.name, [item.representativeMenu, item.category, item.address].filter(Boolean).join(' · '), 'food'));
  travelInfo.mudFlats.forEach((item) => push('갯벌·물때', `mudflat-${item.id}`, item.name, [item.areaName, item.experience, item.address].filter(Boolean).join(' · '), 'mudflat'));
  travelInfo.safetyIndexes.forEach((item) => push('안전정보', `safety-${item.id}`, item.title, [item.score, item.areaName, item.advisory].filter(Boolean).join(' · '), 'safety'));
  travelInfo.photos.forEach((item) => push('사진·전망', `photo-${item.id}`, item.title, [item.locationName, item.photographer].filter(Boolean).join(' · ') || '관광사진', 'attractions'));

  travelAssets.forEach((asset) => {
    const mapped = mapTravelAssetToUnifiedSearch(asset);
    if (!matchesUnifiedKeyword([asset.name, asset.address, asset.sourceTitle, asset.travelRegionName, asset.matchedIslandName, ...(asset.tags ?? [])], normalizedKeyword)) return;
    results.push({
      id: `travel-asset-${asset.id}`,
      group: mapped.group,
      title: asset.name,
      description: [asset.address, asset.travelRegionName, asset.matchedIslandName, asset.sourceTitle].filter(Boolean).join(' · ') || '수집 여행 데이터',
      tab: mapped.tab,
      island: asset.matchedIslandName
        ? createSearchIsland(asset.matchedIslandName, {
            provinceName: null,
            cityName: null,
            address: asset.address ?? asset.travelRegionName ?? null
          })
        : primaryIsland,
      badge: mapped.badge,
      address: asset.address,
      source: asset.sourceTitle,
      detailRows: [
        { label: '데이터 유형', value: mapped.badge },
        { label: '여행권역', value: asset.travelRegionName },
        { label: '관련 섬', value: asset.matchedIslandName },
        { label: '수집 키워드', value: asset.sourceKeywords?.join(', ') },
        { label: '추천 근거', value: asset.reasons.join(' · ') }
      ]
    });
  });

  return uniqueUnifiedSearchResults(results).slice(0, 60);
}

function mapTravelAssetToUnifiedSearch(asset: TripRecommendationAsset): { group: UnifiedSearchResult['group']; tab: TravelDetailTab; badge: string } {
  const mapped = mapTextToUnifiedSearchGroup([asset.category, asset.name, asset.sourceTitle, ...(asset.sourceKeywords ?? []), ...(asset.tags ?? [])].filter(Boolean).join(' '));
  if (asset.category === 'food') return { group: '맛집·시장', tab: 'food', badge: mapped.badge };
  if (asset.category === 'accommodation') return { group: '숙박', tab: 'lodging', badge: mapped.badge };
  if (asset.category === 'facility' || asset.category === 'accessibility') return { group: mapped.group, tab: 'facilities', badge: mapped.badge };
  return mapped;
}

function mapTextToUnifiedSearchGroup(text: string): { group: UnifiedSearchResult['group']; tab: TravelDetailTab; badge: string } {
  if (/(여객선|선착장|어항|항구|항만|배편|터미널)/.test(text)) return { group: '배편·선착장', tab: 'ferry', badge: '배편·선착장' };
  if (/(걷기|산책|둘레길|올레길|탐방로|트레킹|해파랑길|해안길)/.test(text)) return { group: '걷기·트레킹', tab: 'attractions', badge: '걷기·트레킹' };
  if (/(해변|해수욕|해수욕장|바다|해안)/.test(text)) return { group: '해변·해수욕', tab: 'attractions', badge: '해변·해수욕' };
  if (/(낚시|마리나|서핑|수상레저|스노클링|요트|카약|해양레저|해양)/.test(text)) return { group: '해양레저', tab: 'mudflat', badge: '해양레저' };
  if (/(맛집|식당|카페|수산시장|전통시장|시장|해산물|특산물)/.test(text)) return { group: '맛집·시장', tab: 'food', badge: '맛집·시장' };
  if (/(숙박|모텔|민박|펜션|호텔)/.test(text)) return { group: '숙박', tab: 'lodging', badge: '숙박' };
  if (/(캠핑|야영|차박)/.test(text)) return { group: '캠핑·야영', tab: 'camping', badge: '캠핑·야영' };
  if (/(갯벌|해루질|물때)/.test(text)) return { group: '갯벌·물때', tab: 'mudflat', badge: '갯벌·물때' };
  if (/(화장실|샤워장|주차장|편의시설)/.test(text)) return { group: '편의시설', tab: 'facilities', badge: '편의시설' };
  if (/(공원|무장애|반려동물)/.test(text)) return { group: '공원·무장애', tab: 'facilities', badge: '공원·무장애' };
  if (/(축제|공연|행사)/.test(text)) return { group: '축제·행사', tab: 'attractions', badge: '축제·행사' };
  if (/(노을|일몰|일출|등대|전망대|포토존|사진|viewpoint)/.test(text)) return { group: '사진·전망', tab: 'attractions', badge: '사진·전망' };
  if (/(안전|여행지수|예보|기상|파고|풍속)/.test(text)) return { group: '안전정보', tab: 'safety', badge: '안전정보' };
  return { group: '관광·체험', tab: 'attractions', badge: /(체험|어촌|관광|여행)/.test(text) ? '관광·체험' : '수집 데이터' };
}

function uniqueUnifiedSearchResults(results: UnifiedSearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = [result.group, result.title, result.description].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matchesUnifiedKeyword(values: Array<string | null | undefined>, keyword: string) {
  if (!keyword) return true;
  const target = values.filter(Boolean).join(' ').replace(/\s+/g, '').toLowerCase();
  const normalizedKeyword = keyword.replace(/\s+/g, '').toLowerCase();
  return target.includes(normalizedKeyword) || normalizedKeyword.includes(target.slice(0, 2));
}

function groupUnifiedResults(results: UnifiedSearchResult[]) {
  const order: UnifiedSearchResult['group'][] = [
    '기본정보',
    '배편·선착장',
    '관광·체험',
    '걷기·트레킹',
    '해변·해수욕',
    '해양레저',
    '맛집·시장',
    '숙박',
    '캠핑·야영',
    '갯벌·물때',
    '편의시설',
    '공원·무장애',
    '축제·행사',
    '사진·전망',
    '안전정보'
  ];
  return order
    .map((title) => ({ title, items: results.filter((item) => item.group === title) }))
    .filter((group) => group.items.length > 0);
}

function toSavedIslandSearch(
  island: IslandSummary,
  options: Pick<SavedIslandSearch, 'displayName' | 'savedAt' | 'searchedAt'> = {}
): SavedIslandSearch {
  return {
    id: island.id || island.islandName,
    kind: 'island',
    islandName: island.islandName,
    provinceName: island.provinceName,
    cityName: island.cityName,
    ...options
  };
}

function toRecentKeywordSearch(keyword: string): SavedIslandSearch {
  const normalized = keyword.trim();

  return {
    id: `keyword-${normalized.toLowerCase()}`,
    kind: 'keyword',
    islandName: normalized,
    keyword: normalized,
    provinceName: null,
    cityName: null,
    searchedAt: new Date().toISOString()
  };
}

function findIslandBySaved(item: SavedIslandSearch, islands: IslandSummary[]): IslandSummary {
  return (
    islands.find((island) => island.id === item.id || island.islandName === item.islandName) ?? {
      id: item.id,
      islandName: item.islandName,
      provinceName: item.provinceName,
      cityName: item.cityName,
      address: null,
      latitude: null,
      longitude: null,
      areaSquareMeters: null,
      coastlineLengthMeters: null,
      population: null,
      description: null,
      source: 'VWORLD',
      updatedAt: new Date().toISOString()
    }
  );
}

function createSearchIsland(
  islandName: string,
  options: { provinceName?: string | null; cityName?: string | null; address?: string | null } = {}
): IslandSummary {
  return {
    id: `search-${islandName}`,
    islandName,
    provinceName: options.provinceName ?? null,
    cityName: options.cityName ?? null,
    address: options.address ?? null,
    latitude: null,
    longitude: null,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: null,
    source: 'VWORLD',
    updatedAt: new Date().toISOString()
  };
}

function createRouteIsland(params: { islandName: string; provinceName: string | null; cityName: string | null }): IslandSummary {
  return {
    id: `route-${params.islandName}-${params.provinceName ?? 'unknown'}-${params.cityName ?? 'unknown'}`,
    islandName: params.islandName,
    provinceName: params.provinceName,
    cityName: params.cityName,
    address: null,
    latitude: null,
    longitude: null,
    areaSquareMeters: null,
    coastlineLengthMeters: null,
    population: null,
    description: null,
    source: 'VWORLD',
    updatedAt: new Date().toISOString()
  };
}

function getRouteParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim();
  return normalized ? normalized : null;
}

function isTripSectionKey(value: string): value is TripSectionKey {
  return tripSectionMenu.some((section) => section.key === value);
}

function toTravelDetailTab(value: string | null): TravelDetailTab | null {
  if (!value) return null;
  return travelDetailTabs.some((tab) => tab.key === value) ? (value as TravelDetailTab) : null;
}

function readSavedIslandSearches(key: string): SavedIslandSearch[] {
  const memoryStore = globalThis as typeof globalThis & { __badagilIslandTripRecents?: SavedIslandSearch[] };
  if (key === ISLAND_TRIP_RECENTS_KEY && Array.isArray(memoryStore.__badagilIslandTripRecents)) {
    return memoryStore.__badagilIslandTripRecents.filter(isSavedIslandSearch);
  }

  if (typeof globalThis.localStorage === 'undefined') return [];

  try {
    const value = globalThis.localStorage.getItem(key);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isSavedIslandSearch) : [];
  } catch {
    return [];
  }
}

function writeSavedIslandSearches(key: string, items: SavedIslandSearch[]) {
  const memoryStore = globalThis as typeof globalThis & { __badagilIslandTripRecents?: SavedIslandSearch[] };
  if (key === ISLAND_TRIP_RECENTS_KEY) {
    memoryStore.__badagilIslandTripRecents = items;
  }

  if (typeof globalThis.localStorage === 'undefined') return;
  globalThis.localStorage.setItem(key, JSON.stringify(items));
}

function isSavedIslandSearch(value: unknown): value is SavedIslandSearch {
  return Boolean(value && typeof value === 'object' && 'id' in value && 'islandName' in value);
}

function formatSavedIslandTime(item: SavedIslandSearch) {
  const value = item.searchedAt ?? item.savedAt;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}/${date.getDate()} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  regionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  regionTitleCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  regionPanelTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  regionPanelText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  regionChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  regionChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 96,
    paddingHorizontal: 10
  },
  regionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  regionChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  regionChipTextSelected: {
    color: colors.surface
  },
  unifiedSearchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  unifiedSearchBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 11
  },
  unifiedSearchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
    paddingVertical: 8
  },
  unifiedSearchButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 13
  },
  unifiedSearchButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900'
  },
  recommendedRegionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 11,
    padding: 14
  },
  recommendedRegionStrip: {
    gap: 8,
    paddingRight: 4
  },
  recommendedRegionChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12
  },
  recommendedRegionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  recommendedRegionChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  recommendedRegionChipTextSelected: {
    color: colors.surface
  },
  recommendedRegionChipCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  recommendedIslandGrid: {
    gap: 9
  },
  recommendedIslandCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 118,
    overflow: 'hidden',
    padding: 10
  },
  recommendedIslandImage: {
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 96,
    width: 96
  },
  recommendedIslandCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  recommendedIslandTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  recommendedIslandMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  recommendedIslandDescription: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18
  },
  recommendedIslandTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5
  },
  recommendedIslandTag: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  quickPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  quickPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38
  },
  quickPanelTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minWidth: 0
  },
  quickPanelTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  quickPanelCount: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  quickPanelToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3
  },
  quickPanelToggleText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }]
  },
  quickPanelHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  quickPanelBody: {
    gap: 12
  },
  quickGroup: {
    gap: 7
  },
  quickSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  quickGroupTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  quickSectionText: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800'
  },
  quickRouteList: {
    gap: 7
  },
  islandQuickRow: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    padding: 9
  },
  islandQuickCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  routeChipTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  recentRouteLine: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  favoriteInlineAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  searchModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 14,
    maxHeight: '88%',
    padding: 18
  },
  searchResultStack: {
    gap: 12,
    paddingBottom: 12
  },
  searchFilterStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  searchFilterChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  searchFilterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  searchFilterChipText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  searchFilterChipTextSelected: {
    color: colors.surface
  },
  searchResultGroup: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 8,
    padding: 10
  },
  searchResultGroupTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  searchResultItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    padding: 10
  },
  searchResultAccordion: {
    gap: 0
  },
  searchResultItemExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.primary
  },
  searchResultCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  searchResultTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  searchResultDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  searchDetailPanel: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderColor: colors.primary,
    borderTopWidth: 0,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  searchProgressPanel: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  searchProgressHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9
  },
  searchProgressCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  searchProgressTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  searchProgressDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  searchProgressSteps: {
    gap: 7
  },
  searchProgressStep: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    padding: 9
  },
  searchProgressDot: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 26,
    justifyContent: 'center',
    width: 26
  },
  searchProgressDotText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  searchProgressStepCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  searchProgressStepTitle: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  searchProgressStepDescription: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15
  },
  searchProgressStatus: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  searchFailurePanel: {
    backgroundColor: '#fff5f5',
    borderColor: '#ffd1d1',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  searchFailureTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900'
  },
  searchFailureActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  searchDetailBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  searchDetailBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  searchDetailTitle: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 25
  },
  searchDetailDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  searchDetailMetaBox: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10
  },
  searchDetailMetaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  searchDetailMetaValue: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  subMenuPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  subMenuTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3
  },
  subMenuStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%'
  },
  subMenuItem: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 10
  },
  subMenuItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  subMenuItemLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  subMenuItemLabelSelected: {
    color: colors.surface
  },
  subMenuItemDescription: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  subMenuItemDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.82)'
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  availableFilterGroup: {
    gap: 8
  },
  availableFilterTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  badgeChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  badgeChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  badgeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  badgeChipText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  badgeChipTextSelected: {
    color: colors.surface
  },
  availableList: {
    gap: 10
  },
  tripAccordion: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  tripAccordionFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  tripAccordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 54
  },
  tripAccordionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  tripAccordionSide: {
    alignItems: 'flex-end',
    gap: 5
  },
  tripAccordionToggle: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  tripAccordionBody: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 10
  },
  tripDetailButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 11
  },
  tripDetailButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  todayBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  chipRow: {
    gap: 8,
    paddingRight: 8
  },
  portChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13
  },
  portChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  portChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  portChipTextSelected: {
    color: colors.surface
  },
  recommendationStrip: {
    gap: 12,
    paddingRight: 12
  },
  emptyWideCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minHeight: 112,
    padding: 14,
    width: 280
  },
  tripCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 236,
    padding: 14,
    width: 254
  },
  tripCardFocused: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  tripCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  tripIconBox: {
    alignItems: 'center',
    backgroundColor: '#e9fbf5',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    width: 46
  },
  tripIcon: {
    height: 40,
    width: 40
  },
  tripName: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: '900'
  },
  tripRoute: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  tripMetaGrid: {
    flexDirection: 'row',
    gap: 7
  },
  miniStat: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flex: 1,
    gap: 3,
    minHeight: 56,
    padding: 8
  },
  miniStatLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900'
  },
  miniStatValue: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  tripTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  tripTag: {
    backgroundColor: '#fff2d6',
    borderRadius: 999,
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tripReason: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typeButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12
  },
  typeButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  typeLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  typeLabelSelected: {
    color: colors.surface
  },
  typeGuideCard: {
    backgroundColor: '#f5fbff',
    borderColor: '#cde7ff',
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 12
  },
  typeGuideHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 11
  },
  typeGuideIconBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  typeGuideCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  typeGuideTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22
  },
  typeGuideSummary: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  typeInsightRow: {
    flexDirection: 'row',
    gap: 8
  },
  typeGuideGroup: {
    gap: 7
  },
  typeGuideGroupTitle: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  typeGuideChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  typeGuideChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  typeChecklist: {
    gap: 6
  },
  typeChecklistItem: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    padding: 9
  },
  typeChecklistText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  purposePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 11
  },
  purposeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  purposeHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3
  },
  purposeCardList: {
    gap: 8
  },
  purposeCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 10
  },
  purposeCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10
  },
  purposeScoreBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  purposeScore: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21
  },
  purposeScoreUnit: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900'
  },
  purposeCardCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  purposeTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  purposeDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  purposeMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  purposeMetric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  purposeChecklistList: {
    gap: 8
  },
  purposeChecklistRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 10
  },
  purposeCheckDot: {
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12
  },
  purposeChecklistCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  purposeChecklistTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18
  },
  purposeChecklistText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  typeGuideActionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  typeFallbackText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  typeSuggestionList: {
    gap: 7
  },
  typeSuggestionItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    padding: 10
  },
  typeSuggestionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  typeSuggestionTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  typeSuggestionMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  typeSuggestionAction: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  detailPanel: {
    backgroundColor: '#f5fbff',
    borderColor: '#cde7ff',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  detailDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  inlineDetailNotice: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  detailSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 11
  },
  detailSummaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  detailSummaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  detailSummaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  detailSummaryTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  detailSummaryMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  detailSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  detailSummaryStat: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    minHeight: 50,
    minWidth: 96,
    padding: 8
  },
  detailSummaryLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900'
  },
  detailSummaryValue: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3
  },
  detailSearchPanel: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  detailSearchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    minWidth: 180,
    paddingHorizontal: 11
  },
  detailSearchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
    paddingVertical: 8
  },
  detailResetButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12
  },
  detailResetText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  detailSearchResults: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 9
  },
  relatedIslandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2
  },
  relatedIslandTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  relatedIslandCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  detailSearchItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
    padding: 9
  },
  detailSearchItemCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  detailSearchItemTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  detailSearchItemMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  detailTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  detailTab: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  detailTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  detailTabText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center'
  },
  detailTabTextSelected: {
    color: colors.surface
  },
  travelSourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  travelSourceText: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  travelInfoGrid: {
    gap: 10
  },
  nextActionPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minWidth: 128,
    minHeight: 44
  },
  secondaryActionText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minWidth: 128,
    minHeight: 44
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  actionButtonDisabled: {
    opacity: 0.56
  },
  travelInfoBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minWidth: 0,
    padding: 11
  },
  travelInfoBlockTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  travelInfoItem: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
    padding: 9
  },
  travelInfoItemImage: {
    borderRadius: 8,
    height: 76,
    width: 86
  },
  travelInfoItemBody: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  travelInfoItemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7
  },
  travelInfoItemTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    fontWeight: '900'
  },
  travelInfoItemBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    color: colors.primary,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: '900',
    maxWidth: 96,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  travelInfoItemDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  travelInfoMetaList: {
    gap: 3
  },
  travelInfoMetaText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800'
  },
  travelInfoSourceText: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  travelInfoEmpty: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  travelInfoEmptyBox: {
    gap: 9
  },
  emptyActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  emptyActionButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10
  },
  emptyActionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  emptyActionText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900'
  },
  emptyActionTextPrimary: {
    color: colors.surface
  },
  campingNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#fff7e8',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 11
  },
  campingNoticeText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  coursePanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  courseStep: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12
  },
  courseTime: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    width: 64
  },
  courseTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    fontWeight: '900'
  },
  safetyPanel: {
    backgroundColor: '#eefaf4',
    borderColor: '#c8ead8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  safetyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  safetyItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10
  },
  safetyText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  safetyHint: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20
  },
  savedList: {
    gap: 8
  },
  savedItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 58,
    padding: 11
  },
  savedCopy: {
    flex: 1,
    minWidth: 0
  },
  savedTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  savedMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  modalBackdrop: {
    backgroundColor: 'rgba(10, 28, 47, 0.34)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 14,
    padding: 18
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  modalDescription: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21
  },
  modalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  photoModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 14,
    maxHeight: '86%',
    padding: 18
  },
  travelItemModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 13,
    maxHeight: '86%',
    padding: 18
  },
  travelItemModalImage: {
    aspectRatio: 1.7,
    borderRadius: 8,
    width: '100%'
  },
  travelItemDetailList: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 1,
    padding: 8
  },
  travelItemDetailRow: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8
  },
  travelItemDetailLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    width: 68
  },
  travelItemDetailValue: {
    color: colors.navy,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  favoriteNameCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 14,
    padding: 18
  },
  favoriteNameInputBox: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12
  },
  favoriteNameInput: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 11
  },
  photoGrid: {
    gap: 10,
    paddingBottom: 12
  },
  selectedPhotoPanel: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    overflow: 'hidden'
  },
  selectedPhotoImage: {
    aspectRatio: 1.72,
    width: '100%'
  },
  selectedPhotoPlaceholder: {
    alignItems: 'center',
    aspectRatio: 1.72,
    backgroundColor: '#eef3f6',
    justifyContent: 'center',
    width: '100%'
  },
  photoGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9
  },
  photoCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 138,
    overflow: 'hidden',
    width: '48%'
  },
  photoCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  photoImage: {
    aspectRatio: 1.55,
    width: '100%'
  },
  photoPlaceholder: {
    alignItems: 'center',
    aspectRatio: 1.55,
    backgroundColor: '#eef3f6',
    justifyContent: 'center',
    width: '100%'
  },
  photoCopy: {
    gap: 4,
    padding: 10
  },
  photoTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19
  },
  photoMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  }
});
