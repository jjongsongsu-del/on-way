import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link, type Href } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, Clock3, Images, MapPin, Ship, Waves } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { fetchIslandTravelInfo } from '@/api/island-trips';
import { fetchMarineForecast } from '@/api/forecasts';
import { fetchScheduleCandidates, type ScheduleCandidate } from '@/api/schedules';
import { useAppSelectionContext } from '@/state/app-selection-context';
import { buildInterestAlerts, type InterestAlert } from '@/state/interest-alerts';
import { colors } from '@/theme/colors';

const HOME_RECENTS_KEY = 'badagil:island-trip:recents';
const HOME_ROUTE_FAVORITES_KEY = 'badagil:schedule:favorites';
const HOME_ROUTE_RECENTS_KEY = 'badagil:schedule:recents';

type HomeIslandTarget = {
  islandName: string;
  provinceName: string | null;
  cityName: string | null;
  routeLabel: string;
  contextLabel: string;
  statusLabel: string;
  statusTime: string;
  source: 'context' | 'recent' | 'recommended';
};

type HomeRecentIslandRaw = {
  kind?: 'island' | 'keyword';
  islandName?: string;
  provinceName?: string | null;
  cityName?: string | null;
};

type HomePhoto = {
  id: string;
  title: string;
  imageUrl: string;
  meta: string;
  source: string;
};

type HomeRouteTarget = {
  departure: string;
  arrival: string;
  name?: string;
  searchDate?: string;
  source: 'context' | 'favorite' | 'recent' | 'recommended';
};

type HomeRouteRaw = {
  departure?: string;
  arrival?: string;
  name?: string;
  searchDate?: string;
};

type HomeCheckItem = {
  id: string;
  title: string;
  description: string;
  tone: 'good' | 'warning' | 'danger' | 'neutral';
};

type HomeSummaryPillProps = {
  icon: typeof Images;
  label: string;
  value: string;
  color: string;
};

const recommendedIsland: HomeIslandTarget = {
  islandName: '백령도',
  provinceName: '인천광역시',
  cityName: '옹진군',
  routeLabel: '인천 → 백령도',
  contextLabel: '추천 섬여행',
  statusLabel: '정상 운항',
  statusTime: '08:30 출항 예정',
  source: 'recommended'
};

const recommendedRoute: HomeRouteTarget = {
  departure: '인천',
  arrival: '백령도',
  name: '인천 → 백령도',
  source: 'recommended'
};

export default function HomeScreen() {
  const appContext = useAppSelectionContext();
  const interestAlerts = useMemo(() => buildInterestAlerts(appContext), [appContext]);
  const homeIsland = useMemo(() => contextIslandToHomeTarget(appContext.island) ?? readHomeRecentIsland() ?? recommendedIsland, [appContext.island]);
  const today = useMemo(() => formatDate(new Date()), []);
  const homeRoute = useMemo(() => contextRouteToHomeTarget(appContext.route) ?? readHomeRoute() ?? recommendedRoute, [appContext.route]);
  const detailHref = useMemo(() => createIslandTripDetailHref(homeIsland), [homeIsland]);
  const forecastHref = useMemo(
    () =>
      ({
        pathname: '/forecast',
        params: { locationName: homeRoute.arrival || homeIsland.islandName }
      }) as Href,
    [homeIsland.islandName, homeRoute.arrival]
  );

  const travelInfoQuery = useQuery({
    queryKey: ['home-island-travel-info', homeIsland.islandName, homeIsland.provinceName, homeIsland.cityName],
    queryFn: () =>
      fetchIslandTravelInfo({
        islandName: homeIsland.islandName,
        provinceName: homeIsland.provinceName,
        cityName: homeIsland.cityName
      }),
    staleTime: 30 * 60 * 1000
  });
  const routeCandidatesQuery = useQuery({
    queryKey: ['home-route-candidates', today, homeRoute.departure, homeRoute.arrival],
    queryFn: () => fetchScheduleCandidates({ date: today, departure: homeRoute.departure, arrival: homeRoute.arrival }),
    retry: false,
    staleTime: 5 * 60 * 1000
  });
  const routeForecastQuery = useQuery({
    queryKey: ['home-route-forecast', homeRoute.arrival || homeIsland.islandName],
    queryFn: () => fetchMarineForecast({ locationName: homeRoute.arrival || homeIsland.islandName }),
    retry: false,
    staleTime: 10 * 60 * 1000
  });

  const galleryItems = useMemo<HomePhoto[]>(() => {
    const info = travelInfoQuery.data;
    if (!info) return [];

    const photoItems = info.photos
      .map((photo) => ({
        id: photo.id,
        title: photo.title,
        imageUrl: photo.imageUrl ?? photo.thumbnailUrl ?? '',
        meta: [photo.locationName, photo.photographer].filter(Boolean).join(' · ') || `${homeIsland.islandName} 관광사진`,
        source: photo.source === 'BORYEONG_ISLAND_PHOTO' ? '충청남도 보령시 섬사진' : '한국관광공사 관광사진'
      }))
      .filter((photo) => photo.imageUrl);

    if (photoItems.length > 0) return photoItems.slice(0, 4);

    return info.attractions
      .map((attraction) => ({
        id: attraction.id,
        title: attraction.title,
        imageUrl: attraction.imageUrl ?? '',
        meta: attraction.address ?? attraction.category ?? `${homeIsland.islandName} 관광지`,
        source: '한국관광공사 관광정보 이미지'
      }))
      .filter((photo) => photo.imageUrl)
      .slice(0, 4);
  }, [homeIsland.islandName, travelInfoQuery.data]);

  const heroImage = galleryItems[0]?.imageUrl;
  const nextCandidate = useMemo(() => pickNextCandidate(routeCandidatesQuery.data ?? []), [routeCandidatesQuery.data]);
  const checkItems = useMemo(
    () => buildHomeCheckItems({ route: homeRoute, candidate: nextCandidate, forecastRisk: routeForecastQuery.data?.riskLevel, hasForecastError: routeForecastQuery.isError }),
    [homeRoute, nextCandidate, routeForecastQuery.data?.riskLevel, routeForecastQuery.isError]
  );

  return (
    <Screen
      title="섬똑"
      subtitle="부기가 여객선 운항 정보와 섬여행 정보를 안전하게 챙겨드릴게요."
      mascotSource={require('../../assets/mascot/boogi_bg1.png')}
    >
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <Image source={require('../../assets/mascot/boogi_bg1.png')} style={styles.avatar} resizeMode="contain" />
          <View>
            <Text style={styles.greeting}>안녕하세요</Text>
            <Text style={styles.identityText}>오늘의 바닷길을 확인해요</Text>
          </View>
        </View>
        <Pressable style={styles.bellButton}>
          <Bell color={colors.primary} size={21} />
          <View style={styles.badge} />
        </Pressable>
      </View>

      <InfoCard title="오늘 내 항로" eyebrow={homeRoute.source === 'favorite' ? '즐겨찾기 기준' : homeRoute.source === 'recent' ? '최근 조회 기준' : '추천 항로'}>
        <View style={styles.routeDashboard}>
          <View style={styles.routeHeader}>
            <View style={styles.routeIcon}>
              <Ship color={colors.primary} size={22} />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeTitle}>{homeRoute.name ?? `${homeRoute.departure} → ${homeRoute.arrival}`}</Text>
              <Text style={styles.routeMeta}>
                {homeRoute.departure} → {homeRoute.arrival}
              </Text>
            </View>
            <StatusPill label={nextCandidate ? statusLabel(nextCandidate.status) : '확인 필요'} tone={nextCandidate ? statusTone(nextCandidate.status) : 'neutral'} />
          </View>
          <View style={styles.routeStats}>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>다음 배</Text>
              <Text style={styles.routeStatValue}>{routeCandidatesQuery.isFetching ? '조회 중' : nextCandidate?.departureTime ?? '확인 필요'}</Text>
            </View>
            <View style={styles.routeStat}>
              <Text style={styles.routeStatLabel}>예보</Text>
              <Text style={styles.routeStatValue}>{routeForecastQuery.isFetching ? '조회 중' : forecastRiskLabel(routeForecastQuery.data?.riskLevel)}</Text>
            </View>
          </View>
          <View style={styles.routeActionRow}>
            <Link href="/schedule" asChild>
              <Pressable style={styles.routeActionButton}>
                <CalendarDays color={colors.primary} size={16} />
                <Text style={styles.routeActionText}>시간표 보기</Text>
              </Pressable>
            </Link>
            <Link href={forecastHref} asChild>
              <Pressable style={styles.routeActionButton}>
                <Waves color={colors.primary} size={16} />
                <Text style={styles.routeActionText}>예보 보기</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </InfoCard>

      <InfoCard title="관심 알림" eyebrow="개인화">
        <View style={styles.interestAlertList}>
          {interestAlerts.slice(0, 3).map((alert) => (
            <View key={alert.id} style={styles.interestAlertItem}>
              <View style={[styles.interestAlertDot, { backgroundColor: interestToneColor(alert.tone) }]} />
              <View style={styles.interestAlertCopy}>
                <Text style={styles.interestAlertTitle}>{alert.title}</Text>
                <Text style={styles.secondary}>{alert.description}</Text>
              </View>
            </View>
          ))}
        </View>
        <Link href="/profile" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>알림 센터에서 관리하기</Text>
            <ChevronRight color={colors.primary} size={18} />
          </Pressable>
        </Link>
      </InfoCard>

      <Link href={detailHref} asChild>
        <Pressable style={styles.hero}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.heroPhoto} resizeMode="cover" />
          ) : (
            <Image source={require('../../assets/mascot/boogi_bg2.png')} style={styles.heroFallbackPhoto} resizeMode="cover" />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>{homeIsland.contextLabel}</Text>
            <Text style={styles.heroTitle}>{homeIsland.routeLabel}</Text>
            <View style={styles.heroStatus}>
              <StatusPill label={homeIsland.statusLabel} tone="good" />
              <Text style={styles.heroMeta}>{homeIsland.statusTime}</Text>
            </View>
            <Text style={styles.heroCaption}>사진, 배편, 관광지, 안전정보를 섬상세에서 이어서 확인하세요.</Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>여행정보 상세 보기</Text>
              <ChevronRight color="#ffffff" size={16} />
            </View>
          </View>
        </Pressable>
      </Link>

      <View style={styles.summaryStrip}>
        <HomeSummaryPill icon={Images} label="사진" value={travelInfoQuery.isFetching ? '조회 중' : `${galleryItems.length}장`} color={colors.primary} />
        <HomeSummaryPill
          icon={MapPin}
          label="관광지"
          value={travelInfoQuery.isFetching ? '조회 중' : `${travelInfoQuery.data?.attractions.length ?? 0}곳`}
          color={colors.mint}
        />
        <HomeSummaryPill icon={Clock3} label="다음 행동" value="섬상세" color={colors.coral} />
      </View>


      <InfoCard title={`${homeIsland.islandName} 관련사진`} eyebrow={homeIsland.source === 'recent' ? '최근 섬 기준' : '추천 섬 기준'}>
        <View style={styles.photoHeader}>
          <View style={styles.photoHeaderCopy}>
            <Text style={styles.photoHeaderTitle}>최근 보거나 검색한 섬의 사진을 먼저 보여줘요</Text>
            <Text style={styles.secondary}>처음 방문한 경우에는 섬똑이 추천하는 섬 사진과 관광지 이미지를 보여줍니다.</Text>
          </View>
          <Images color={colors.primary} size={22} />
        </View>
        {travelInfoQuery.isFetching ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.secondary}>관련사진을 불러오는 중입니다.</Text>
          </View>
        ) : null}
        {travelInfoQuery.isError ? <Text style={styles.errorText}>관련사진 API를 불러오지 못했습니다.</Text> : null}
        {!travelInfoQuery.isFetching && !travelInfoQuery.isError && galleryItems.length === 0 ? (
          <Text style={styles.secondary}>관련사진이 아직 없습니다. 섬여행 메뉴에서 다른 섬을 검색해 보세요.</Text>
        ) : null}
        {galleryItems.length > 0 ? (
          <View style={styles.photoGrid}>
            {galleryItems.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image source={{ uri: photo.imageUrl }} style={styles.photoImage} resizeMode="cover" />
                <View style={styles.photoCopy}>
                  <Text style={styles.photoTitle} numberOfLines={2}>
                    {photo.title}
                  </Text>
                  <Text style={styles.photoMeta} numberOfLines={2}>
                    {photo.meta}
                  </Text>
                  <Text style={styles.photoSource} numberOfLines={1}>
                    {photo.source}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        <Link href={detailHref} asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkButtonText}>섬상세에서 더 보기</Text>
            <ChevronRight color={colors.primary} size={18} />
          </Pressable>
        </Link>
      </InfoCard>

      <InfoCard title="실시간 체크포인트" eyebrow="운항 상태">
        <View style={styles.checkRow}>
          <View style={styles.checkIcon}>
            <Ship color={colors.primary} size={20} />
          </View>
          <View style={styles.checkCopy}>
            <Text style={styles.checkTitle}>출항 전 확인 권장</Text>
            <Text style={styles.secondary}>기상 변화가 있으면 항로별 운항 공지를 함께 확인하세요.</Text>
          </View>
          <ChevronRight color={colors.muted} size={20} />
        </View>
      </InfoCard>

      <InfoCard title="내일 운항 예보">
        <View style={styles.row}>
          <StatusPill label="주의" tone="warning" />
          <Text style={styles.riskText}>위험도 보통</Text>
        </View>
        <Text style={styles.secondary}>풍랑 가능성이 있습니다. 출발 전 운항 공지를 다시 확인하세요.</Text>
      </InfoCard>

      <InfoCard title="지금 확인할 것" eyebrow="개인 체크">
        <View style={styles.checkList}>
          {checkItems.map((item) => (
            <View key={item.id} style={styles.checkItem}>
              <View style={[styles.checkDot, { backgroundColor: checkToneColor(item.tone) }]} />
              <View style={styles.checkCopy}>
                <Text style={styles.checkTitle}>{item.title}</Text>
                <Text style={styles.secondary}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </InfoCard>
    </Screen>
  );
}

function HomeSummaryPill({ icon: Icon, label, value, color }: HomeSummaryPillProps) {
  return (
    <View style={styles.summaryPill}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}16` }]}>
        <Icon color={color} size={18} />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function pickNextCandidate(candidates: ScheduleCandidate[]) {
  return [...candidates].sort((a, b) => (a.departureTime || '99:99').localeCompare(b.departureTime || '99:99'))[0] ?? null;
}

function buildHomeCheckItems({
  route,
  candidate,
  forecastRisk,
  hasForecastError
}: {
  route: HomeRouteTarget;
  candidate: ScheduleCandidate | null;
  forecastRisk?: string;
  hasForecastError: boolean;
}): HomeCheckItem[] {
  const items: HomeCheckItem[] = [];

  items.push({
    id: 'route',
    title: candidate ? `${route.arrival}행 ${candidate.departureTime || '출항시간 확인'} 배편` : `${route.arrival}행 배편 확인 필요`,
    description: candidate ? `${candidate.vesselName} · ${statusLabel(candidate.status)}` : '즐겨찾기 또는 최근 조회 항로 기준으로 오늘 운항 후보를 확인해 주세요.',
    tone: candidate ? statusTone(candidate.status) : 'neutral'
  });

  items.push({
    id: 'forecast',
    title: hasForecastError ? '예보 API 재확인 필요' : `예보 상태 ${forecastRiskLabel(forecastRisk)}`,
    description:
      forecastRisk === 'HIGH'
        ? '출항 전 선사 공지와 기상특보를 꼭 확인하세요.'
        : forecastRisk === 'MEDIUM'
          ? '파고와 바람 변화가 있을 수 있어 출항 전후 예보를 확인하세요.'
          : hasForecastError
            ? '예보 호출이 실패했습니다. 잠시 후 다시 조회하거나 예보 화면에서 권역을 바꿔 보세요.'
            : '현재 기준 위험 신호가 낮습니다. 그래도 출항 직전 공지는 한 번 더 확인하세요.',
    tone: hasForecastError ? 'warning' : forecastRisk === 'HIGH' ? 'danger' : forecastRisk === 'MEDIUM' ? 'warning' : 'good'
  });

  items.push({
    id: 'return',
    title: '복귀 배편 먼저 확인',
    description: '섬여행은 마지막 배 시간이 중요합니다. 당일치기라면 복귀편을 먼저 고정해 주세요.',
    tone: 'neutral'
  });

  return items;
}

function statusLabel(status: ScheduleCandidate['status']) {
  const labels: Record<ScheduleCandidate['status'], string> = {
    NORMAL: '정상 운항',
    SCHEDULED: '운항 예정',
    DELAYED: '지연',
    CANCELED: '결항',
    CONTROLLED: '통제',
    COMPLETED: '운항 완료',
    UNKNOWN: '확인 필요'
  };
  return labels[status];
}

function statusTone(status: ScheduleCandidate['status']): HomeCheckItem['tone'] {
  if (status === 'NORMAL') return 'good';
  if (status === 'DELAYED' || status === 'UNKNOWN' || status === 'SCHEDULED') return 'warning';
  if (status === 'CANCELED' || status === 'CONTROLLED') return 'danger';
  return 'neutral';
}

function forecastRiskLabel(risk?: string) {
  if (risk === 'HIGH') return '위험 높음';
  if (risk === 'MEDIUM') return '주의';
  if (risk === 'LOW') return '양호';
  return '확인 필요';
}

function checkToneColor(tone: HomeCheckItem['tone']) {
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'good') return colors.mint;
  return colors.primary;
}

function interestToneColor(tone: InterestAlert['tone']) {
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'good') return colors.mint;
  return colors.primary;
}

function createIslandTripDetailHref(target: HomeIslandTarget): Href {
  return {
    pathname: '/island-trip',
    params: {
      section: 'detail',
      islandName: target.islandName,
      provinceName: target.provinceName ?? '',
      cityName: target.cityName ?? '',
      tab: 'basic'
    }
  } as Href;
}

function readHomeRecentIsland(): HomeIslandTarget | null {
  const memoryStore = globalThis as typeof globalThis & { __badagilIslandTripRecents?: HomeRecentIslandRaw[] };
  const memoryRecent = normalizeRecentIsland(memoryStore.__badagilIslandTripRecents);
  if (memoryRecent) return memoryRecent;

  if (typeof globalThis.localStorage === 'undefined') return null;

  try {
    const value = globalThis.localStorage.getItem(HOME_RECENTS_KEY);
    const parsed = value ? JSON.parse(value) : null;
    return normalizeRecentIsland(parsed);
  } catch {
    return null;
  }
}

function contextIslandToHomeTarget(island: ReturnType<typeof useAppSelectionContext>['island']): HomeIslandTarget | null {
  if (!island?.islandName) return null;

  return {
    islandName: island.islandName,
    provinceName: island.provinceName ?? null,
    cityName: island.cityName ?? null,
    routeLabel: `${island.islandName} 여행정보`,
    contextLabel: '방금 선택한 섬',
    statusLabel: '연계 정보',
    statusTime: '선택 맥락 기준',
    source: 'context'
  };
}

function contextRouteToHomeTarget(route: ReturnType<typeof useAppSelectionContext>['route']): HomeRouteTarget | null {
  if (!route?.departure || !route.arrival) return null;

  return {
    departure: route.departure,
    arrival: route.arrival,
    name: route.name ?? `${route.departure} → ${route.arrival}`,
    source: 'context'
  };
}

function readHomeRoute(): HomeRouteTarget | null {
  const favorite = readHomeRoutePreset(HOME_ROUTE_FAVORITES_KEY, 'favorite');
  if (favorite) return favorite;

  return readHomeRoutePreset(HOME_ROUTE_RECENTS_KEY, 'recent');
}

function readHomeRoutePreset(key: string, source: HomeRouteTarget['source']): HomeRouteTarget | null {
  const memoryStore = globalThis as typeof globalThis & {
    __badagilScheduleRoutePresets?: Record<string, HomeRouteRaw[]>;
  };
  const memoryRoute = normalizeHomeRoutePreset(memoryStore.__badagilScheduleRoutePresets?.[key], source);
  if (memoryRoute) return memoryRoute;

  if (typeof globalThis.localStorage === 'undefined') return null;

  try {
    const value = globalThis.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : null;
    return normalizeHomeRoutePreset(parsed, source);
  } catch {
    return null;
  }
}

function normalizeHomeRoutePreset(value: unknown, source: HomeRouteTarget['source']): HomeRouteTarget | null {
  if (!Array.isArray(value)) return null;

  const item = value.find((candidate): candidate is HomeRouteRaw & { departure: string; arrival: string } =>
    Boolean(candidate && typeof candidate === 'object' && typeof candidate.departure === 'string' && typeof candidate.arrival === 'string')
  );
  if (!item) return null;
  const departure = item.departure.trim();
  const arrival = item.arrival.trim();
  if (!departure || !arrival) return null;

  return {
    departure,
    arrival,
    name: item.name,
    searchDate: item.searchDate,
    source
  };
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeRecentIsland(value: unknown): HomeIslandTarget | null {
  if (!Array.isArray(value)) return null;

  const item = value.find((candidate): candidate is HomeRecentIslandRaw =>
    Boolean(candidate && typeof candidate === 'object' && candidate.kind !== 'keyword' && typeof candidate.islandName === 'string')
  );

  if (!item?.islandName) return null;

  return {
    islandName: item.islandName,
    provinceName: item.provinceName ?? null,
    cityName: item.cityName ?? null,
    routeLabel: `${item.islandName} 여행정보`,
    contextLabel: '최근 본 섬',
    statusLabel: '상세 확인',
    statusTime: '최근 기록 기준',
    source: 'recent'
  };
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  avatar: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 48,
    width: 48
  },
  greeting: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700'
  },
  identityText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40
  },
  badge: {
    backgroundColor: colors.coral,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 10
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    shadowColor: '#12324f',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 16
  },
  searchText: {
    color: colors.muted,
    flex: 1,
    fontSize: 15,
    fontWeight: '700'
  },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    minHeight: 220,
    overflow: 'hidden',
    position: 'relative'
  },
  heroPhoto: {
    bottom: 0,
    height: undefined,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    width: undefined
  },
  heroFallbackPhoto: {
    bottom: 0,
    height: undefined,
    left: 0,
    opacity: 0.42,
    position: 'absolute',
    right: 0,
    top: 0,
    width: undefined
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 33, 58, 0.58)'
  },
  heroContent: {
    gap: 9,
    justifyContent: 'center',
    minHeight: 220,
    padding: 18,
    position: 'relative',
    zIndex: 1
  },
  heroEyebrow: {
    color: '#9be7ff',
    fontSize: 13,
    fontWeight: '900'
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34
  },
  heroStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  heroMeta: {
    color: '#d6ecff',
    fontSize: 13,
    fontWeight: '800'
  },
  heroCaption: {
    color: '#d6ecff',
    fontSize: 14,
    lineHeight: 20
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 12
  },
  heroButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900'
  },
  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  summaryPill: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    minHeight: 58,
    minWidth: 104,
    padding: 10
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  routeDashboard: {
    gap: 12
  },
  routeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  routeIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  routeCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  routeTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  routeMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  routeStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  routeStat: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 132,
    padding: 11
  },
  routeStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  routeStatValue: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  routeActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  routeActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 132
  },
  routeActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  checkList: {
    gap: 10
  },
  checkItem: {
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11
  },
  checkDot: {
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 118,
    padding: 14,
    width: '47.8%'
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  actionCopy: {
    gap: 3
  },
  actionLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  actionHelper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  photoHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10
  },
  photoHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  photoHeaderTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9
  },
  photoCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 130,
    overflow: 'hidden',
    width: '48%'
  },
  photoImage: {
    aspectRatio: 1.28,
    width: '100%'
  },
  photoCopy: {
    gap: 4,
    padding: 9
  },
  photoTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18
  },
  photoMeta: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16
  },
  photoSource: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900'
  },
  linkButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  checkIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  checkCopy: {
    flex: 1,
    gap: 3
  },
  checkTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  interestAlertList: {
    gap: 10
  },
  interestAlertItem: {
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11
  },
  interestAlertDot: {
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12
  },
  interestAlertCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  interestAlertTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20
  },
  riskText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  secondary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19
  }
});
