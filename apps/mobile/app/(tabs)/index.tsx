import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Link, type Href } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, Clock3, Images, MapPin, Search, Ship, Star } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { fetchIslandTravelInfo } from '@/api/island-trips';
import { colors } from '@/theme/colors';

const HOME_RECENTS_KEY = 'badagil:island-trip:recents';

type HomeIslandTarget = {
  islandName: string;
  provinceName: string | null;
  cityName: string | null;
  routeLabel: string;
  contextLabel: string;
  statusLabel: string;
  statusTime: string;
  source: 'recent' | 'recommended';
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

export default function HomeScreen() {
  const homeIsland = useMemo(() => readHomeRecentIsland() ?? recommendedIsland, []);
  const detailHref = useMemo(() => createIslandTripDetailHref(homeIsland), [homeIsland]);

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

  const galleryItems = useMemo<HomePhoto[]>(() => {
    const info = travelInfoQuery.data;
    if (!info) return [];

    const photoItems = info.photos
      .map((photo) => ({
        id: photo.id,
        title: photo.title,
        imageUrl: photo.imageUrl ?? photo.thumbnailUrl ?? '',
        meta: [photo.locationName, photo.photographer].filter(Boolean).join(' · ') || `${homeIsland.islandName} 관광사진`,
        source: '한국관광공사 관광사진'
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
  const actionItems = createActionItems();

  return (
    <Screen
      title="바다누리"
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

      <Link href="/schedule" asChild>
        <Pressable style={styles.searchBox}>
          <Search color={colors.primary} size={21} />
          <Text style={styles.searchText}>출발지와 도착지를 검색해 보세요</Text>
        </Pressable>
      </Link>

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

      <View style={styles.actionGrid}>
        {actionItems.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} asChild>
              <Pressable style={styles.actionTile}>
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
                  <Icon color={action.color} size={24} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                  <Text style={styles.actionHelper}>{action.helper}</Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <InfoCard title={`${homeIsland.islandName} 관련사진`} eyebrow={homeIsland.source === 'recent' ? '최근 섬 기준' : '추천 섬 기준'}>
        <View style={styles.photoHeader}>
          <View style={styles.photoHeaderCopy}>
            <Text style={styles.photoHeaderTitle}>최근 보거나 검색한 섬의 사진을 먼저 보여줘요</Text>
            <Text style={styles.secondary}>처음 방문한 경우에는 바다누리가 추천하는 섬 사진과 관광지 이미지를 보여줍니다.</Text>
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

function createActionItems() {
  return [
    { href: '/schedule' as Href, label: '항로 검색', helper: '출발·도착 선택', icon: Search, color: colors.primary },
    { href: '/schedule' as Href, label: '시간표', helper: '오늘 출항 보기', icon: CalendarDays, color: colors.mint },
    { href: '/forecast' as Href, label: '운항 예보', helper: '내일 위험 확인', icon: Ship, color: colors.amber },
    { href: '/island-trip' as Href, label: '섬여행', helper: '사진과 여행정보', icon: Star, color: colors.coral }
  ] as const;
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
