import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  Anchor,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  Compass,
  Heart,
  MapPin,
  Sailboat,
  ShieldCheck,
  Star,
  Tent,
  Users,
  Waves,
  X
} from 'lucide-react-native';
import { Link } from 'expo-router';
import type { IslandSummary, SailingStatus } from '@badagil/shared';
import { fetchIslandsResponse } from '@/api/islands';
import { fetchIslandTravelInfo } from '@/api/island-trips';
import { fetchRouteOptions, type RouteOption } from '@/api/routes';
import { fetchScheduleCandidates, type ScheduleCandidate } from '@/api/schedules';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';

type TripType = 'day' | 'overnight' | 'camping' | 'carcamping' | 'family' | 'leisure' | 'quiet';
type TripSectionKey = 'available' | 'types' | 'detail' | 'course' | 'saved';
type TravelDetailTab = 'basic' | 'ferry' | 'attractions' | 'camping' | 'lodging' | 'food' | 'facilities' | 'safety';

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

const defaultDeparturePorts = ['인천', '목포', '통영', '여수', '포항', '완도'];

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

const savedTrips = [
  { id: 'saved-deokjeok', title: '인천 출발 덕적도 당일 코스', meta: '첫 배 기준 · 해수욕장 산책' },
  { id: 'saved-ulleung', title: '포항 출발 울릉도 1박 2일', meta: '날씨 확인 필요 · 복귀 배편 우선' }
];

const tripSectionMenu: { key: TripSectionKey; label: string; description: string }[] = [
  { key: 'available', label: '지금 갈 수 있는 섬', description: '오늘 배편' },
  { key: 'types', label: '여행 유형 선택', description: '목적별 추천' },
  { key: 'detail', label: '섬 상세', description: '배편·관광·안전' },
  { key: 'course', label: '추천 코스', description: '시간표 기반' },
  { key: 'saved', label: '저장한 여행', description: '다시 보기' }
];

const travelDetailTabs: { key: TravelDetailTab; label: string }[] = [
  { key: 'basic', label: '기본정보' },
  { key: 'ferry', label: '배편' },
  { key: 'attractions', label: '관광지' },
  { key: 'camping', label: '캠핑·차박' },
  { key: 'lodging', label: '숙박' },
  { key: 'food', label: '식당' },
  { key: 'facilities', label: '편의시설' },
  { key: 'safety', label: '안전정보' }
];

export default function IslandTripScreen() {
  const today = useMemo(() => formatDate(new Date()), []);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [activeSection, setActiveSection] = useState<TripSectionKey>('available');
  const [sectionPositions, setSectionPositions] = useState<Partial<Record<TripSectionKey, number>>>({});
  const [departurePort, setDeparturePort] = useState(defaultDeparturePorts[0]);
  const [selectedType, setSelectedType] = useState<TripType>('day');
  const [selectedTrip, setSelectedTrip] = useState<TripRecommendation | null>(null);
  const [focusedTripId, setFocusedTripId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<TravelDetailTab>('attractions');
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);

  const schedulesQuery = useQuery({
    queryKey: ['island-trip-candidates', today, departurePort],
    queryFn: () => fetchScheduleCandidates({ date: today, departure: departurePort }),
    staleTime: 3 * 60 * 1000
  });
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

  const recommendations = useMemo(
    () =>
      buildTripRecommendations({
        candidates: schedulesQuery.data ?? [],
        islands: islandsQuery.data?.data ?? [],
        routeOptions: routeOptionsQuery.data ?? [],
        departurePort
      }),
    [departurePort, islandsQuery.data?.data, routeOptionsQuery.data, schedulesQuery.data]
  );

  const filteredRecommendations = useMemo(
    () => recommendations.filter((trip) => trip.tripTypes.includes(selectedType)),
    [recommendations, selectedType]
  );
  const visibleRecommendations = filteredRecommendations.length > 0 ? filteredRecommendations : recommendations;
  const primaryTrip = visibleRecommendations.find((trip) => trip.id === focusedTripId) ?? visibleRecommendations[0] ?? null;
  const isPrimaryTripSaved = Boolean(primaryTrip && savedTripIds.includes(primaryTrip.id));
  const travelInfoQuery = useQuery({
    queryKey: ['island-trip-travel-info', primaryTrip?.islandName, primaryTrip?.island?.provinceName, primaryTrip?.island?.cityName],
    queryFn: () =>
      fetchIslandTravelInfo({
        islandName: primaryTrip?.islandName ?? '덕적도',
        provinceName: primaryTrip?.island?.provinceName,
        cityName: primaryTrip?.island?.cityName,
        latitude: primaryTrip?.island?.latitude,
        longitude: primaryTrip?.island?.longitude
      }),
    enabled: Boolean(primaryTrip),
    staleTime: 30 * 60 * 1000
  });
  const travelInfo = travelInfoQuery.data;

  const registerSection = (key: TripSectionKey) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setSectionPositions((positions) => (positions[key] === y ? positions : { ...positions, [key]: y }));
  };

  const moveToSection = (key: TripSectionKey) => {
    setActiveSection(key);
    const y = sectionPositions[key] ?? 0;
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
  };

  const focusTrip = (trip: TripRecommendation) => {
    setFocusedTripId(trip.id);
    setActiveDetailTab('attractions');
    moveToSection('detail');
  };

  const toggleSavedTrip = () => {
    if (!primaryTrip) return;

    setSavedTripIds((ids) =>
      ids.includes(primaryTrip.id) ? ids.filter((id) => id !== primaryTrip.id) : [primaryTrip.id, ...ids]
    );
  };

  return (
    <Screen
      title="섬여행"
      subtitle="오늘 운항하는 배편을 기준으로 지금 갈 수 있는 섬과 여행 코스를 추천합니다."
      mascotSource={require('../../assets/mascot/boogi_bg6.png')}
      scrollRef={scrollViewRef}
    >
      <MascotBanner
        eyebrow="ISLAND TRIP"
        title="배편 기준으로 오늘 갈 섬을 고릅니다"
        description="가까운 출발항과 운항 후보를 먼저 확인하고, 여행 유형에 맞는 섬·코스·안전 체크를 함께 보여드립니다."
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        tone="mint"
      />

      <View style={styles.subMenuPanel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>섬여행 메뉴</Text>
            <Text style={styles.subMenuTitle}>원하는 정보를 바로 확인하세요</Text>
          </View>
          <Compass color={colors.primary} size={22} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subMenuStrip}>
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
        </ScrollView>
      </View>

      <View style={styles.section} onLayout={registerSection('available')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>지금 갈 수 있는 섬</Text>
            <Text style={styles.sectionTitle}>오늘 {departurePort}항에서 출발 가능</Text>
          </View>
          <Text style={styles.todayBadge}>{today}</Text>
        </View>
        <Text style={styles.sectionDescription}>첫 배와 마지막 배, 운항상태를 기준으로 당일 이동 가능성을 먼저 판단합니다.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {defaultDeparturePorts.map((port) => {
            const selected = departurePort === port;

            return (
              <Pressable
                key={port}
                accessibilityRole="button"
                onPress={() => setDeparturePort(port)}
                style={[styles.portChip, selected && styles.portChipSelected]}
              >
                <Anchor color={selected ? colors.surface : colors.primary} size={15} />
                <Text style={[styles.portChipText, selected && styles.portChipTextSelected]}>{port}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendationStrip}>
        {visibleRecommendations.map((trip) => {
          const focused = primaryTrip?.id === trip.id;

          return (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            onPress={() => focusTrip(trip)}
            style={[styles.tripCard, focused && styles.tripCardFocused]}
          >
            <View style={styles.tripCardHeader}>
              <View style={styles.tripIconBox}>
                <Image source={require('../../assets/mascot/boogi_bg6.png')} style={styles.tripIcon} resizeMode="contain" />
              </View>
              <StatusPill label={statusLabel[trip.status]} tone={statusTone[trip.status]} />
            </View>
            <Text style={styles.tripName}>{trip.islandName}</Text>
            <Text style={styles.tripRoute} numberOfLines={1}>
              {trip.departurePortName} 출발 · {trip.routeName}
            </Text>
            <View style={styles.tripMetaGrid}>
              <MiniStat label="첫 배" value={trip.firstDeparture ?? '확인'} />
              <MiniStat label="막배" value={trip.lastDeparture ?? '확인'} />
              <MiniStat label="소요" value={trip.durationLabel} />
            </View>
            <View style={styles.tripTags}>
              {trip.tripTypes.slice(0, 3).map((type) => (
                <Text key={type} style={styles.tripTag}>
                  {tripTypeText[type]}
                </Text>
              ))}
            </View>
            <Text style={styles.tripReason}>{getRecommendationReason(trip)}</Text>
          </Pressable>
          );
        })}
      </ScrollView>

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
                onPress={() => setSelectedType(type.id)}
                style={[styles.typeButton, selected && styles.typeButtonSelected]}
              >
                <Icon color={selected ? colors.surface : colors.primary} size={18} />
                <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{type.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.detailPanel} onLayout={registerSection('detail')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>섬 상세</Text>
            <Text style={styles.sectionTitle}>{primaryTrip?.islandName ?? '추천 섬을 준비 중입니다'}</Text>
          </View>
          <MapPin color={colors.primary} size={22} />
        </View>
        <Text style={styles.detailDescription}>
          {primaryTrip
            ? `${primaryTrip.departurePortName}에서 출발하는 배편을 기준으로 관광지, 캠핑·차박, 숙박, 식당, 편의시설, 안전정보를 함께 확인합니다.`
            : '오늘 운항 후보를 불러오면 섬별 상세 여행 정보를 연결합니다.'}
        </Text>
        <View style={styles.detailTabs}>
          {travelDetailTabs.map((tab) => {
            const selected = activeDetailTab === tab.key;

            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                onPress={() => setActiveDetailTab(tab.key)}
                style={[styles.detailTab, selected && styles.detailTabSelected]}
              >
                <Text style={[styles.detailTabText, selected && styles.detailTabTextSelected]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.travelSourceRow}>
          <Text style={styles.travelSourceText}>{travelInfoQuery.isFetching ? '여행 API를 불러오는 중' : travelInfo?.sourceSummary.tourism ?? '관광정보 연결 준비'}</Text>
          <Text style={styles.travelSourceText}>{travelInfo?.sourceSummary.lodging ?? '숙박정보 연결 준비'}</Text>
          <Text style={styles.travelSourceText}>{travelInfo?.sourceSummary.food ?? '식당정보 연결 준비'}</Text>
          <Text style={styles.travelSourceText}>{travelInfo?.sourceSummary.safety ?? '안전정보 연결 준비'}</Text>
        </View>
        <View style={styles.travelInfoGrid}>
          <TravelDetailContent tab={activeDetailTab} trip={primaryTrip} travelInfo={travelInfo} />
        </View>
        <View style={styles.nextActionPanel}>
          <Pressable accessibilityRole="button" onPress={toggleSavedTrip} style={styles.secondaryActionButton}>
            <Bookmark color={isPrimaryTripSaved ? colors.warning : colors.primary} size={17} />
            <Text style={styles.secondaryActionText}>{isPrimaryTripSaved ? '저장 해제' : '여행 저장'}</Text>
          </Pressable>
          <Link href="/schedule" asChild>
            <Pressable accessibilityRole="button" style={styles.primaryActionButton}>
              <CalendarDays color={colors.surface} size={17} />
              <Text style={styles.primaryActionText}>시간표 보기</Text>
            </Pressable>
          </Link>
        </View>
        <View style={styles.campingNotice}>
          <Tent color={colors.warning} size={18} />
          <Text style={styles.campingNoticeText}>차박 가능성이 있는 장소는 현장 안내문과 지자체 공지를 반드시 확인하세요.</Text>
        </View>
      </View>

      <View style={styles.coursePanel} onLayout={registerSection('course')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>추천 코스</Text>
            <Text style={styles.sectionTitle}>배 시간표 기반 코스</Text>
          </View>
          <Sailboat color={colors.primary} size={22} />
        </View>
        <CourseStep time={primaryTrip?.firstDeparture ?? '09:00'} title={`${primaryTrip?.departurePortName ?? departurePort}항 출발`} />
        <CourseStep time="도착 후" title={`${primaryTrip?.islandName ?? '추천 섬'} 산책과 점심`} />
        <CourseStep time="오후" title="해수욕장·전망 포인트·편의시설 확인" />
        <CourseStep time={primaryTrip?.lastDeparture ?? '16:30'} title="복귀 배편 탑승" />
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

      <View style={styles.section} onLayout={registerSection('saved')}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>저장한 여행</Text>
            <Text style={styles.sectionTitle}>다시 보고 싶은 코스</Text>
          </View>
          <Star color={colors.warning} size={22} />
        </View>
        <View style={styles.savedList}>
          {[...savedTripIds.map((id) => visibleRecommendations.find((trip) => trip.id === id)).filter((trip): trip is TripRecommendation => Boolean(trip)), ...savedTrips].map((trip) => (
            <View key={trip.id} style={styles.savedItem}>
              <BadgeCheck color={colors.primary} size={18} />
              <View style={styles.savedCopy}>
                <Text style={styles.savedTitle}>{'islandName' in trip ? `${trip.departurePortName} 출발 ${trip.islandName}` : trip.title}</Text>
                <Text style={styles.savedMeta}>
                  {'islandName' in trip ? `${trip.firstDeparture ?? '첫 배 확인'} · ${trip.durationLabel}` : trip.meta}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <TripDetailModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
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
  emptyText
}: {
  title: string;
  items: { id: string; title: string; description: string }[];
  emptyText: string;
}) {
  return (
    <View style={styles.travelInfoBlock}>
      <Text style={styles.travelInfoBlockTitle}>{title}</Text>
      {items.length > 0 ? (
        items.map((item) => (
          <View key={item.id} style={styles.travelInfoItem}>
            <Text style={styles.travelInfoItemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.travelInfoItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.travelInfoEmpty}>{emptyText}</Text>
      )}
    </View>
  );
}

function TravelDetailContent({
  tab,
  trip,
  travelInfo
}: {
  tab: TravelDetailTab;
  trip: TripRecommendation | null;
  travelInfo: Awaited<ReturnType<typeof fetchIslandTravelInfo>> | undefined;
}) {
  if (tab === 'basic') {
    return (
      <TravelInfoBlock
        title="기본정보"
        emptyText="섬 기본정보를 준비 중입니다."
        items={[
          {
            id: 'basic-route',
            title: trip ? `${trip.departurePortName} 출발 ${trip.islandName}` : '추천 섬 선택 필요',
            description: trip ? `${trip.routeName} · ${trip.durationLabel}` : '추천 카드를 선택하면 기본정보가 표시됩니다.'
          },
          {
            id: 'basic-type',
            title: '추천 여행 유형',
            description: trip ? trip.tripTypes.map((type) => tripTypeText[type]).join(', ') : '배편 기준 추천'
          }
        ]}
      />
    );
  }

  if (tab === 'ferry') {
    return (
      <TravelInfoBlock
        title="배편"
        emptyText="배편 정보를 준비 중입니다."
        items={[
          {
            id: 'ferry-first',
            title: `첫 배 ${trip?.firstDeparture ?? '확인 필요'}`,
            description: `${trip?.departurePortName ?? '출발항'}에서 출발하는 오늘 운항 후보 기준입니다.`
          },
          {
            id: 'ferry-last',
            title: `복귀 기준 ${trip?.lastDeparture ?? '확인 필요'}`,
            description: '당일치기는 마지막 복귀 배편을 먼저 확인하는 흐름으로 안내합니다.'
          }
        ]}
      />
    );
  }

  if (tab === 'camping' || tab === 'facilities') {
    return (
      <TravelInfoBlock
        title={tab === 'camping' ? '캠핑·차박' : '편의시설'}
        emptyText="고캠핑, 문화 캠핑, 일반야영장업 데이터를 확인 중입니다."
        items={(travelInfo?.camps ?? []).slice(0, 4).map((item) => ({
          id: item.id,
          title: item.name,
          description: `${campStatusLabel(item.status)} · ${item.facilitySummary ?? item.reservation ?? '현장 확인 필요'}`
        }))}
      />
    );
  }

  if (tab === 'lodging') {
    return (
      <TravelInfoBlock
        title="숙박"
        emptyText="행정안전부 문화 숙박업 데이터를 확인 중입니다."
        items={(travelInfo?.lodgings ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          title: item.name,
          description: [item.category, item.address, item.tel, item.status].filter(Boolean).join(' · ') || '숙박 정보 확인 필요'
        }))}
      />
    );
  }

  if (tab === 'food') {
    return (
      <TravelInfoBlock
        title="식당"
        emptyText="행정안전부 관광식당 데이터를 확인 중입니다."
        items={(travelInfo?.restaurants ?? []).slice(0, 5).map((item) => ({
          id: item.id,
          title: item.name,
          description:
            [item.representativeMenu, item.category, item.address, item.tel, item.status].filter(Boolean).join(' · ') ||
            '식당 정보 확인 필요'
        }))}
      />
    );
  }

  if (tab === 'safety') {
    return (
      <TravelInfoBlock
        title="안전정보"
        emptyText="국립해양조사원 바다여행지수를 연결하면 안전 체크가 표시됩니다."
        items={(travelInfo?.safetyIndexes ?? []).slice(0, 3).map((item) => ({
          id: item.id,
          title: item.title,
          description: `${item.score ?? '확인 필요'} · ${item.advisory}`
        }))}
      />
    );
  }

  return (
    <TravelInfoBlock
      title="관광지"
      emptyText="한국관광공사 관광정보를 연결하면 주변 관광지가 표시됩니다."
      items={(travelInfo?.attractions ?? []).slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.address ?? item.category ?? '관광지 정보'
      }))}
    />
  );
}

function TripDetailModal({ trip, onClose }: { trip: TripRecommendation | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" transparent visible={Boolean(trip)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.eyebrow}>섬 상세</Text>
              <Text style={styles.modalTitle}>{trip?.islandName}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>
          <Text style={styles.modalDescription}>{trip?.island?.description ?? '도서 기본정보와 여행 정보를 연결해 보여줄 예정입니다.'}</Text>
          <View style={styles.modalInfoGrid}>
            <MiniStat label="출발항" value={trip?.departurePortName ?? '확인'} />
            <MiniStat label="첫 배" value={trip?.firstDeparture ?? '확인'} />
            <MiniStat label="마지막 배" value={trip?.lastDeparture ?? '확인'} />
            <MiniStat label="소요시간" value={trip?.durationLabel ?? '확인'} />
          </View>
          <View style={styles.campingNotice}>
            <ShieldCheck color={colors.warning} size={18} />
            <Text style={styles.campingNoticeText}>오늘은 운항상태, 복귀 배편, 기상특보를 함께 확인한 뒤 여행을 확정하세요.</Text>
          </View>
        </View>
      </View>
    </Modal>
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

  return fromCandidates.length > 0 ? fromCandidates.slice(0, 8) : fallbackTrips(departurePort, islands);
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

function fallbackTrips(departurePort: string, islands: IslandSummary[]): TripRecommendation[] {
  return ['덕적도', '자월도', '백령도', '울릉도'].map((islandName, index) => ({
    id: `fallback-${islandName}`,
    island: findIsland(islandName, islands),
    islandName,
    departurePortName: departurePort,
    routeName: `${departurePort}-${islandName}`,
    firstDeparture: index === 2 ? '07:50' : '09:00',
    lastDeparture: index === 2 ? '13:00' : '16:30',
    durationLabel: inferDurationLabel(islandName),
    status: index === 2 ? 'UNKNOWN' : 'NORMAL',
    tripTypes: inferTripTypes(islandName, [{ status: 'NORMAL' } as ScheduleCandidate, { status: 'NORMAL' } as ScheduleCandidate])
  }));
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

const styles = StyleSheet.create({
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
    gap: 8,
    paddingRight: 8
  },
  subMenuItem: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 12,
    width: 132
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
    fontWeight: '900'
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
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  travelInfoGrid: {
    gap: 10
  },
  nextActionPanel: {
    flexDirection: 'row',
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
    minHeight: 44
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  travelInfoBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
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
    gap: 3,
    padding: 9
  },
  travelInfoItemTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  travelInfoItemDescription: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  travelInfoEmpty: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
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
  }
});
