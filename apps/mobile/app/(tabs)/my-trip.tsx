import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Check, ChevronDown, ChevronUp, Heart, Info, MapPin, Route, Search, Star } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { IslandSummary, RecommendedIsland, TripRecommendationAsset, TripRecommendationCourse } from '@badagil/shared';
import { fetchRecommendedIslands, fetchTripRecommendations, searchTravelAssets } from '@/api/island-trips';
import { fetchIslandsResponse } from '@/api/islands';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

type TravelRegionOption = {
  id: string;
  name: string;
  count: number;
  kind: 'travel' | 'forecast' | 'admin';
};

type RegionKind = 'all' | TravelRegionOption['kind'];
type RecommendationSearchMode = 'conditions' | 'keyword' | null;

type TravelStyle = {
  id: string;
  label: string;
  description: string;
};

const REGION_KIND_OPTIONS: Array<{ id: RegionKind; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'travel', label: '여행권역' },
  { id: 'forecast', label: '예보권역' },
  { id: 'admin', label: '행정권역' }
];

const TRAVEL_STYLES: TravelStyle[] = [
  { id: 'dayTrip', label: '당일치기', description: '짧은 시간 안에 다녀올 수 있는 여행' },
  { id: 'family', label: '가족여행', description: '아이, 부모님과 함께 가기 좋은 여행' },
  { id: 'couple', label: '커플여행', description: '노을, 바다뷰, 감성 숙소 중심 여행' },
  { id: 'solo', label: '혼자여행', description: '조용한 섬, 산책, 사색 중심 여행' },
  { id: 'friends', label: '친구여행', description: '맛집, 사진, 액티비티 중심 여행' },
  { id: 'food', label: '미식여행', description: '해산물, 특산물, 수산시장 중심 여행' },
  { id: 'photo', label: '사진여행', description: '포토스팟, 등대, 노을 중심 여행' },
  { id: 'healing', label: '힐링여행', description: '조용한 바다, 산책길, 자연경관 중심 여행' },
  { id: 'trekking', label: '트레킹', description: '섬 둘레길, 해안길, 전망대 중심 여행' },
  { id: 'activity', label: '액티비티', description: '낚시, 해루질, 서핑, 스노클링 중심 여행' },
  { id: 'camping', label: '캠핑/차박', description: '오토캠핑, 차박, 백패킹 중심 여행' }
];

const DURATION_OPTIONS = ['반나절', '당일치기', '1박 2일', '2박 이상'];
const COMPANION_OPTIONS = ['혼자', '연인', '친구', '아이와 함께', '부모님과 함께', '반려동물과 함께'];
const TRANSPORT_OPTIONS = ['대중교통', '자가용', '차량 선적', '도보 중심'];
const DIFFICULTY_OPTIONS = ['쉬움', '보통', '어려움'];
const BUDGET_OPTIONS = ['저예산', '보통', '프리미엄'];
const STAY_TYPE_OPTIONS = ['숙박 안 함', '숙소 이용', '캠핑', '차박'];
const FACILITY_OPTIONS = ['화장실', '샤워장', '편의점', '식당', '주차장', '편의시설'];
const ACTIVITY_OPTIONS = ['물놀이', '낚시', '해루질', '트레킹', '사진', '맛집', '카페'];

export default function MyTripScreen() {
  const routeParams = useLocalSearchParams<{ islandName?: string | string[]; provinceName?: string | string[]; cityName?: string | string[] }>();
  const seedIslandName = getRouteParam(routeParams.islandName);
  const seedProvinceName = getRouteParam(routeParams.provinceName);
  const seedCityName = getRouteParam(routeParams.cityName);
  const [selectedRegionKind, setSelectedRegionKind] = useState<RegionKind>('travel');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isRegionPickerOpen, setIsRegionPickerOpen] = useState(false);
  const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
  const [isConditionPickerOpen, setIsConditionPickerOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState('dayTrip');
  const [duration, setDuration] = useState('당일치기');
  const [companions, setCompanions] = useState('친구');
  const [transport, setTransport] = useState('자가용');
  const [difficulty, setDifficulty] = useState('보통');
  const [budget, setBudget] = useState('보통');
  const [stayType, setStayType] = useState('숙박 안 함');
  const [facilities, setFacilities] = useState<string[]>(['식당', '주차장']);
  const [activities, setActivities] = useState<string[]>(['사진']);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [favoriteAssetIds, setFavoriteAssetIds] = useState<string[]>([]);
  const [favoriteCourseIds, setFavoriteCourseIds] = useState<string[]>([]);
  const [isFavoriteOpen, setIsFavoriteOpen] = useState(false);
  const [isTodayOpen, setIsTodayOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<RecommendationSearchMode>(null);
  const [tripSearchKeyword, setTripSearchKeyword] = useState('');
  const [hasAssetSearched, setHasAssetSearched] = useState(false);
  const [selectedSearchAssetId, setSelectedSearchAssetId] = useState<string | null>(null);

  const islandsQuery = useQuery({
    queryKey: ['islands', 'my-trip'],
    queryFn: () => fetchIslandsResponse(),
    staleTime: 24 * 60 * 60 * 1000
  });

  const islands = islandsQuery.data?.data ?? [];
  const seedIsland = useMemo(
    () =>
      seedIslandName
        ? islands.find(
            (island) =>
              island.islandName === seedIslandName &&
              (!seedProvinceName || island.provinceName === seedProvinceName) &&
              (!seedCityName || island.cityName === seedCityName)
          ) ?? null
        : null,
    [islands, seedCityName, seedIslandName, seedProvinceName]
  );
  const allRegionOptions = useMemo(() => buildTravelRegions(islands), [islands]);
  const regionKindCounts = useMemo(() => countRegionsByKind(allRegionOptions), [allRegionOptions]);
  const availableRegionKinds = useMemo(
    () =>
      REGION_KIND_OPTIONS.map((option) => option.id).filter(
        (kind): kind is TravelRegionOption['kind'] => kind !== 'all' && (regionKindCounts[kind] ?? 0) > 0
      ),
    [regionKindCounts]
  );
  const travelRegions = useMemo(
    () => (selectedRegionKind === 'all' ? [] : allRegionOptions.filter((region) => region.kind === selectedRegionKind)),
    [allRegionOptions, selectedRegionKind]
  );
  const selectedRegion = travelRegions.find((region) => region.id === selectedRegionId) ?? null;
  const apiTravelRegionId = selectedRegion?.kind === 'travel' ? selectedRegion.id : null;
  const apiRegionId = selectedRegionKind === 'all' ? null : selectedRegion ? normalizeRegionIdForApi(selectedRegion) : null;
  const apiRegionName = selectedRegionKind === 'all' ? null : selectedRegion?.name ?? null;
  const selectedStyle = TRAVEL_STYLES.find((style) => style.id === selectedStyleId) ?? TRAVEL_STYLES[0];
  const conditionSummary = [duration, companions, transport, difficulty, budget, stayType].filter(Boolean).join(' · ');
  const conditionExtraSummary = [...facilities, ...activities].slice(0, 5).join(' · ');
  const normalizedTripSearchKeyword = tripSearchKeyword.trim();

  const travelAssetSearchQuery = useQuery({
    queryKey: ['trip-asset-search', normalizedTripSearchKeyword],
    queryFn: () => searchTravelAssets(normalizedTripSearchKeyword, 24),
    enabled: searchMode === 'keyword' && hasAssetSearched && normalizedTripSearchKeyword.length >= 2,
    staleTime: 5 * 60 * 1000
  });

  const todayRecommendationQuery = useQuery({
    queryKey: ['trip-recommendations', 'today'],
    queryFn: () =>
      fetchTripRecommendations({
        regionKind: 'all',
        style: 'dayTrip',
        duration: '당일치기',
        transport: '대중교통',
        difficulty: '쉬움',
        stayType: '숙박 안 함',
        facilities: ['식당', '주차장'],
        activities: ['사진', '트레킹'],
        limit: 18
      }),
    staleTime: 10 * 60 * 1000
  });

  const recommendedIslandsQuery = useQuery({
    queryKey: ['recommended-islands', 'today'],
    queryFn: () => fetchRecommendedIslands(12),
    staleTime: 30 * 60 * 1000
  });

  useEffect(() => {
    if (selectedRegionId || !seedIsland) return;
    const seedRegion = getRegionOptionForIsland(seedIsland);
    if (!seedRegion) return;
    setSelectedRegionKind(seedRegion.kind);
    setSelectedRegionId(seedRegion.id);
  }, [seedIsland, selectedRegionId]);

  useEffect(() => {
    if (selectedRegionKind === 'all') return;
    if (travelRegions.length > 0 || availableRegionKinds.length === 0) return;
    setSelectedRegionKind(availableRegionKinds[0]);
  }, [availableRegionKinds, selectedRegionKind, travelRegions.length]);

  useEffect(() => {
    if (selectedRegionKind === 'all') {
      if (selectedRegionId) setSelectedRegionId(null);
      return;
    }
    if (travelRegions.length === 0) {
      if (selectedRegionId) setSelectedRegionId(null);
      return;
    }
    if (!selectedRegionId || !travelRegions.some((region) => region.id === selectedRegionId)) {
      setSelectedRegionId(travelRegions[0].id);
    }
  }, [selectedRegionId, selectedRegionKind, travelRegions]);

  const recommendationsQuery = useQuery({
    queryKey: [
      'trip-recommendations',
      searchMode,
      normalizedTripSearchKeyword,
      selectedSearchAssetId,
      selectedRegionKind,
      selectedRegion?.id,
      seedIsland?.id,
      selectedStyleId,
      duration,
      companions,
      transport,
      difficulty,
      budget,
      stayType,
      facilities,
      activities
    ],
    queryFn: () =>
      fetchTripRecommendations({
        regionKind: selectedRegionKind,
        regionId: searchMode === 'keyword' ? null : apiRegionId,
        regionName: searchMode === 'keyword' ? null : apiRegionName,
        keyword: searchMode === 'keyword' ? null : normalizedTripSearchKeyword || null,
        assetId: searchMode === 'keyword' ? selectedSearchAssetId : null,
        travelRegionId: searchMode === 'keyword' ? null : apiTravelRegionId,
        islandId: searchMode === 'keyword' ? undefined : seedIsland?.id,
        style: selectedStyleId,
        duration,
        companions,
        transport,
        difficulty,
        budget,
        stayType,
        facilities,
        activities,
        limit: 24
      }),
    enabled:
      hasSearched &&
      (searchMode === 'keyword' ? Boolean(selectedSearchAssetId) : selectedRegionKind === 'all' || Boolean(selectedRegion?.id)),
    staleTime: 5 * 60 * 1000
  });

  const searchAssets = travelAssetSearchQuery.data ?? [];
  const assets = recommendationsQuery.data?.assets ?? [];
  const courses = recommendationsQuery.data?.courses ?? [];
  const favoriteAssets = useMemo(
    () => [...searchAssets, ...assets].filter((asset, index, list) => favoriteAssetIds.includes(asset.id) && list.findIndex((item) => item.id === asset.id) === index),
    [assets, favoriteAssetIds, searchAssets]
  );
  const favoriteCourses = useMemo(() => courses.filter((course) => favoriteCourseIds.includes(course.id)), [courses, favoriteCourseIds]);
  const todayCourse = todayRecommendationQuery.data?.courses?.[0] ?? null;
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? null;
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0] ?? null;

  return (
    <Screen
      title="섬코스"
      subtitle="여행권역, 스타일, 조건을 조합해 실제 수집 데이터 기반 추천을 확인합니다."
      mascotSource={require('../../assets/mascot/boogi_bg6.png')}
    >
      <MascotBanner
        eyebrow="ISLAND TRIP 2.0"
        title="조건을 고르면 추천 섬 여행 자원이 정리됩니다"
        description="공공데이터와 섬 여행권역 DB를 연결해 숙박, 코스, 편의시설, 액티비티 후보를 추천합니다."
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        tone="mint"
      />

      {seedIslandName ? (
        <View style={styles.seedPanel}>
          <MapPin color={colors.primary} size={18} />
          <View style={styles.flex}>
            <Text style={styles.seedTitle}>{seedIslandName} 중심으로 여행 만들기</Text>
            <Text style={styles.seedDescription}>{[seedIsland?.travelRegionName, seedProvinceName, seedCityName].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
      ) : null}

      <SectionHeader title="검색 방식 선택" meta={searchMode === 'keyword' ? '통합검색' : searchMode === 'conditions' ? '조건검색' : '먼저 선택'} />
      <View style={styles.modeGrid}>
        <ModeCard
          title="통합검색으로 여행 검색하기"
          description="검색어로 적재된 여행 데이터를 찾고, 선택한 항목을 기준으로 근처 여행 코스를 추천합니다."
          selected={searchMode === 'keyword'}
          onPress={() => {
            setSearchMode('keyword');
            setHasSearched(false);
          }}
        />
        {searchMode === 'keyword' ? (
          <View style={styles.modeExpandedPanel}>
            <SectionHeader title="통합검색" meta={selectedSearchAssetId ? '항목 선택됨' : '여행 데이터 검색'} />
            <View style={styles.keywordSearchPanel}>
              <View style={styles.keywordInputRow}>
                <Search color={colors.primary} size={18} />
                <TextInput
                  value={tripSearchKeyword}
                  onChangeText={(value) => {
                    setTripSearchKeyword(value);
                    setHasAssetSearched(false);
                    setHasSearched(false);
                    setSelectedSearchAssetId(null);
                  }}
                  placeholder="관광지, 코스, 캠핑, 맛집, 등대, 해양레저 검색"
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (normalizedTripSearchKeyword.length < 2) return;
                    setHasAssetSearched(true);
                  }}
                  style={styles.keywordInput}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={normalizedTripSearchKeyword.length < 2}
                onPress={() => {
                  if (normalizedTripSearchKeyword.length < 2) return;
                  setHasAssetSearched(true);
                }}
                style={[styles.secondarySearchButton, normalizedTripSearchKeyword.length < 2 && styles.searchButtonDisabled]}
              >
                <Search color={normalizedTripSearchKeyword.length < 2 ? colors.muted : colors.primary} size={17} />
                <Text style={[styles.secondarySearchButtonText, normalizedTripSearchKeyword.length < 2 && styles.secondarySearchButtonTextDisabled]}>
                  통합검색으로 여행 데이터 찾기
                </Text>
              </Pressable>
            </View>
            
            {travelAssetSearchQuery.isLoading ? <InfoPanel title="여행 데이터를 검색하고 있습니다." description="적재된 공공 여행 데이터를 기준으로 관련 항목을 찾는 중입니다." /> : null}
            {hasAssetSearched && !travelAssetSearchQuery.isLoading && searchAssets.length === 0 ? (
              <InfoPanel title="검색 결과가 없습니다." description="다른 검색어로 다시 찾아보세요." />
            ) : null}
            {searchAssets.length > 0 ? (
              <>
                <SectionHeader title="검색 결과" meta={`${searchAssets.length}개`} />
                <View style={styles.cardList}>
                  {searchAssets.map((asset, index) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      rank={index + 1}
                      selected={selectedSearchAssetId === asset.id}
                      favored={favoriteAssetIds.includes(asset.id)}
                      onSelect={() => {
                        setSelectedSearchAssetId(asset.id);
                        setSelectedAssetId(null);
                        setSelectedCourseId(null);
                        setHasSearched(true);
                      }}
                      onFavorite={() => toggleValue(asset.id, favoriteAssetIds, setFavoriteAssetIds)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        <ModeCard
          title="나만의 조건으로 여행 검색하기"
          description="여행권역, 스타일, 조건을 차례로 선택해서 추천 여행 코스를 찾습니다."
          selected={searchMode === 'conditions'}
          onPress={() => {
            setSearchMode('conditions');
            setHasSearched(false);
          }}
        />
        {searchMode === 'conditions' ? (
          <View style={styles.modeExpandedPanel}>
            
            <SectionHeader title="1. 여행 권역" meta={selectedRegionKind === 'all' ? '전체' : selectedRegion?.name ?? '권역 선택'} />
            <View style={styles.regionPicker}>
              <View style={styles.regionKindRow}>
                {REGION_KIND_OPTIONS.map((option) => {
                  const isSelected = option.id === selectedRegionKind;
                  const count = option.id === 'all' ? islands.length : regionKindCounts[option.id] ?? 0;
                  const isDisabled = option.id !== 'all' && count === 0;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      disabled={isDisabled}
                      onPress={() => {
                        setSelectedRegionKind(option.id);
                        setSelectedRegionId(null);
                        setIsRegionPickerOpen(option.id !== 'all');
                        setHasSearched(false);
                      }}
                      style={[styles.regionKindBadge, isSelected && styles.regionKindBadgeSelected, isDisabled && styles.regionKindBadgeDisabled]}
                    >
                      <Text style={[styles.regionKindBadgeText, isSelected && styles.regionKindBadgeTextSelected]}>{option.label}</Text>
                      <Text style={[styles.regionKindBadgeCount, isSelected && styles.regionKindBadgeCountSelected]}>{count.toLocaleString('ko-KR')}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (selectedRegionKind === 'all') return;
                  setIsRegionPickerOpen((current) => !current);
                }}
                style={styles.regionSummaryCard}
              >
                <View style={styles.regionSummaryIcon}>
                  <MapPin color={colors.primary} size={17} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.regionSummaryLabel}>선택한 권역</Text>
                  <Text style={styles.regionSummaryName}>{selectedRegionKind === 'all' ? '전체' : selectedRegion?.name ?? '여행 권역을 선택해 주세요'}</Text>
                  {selectedRegionKind === 'all' ? (
                    <Text style={styles.regionSummaryMeta}>권역 전체 · {islands.length.toLocaleString('ko-KR')}개 섬</Text>
                  ) : selectedRegion ? (
                    <Text style={styles.regionSummaryMeta}>
                      {regionKindLabel(selectedRegion.kind)} · {selectedRegion.count.toLocaleString('ko-KR')}개 섬 연결
                    </Text>
                  ) : null}
                </View>
                {selectedRegionKind === 'all' ? null : isRegionPickerOpen ? <ChevronUp color={colors.primary} size={20} /> : <ChevronDown color={colors.primary} size={20} />}
              </Pressable>
              {isRegionPickerOpen && selectedRegionKind !== 'all' ? (
                <View style={styles.regionOptionGrid}>
                  {travelRegions.length > 0 ? (
                    travelRegions.map((region) => (
                    <Pressable
                      key={region.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedRegionId(region.id);
                        setIsRegionPickerOpen(false);
                        setHasSearched(false);
                      }}
                      style={[styles.regionCard, region.id === selectedRegion?.id && styles.regionCardSelected]}
                    >
                      <Text style={[styles.regionName, region.id === selectedRegion?.id && styles.selectedText]}>{region.name}</Text>
                      <Text style={[styles.regionMeta, region.id === selectedRegion?.id && styles.selectedSubText]}>
                        {regionKindLabel(region.kind)} · {region.count.toLocaleString('ko-KR')}개 섬
                      </Text>
                    </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptyRegionCard}>
                      <Text style={styles.emptyRegionText}>{regionKindLabel(selectedRegionKind)} 데이터가 아직 없습니다.</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
            
            <SectionHeader title="2. 여행 스타일" meta={selectedStyle.label} />
            <View style={styles.collapsiblePicker}>
              <Pressable accessibilityRole="button" onPress={() => setIsStylePickerOpen((current) => !current)} style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Star color={colors.primary} size={17} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.summaryLabel}>선택한 스타일</Text>
                  <Text style={styles.summaryName}>{selectedStyle.label}</Text>
                  <Text style={styles.summaryMeta}>{selectedStyle.description}</Text>
                </View>
                {isStylePickerOpen ? <ChevronUp color={colors.primary} size={20} /> : <ChevronDown color={colors.primary} size={20} />}
              </Pressable>
              {isStylePickerOpen ? (
                <View style={styles.styleGrid}>
                  {TRAVEL_STYLES.map((style) => (
                <Pressable
                  key={style.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedStyleId(style.id);
                    setIsStylePickerOpen(false);
                    setHasSearched(false);
                  }}
                  style={[styles.styleCard, style.id === selectedStyleId && styles.styleCardSelected]}
                >
                  <Text style={[styles.styleLabel, style.id === selectedStyleId && styles.selectedText]}>{style.label}</Text>
                  <Text style={[styles.styleDescription, style.id === selectedStyleId && styles.selectedSubText]} numberOfLines={2}>
                    {style.description}
                  </Text>
                </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            
            <SectionHeader title="3. 여행 조건" meta="추천 정확도 필터" />
            <View style={styles.collapsiblePicker}>
              <Pressable accessibilityRole="button" onPress={() => setIsConditionPickerOpen((current) => !current)} style={styles.summaryCard}>
                <View style={styles.summaryIcon}>
                  <Check color={colors.primary} size={17} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.summaryLabel}>선택한 조건</Text>
                  <Text style={styles.summaryName}>{conditionSummary}</Text>
                  <Text style={styles.summaryMeta} numberOfLines={1}>
                    {conditionExtraSummary}
                  </Text>
                </View>
                {isConditionPickerOpen ? <ChevronUp color={colors.primary} size={20} /> : <ChevronDown color={colors.primary} size={20} />}
              </Pressable>
              {isConditionPickerOpen ? (
                <View style={styles.conditionPanel}>
              <ChipGroup title="여행 기간" options={DURATION_OPTIONS} selected={duration} onSelect={setDuration} />
              <ChipGroup title="동행 유형" options={COMPANION_OPTIONS} selected={companions} onSelect={setCompanions} />
              <ChipGroup title="이동 수단" options={TRANSPORT_OPTIONS} selected={transport} onSelect={setTransport} />
              <ChipGroup title="이동 난이도" options={DIFFICULTY_OPTIONS} selected={difficulty} onSelect={setDifficulty} />
              <ChipGroup title="예산" options={BUDGET_OPTIONS} selected={budget} onSelect={setBudget} />
              <ChipGroup title="숙박 여부" options={STAY_TYPE_OPTIONS} selected={stayType} onSelect={setStayType} />
              <MultiChipGroup title="편의시설" options={FACILITY_OPTIONS} selected={facilities} onChange={setFacilities} />
              <MultiChipGroup title="관심 활동" options={ACTIVITY_OPTIONS} selected={activities} onChange={setActivities} />
                </View>
              ) : null}
            </View>
            
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSearchMode('conditions');
                setHasSearched(true);
              }}
              style={styles.searchButton}
            >
              <Search color={colors.surface} size={18} />
              <Text style={styles.searchButtonText}>나만의 조건으로 여행 검색하기</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <FavoriteTravelPanel
        open={isFavoriteOpen}
        onToggle={() => setIsFavoriteOpen((current) => !current)}
        assets={favoriteAssets}
        courses={favoriteCourses}
        onSelectCourse={(courseId) => {
          setSelectedCourseId(courseId);
          setHasSearched(true);
        }}
        onSelectAsset={(assetId) => {
          setSelectedAssetId(assetId);
          setHasSearched(true);
        }}
      />

      <TodayRecommendationPanel
        open={isTodayOpen}
        onToggle={() => setIsTodayOpen((current) => !current)}
        loading={todayRecommendationQuery.isLoading}
        course={todayCourse}
        islands={recommendedIslandsQuery.data ?? []}
        islandsLoading={recommendedIslandsQuery.isLoading}
        onSelectCourse={(courseId) => {
          setSelectedCourseId(courseId);
          setHasSearched(true);
        }}
      />



      {recommendationsQuery.isLoading ? <InfoPanel title="추천 목록을 불러오고 있습니다." description={searchMode === 'keyword' ? '검색어가 포함된 여행추천 데이터를 찾는 중입니다.' : '여행권역과 조건에 맞는 데이터를 계산하는 중입니다.'} /> : null}
      {recommendationsQuery.isError ? <InfoPanel title="추천 정보를 불러오지 못했습니다." description="API 서버와 DB 적재 상태를 확인해 주세요." /> : null}
      {hasSearched && !recommendationsQuery.isLoading && assets.length === 0 ? (
        <InfoPanel title="추천 후보가 없습니다." description={searchMode === 'keyword' ? '다른 검색어를 입력해 보세요.' : '다른 여행권역이나 조건을 선택해 보세요.'} />
      ) : null}

      <SectionHeader title="추천 여행 코스" meta={`${courses.length}개`} />
      <View style={styles.cardList}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            selected={selectedCourse?.id === course.id}
            favored={favoriteCourseIds.includes(course.id)}
            onSelect={() => setSelectedCourseId(course.id)}
            onFavorite={() => toggleValue(course.id, favoriteCourseIds, setFavoriteCourseIds)}
          />
        ))}
      </View>

      {selectedCourse ? <CourseDetail course={selectedCourse} /> : null}
    </Screen>
  );
}

function AssetCard({
  asset,
  rank,
  selected,
  favored,
  onSelect,
  onFavorite
}: {
  asset: TripRecommendationAsset;
  rank: number;
  selected: boolean;
  favored: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onSelect} style={[styles.resultCard, selected && styles.resultCardSelected]}>
      <View style={styles.cardTop}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.resultTitle}>{asset.name}</Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {[categoryLabel(asset.category), asset.travelRegionName, asset.matchedIslandName].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onFavorite} style={[styles.iconButton, favored && styles.iconButtonSelected]}>
          <Heart color={favored ? colors.surface : colors.coral} fill={favored ? colors.coral : 'transparent'} size={18} />
        </Pressable>
      </View>
      <Text style={styles.description} numberOfLines={2}>
        {asset.address ?? asset.sourceTitle}
      </Text>
      <View style={styles.tagRow}>
        <Tag label={`${asset.recommendationScore}점`} />
        {asset.tags.slice(0, 3).map((tag) => (
          <Tag key={tag} label={categoryLabel(tag)} />
        ))}
      </View>
    </Pressable>
  );
}

function AssetDetail({ asset }: { asset: TripRecommendationAsset }) {
  return (
    <View style={styles.detailPanel}>
      <Text style={styles.detailEyebrow}>ASSET DETAIL</Text>
      <Text style={styles.detailTitle}>{asset.name}</Text>
      <DetailRow label="분류" value={categoryLabel(asset.category)} />
      <DetailRow label="권역" value={asset.travelRegionName} />
      <DetailRow label="연결 섬" value={asset.matchedIslandName} />
      <DetailRow label="주소" value={asset.address} />
      <DetailRow label="출처" value={asset.sourceTitle} />
      <View style={styles.reasonBox}>
        <Info color={colors.primary} size={16} />
        <Text style={styles.reasonText}>{asset.reasons.length > 0 ? asset.reasons.join(' · ') : '권역과 조건에 맞는 후보입니다.'}</Text>
      </View>
    </View>
  );
}

function CourseCard({
  course,
  selected,
  favored,
  onSelect,
  onFavorite
}: {
  course: TripRecommendationCourse;
  selected: boolean;
  favored: boolean;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onSelect} style={[styles.resultCard, selected && styles.resultCardSelected]}>
      <View style={styles.cardTop}>
        <View style={styles.courseIcon}>
          <Route color={colors.primary} size={17} />
        </View>
        <View style={styles.flex}>
          <Pressable accessibilityRole="button" onPress={onSelect}>
            <Text style={[styles.resultTitle, styles.resultTitleLink]}>{course.title}</Text>
          </Pressable>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {[course.regionName, course.duration, course.distanceSummary, `${course.score}점`].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onFavorite} style={[styles.iconButton, favored && styles.iconButtonSelected]}>
          <Star color={favored ? colors.surface : colors.amber} fill={favored ? colors.amber : 'transparent'} size={18} />
        </Pressable>
      </View>
      <Text style={styles.description}>{course.summary}</Text>
      <View style={styles.tagRow}>
        {course.tags.slice(0, 4).map((tag) => (
          <Tag key={tag} label={categoryLabel(tag)} />
        ))}
      </View>
    </Pressable>
  );
}

function CourseDetail({ course }: { course: TripRecommendationCourse }) {
  return (
    <View style={styles.detailPanel}>
      <Text style={styles.detailEyebrow}>COURSE DETAIL</Text>
      <Text style={styles.detailTitle}>{course.title}</Text>
      <Text style={styles.description}>{course.summary}</Text>
      <View style={styles.courseMetricRow}>
        <View style={styles.courseMetricItem}>
          <Text style={styles.detailLabel}>총 이동거리</Text>
          <Text style={styles.courseMetricValue}>{course.totalDistanceKm === null ? '계산 전' : `약 ${course.totalDistanceKm.toLocaleString('ko-KR')}km`}</Text>
        </View>
        <View style={styles.courseMetricItem}>
          <Text style={styles.detailLabel}>예상 이동</Text>
          <Text style={styles.courseMetricValue}>{course.estimatedTravelMinutes === null ? '계산 전' : `${course.estimatedTravelMinutes}분`}</Text>
        </View>
      </View>
      <View style={styles.stopList}>
        {course.stops.map((stop, index) => (
          <View key={`${course.id}-${stop}-${index}`} style={styles.stopItem}>
            <Text style={styles.stopIndex}>{index + 1}</Text>
            <Text style={styles.stopText}>{stop}</Text>
          </View>
        ))}
      </View>
      <View style={styles.courseStopDetailList}>
        {course.assets.map((asset, index) => (
          <View key={`${course.id}-${asset.id}-${index}`} style={styles.courseStopDetail}>
            <View style={styles.courseStopDetailHeader}>
              <Text style={styles.stopIndex}>{index + 1}</Text>
              <View style={styles.flex}>
                <Text style={styles.courseStopTitle}>{asset.name}</Text>
                <Text style={styles.resultMeta} numberOfLines={1}>
                  {[categoryLabel(asset.category ?? undefined), asset.travelRegionName, asset.matchedIslandName].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            {asset.address ? <DetailRow label="주소" value={asset.address} /> : null}
            <DetailRow label="추천 점수" value={`${asset.recommendationScore}점`} />
            {asset.latitude !== null && asset.longitude !== null ? (
              <DetailRow label="좌표" value={`${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}`} />
            ) : null}
            {asset.reasons.length > 0 ? <DetailRow label="추천 사유" value={asset.reasons.join(' · ')} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function FavoriteTravelPanel({
  open,
  onToggle,
  assets,
  courses,
  onSelectAsset,
  onSelectCourse
}: {
  open: boolean;
  onToggle: () => void;
  assets: TripRecommendationAsset[];
  courses: TripRecommendationCourse[];
  onSelectAsset: (assetId: string) => void;
  onSelectCourse: (courseId: string) => void;
}) {
  const total = assets.length + courses.length;
  return (
    <View style={styles.initialPanel}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.initialPanelHeader}>
        <View style={styles.summaryIcon}>
          <Heart color={colors.coral} size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.initialPanelTitle}>추천여행 즐겨찾기</Text>
          <Text style={styles.initialPanelMeta}>{total > 0 ? total + '개 저장됨' : '저장한 추천여행이 없습니다'}</Text>
        </View>
        {open ? <ChevronUp color={colors.primary} size={20} /> : <ChevronDown color={colors.primary} size={20} />}
      </Pressable>
      {open ? (
        <View style={styles.initialPanelBody}>
          {total === 0 ? (
            <Text style={styles.emptyRegionText}>추천코스나 여행 데이터를 즐겨찾기하면 이곳에서 바로 다시 볼 수 있습니다.</Text>
          ) : null}
          {courses.map((course) => (
            <Pressable key={course.id} accessibilityRole="button" onPress={() => onSelectCourse(course.id)} style={styles.favoriteRow}>
              <Route color={colors.primary} size={16} />
              <View style={styles.flex}>
                <Text style={styles.favoriteTitle}>{course.title}</Text>
                <Text style={styles.favoriteMeta}>{[course.regionName, course.distanceSummary].filter(Boolean).join(' · ')}</Text>
              </View>
            </Pressable>
          ))}
          {assets.map((asset) => (
            <Pressable key={asset.id} accessibilityRole="button" onPress={() => onSelectAsset(asset.id)} style={styles.favoriteRow}>
              <MapPin color={colors.primary} size={16} />
              <View style={styles.flex}>
                <Text style={styles.favoriteTitle}>{asset.name}</Text>
                <Text style={styles.favoriteMeta}>{[categoryLabel(asset.category), asset.travelRegionName].filter(Boolean).join(' · ')}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TodayRecommendationPanel({
  open,
  onToggle,
  loading,
  course,
  islands,
  islandsLoading,
  onSelectCourse
}: {
  open: boolean;
  onToggle: () => void;
  loading: boolean;
  course: TripRecommendationCourse | null;
  islands: RecommendedIsland[];
  islandsLoading: boolean;
  onSelectCourse: (courseId: string) => void;
}) {
  const forecastLocationName = course?.assets.find((asset) => asset.matchedIslandName)?.matchedIslandName ?? course?.regionName ?? undefined;
  return (
    <View style={styles.initialPanel}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.initialPanelHeader}>
        <View style={styles.summaryIcon}>
          <Star color={colors.amber} size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.initialPanelTitle}>오늘의 추천</Text>
          <Text style={styles.initialPanelMeta}>{course ? course.title : loading ? '추천을 고르는 중입니다' : '오늘 추천을 준비 중입니다'}</Text>
        </View>
        {open ? <ChevronUp color={colors.primary} size={20} /> : <ChevronDown color={colors.primary} size={20} />}
      </Pressable>
      {open ? (
        <View style={styles.initialPanelBody}>
          {loading ? <Text style={styles.emptyRegionText}>오늘 이동하기 좋은 당일치기 코스를 찾고 있습니다.</Text> : null}
          {!loading && !course ? <Text style={styles.emptyRegionText}>오늘 보여줄 추천코스가 아직 없습니다.</Text> : null}
          {course ? (
            <Pressable accessibilityRole="button" onPress={() => onSelectCourse(course.id)} style={styles.todayCard}>
              <Text style={styles.favoriteTitle}>{course.title}</Text>
              <Text style={styles.description}>{course.summary}</Text>
              <View style={styles.tagRow}>
                <Tag label={course.regionName ?? '권역'} />
                {course.distanceSummary ? <Tag label={course.distanceSummary} /> : null}
                <Tag label="예보·배편 확인 권장" />
              </View>
              <View style={styles.todayLinkRow}>
                <Link href={{ pathname: '/forecast', params: forecastLocationName ? { locationName: forecastLocationName } : {} }} asChild>
                  <Pressable style={styles.inlineLinkButton}>
                    <Text style={styles.inlineLinkText}>오늘 예보 보기</Text>
                  </Pressable>
                </Link>
                <Link href="/schedule" asChild>
                  <Pressable style={styles.inlineLinkButton}>
                    <Text style={styles.inlineLinkText}>배편 시간표 보기</Text>
                  </Pressable>
                </Link>
              </View>
            </Pressable>
          ) : null}
          <View style={styles.recommendedIslandSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>추천섬 목록</Text>
              <Text style={styles.sectionMeta}>{islands.length}개</Text>
            </View>
            {islandsLoading ? <Text style={styles.emptyRegionText}>추천섬 마스터를 불러오고 있습니다.</Text> : null}
            {!islandsLoading && islands.length === 0 ? <Text style={styles.emptyRegionText}>추천섬 데이터가 아직 없습니다.</Text> : null}
            {islands.map((island) => (
              <RecommendedIslandCard key={island.id} island={island} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function RecommendedIslandCard({ island }: { island: RecommendedIsland }) {
  const regionText = [island.matchedIsland?.travelRegionName, island.provinceName, island.cityName].filter(Boolean).join(' 쨌 ');
  return (
    <View style={styles.recommendedIslandCard}>
      <View style={styles.cardTop}>
        <View style={styles.summaryIcon}>
          <MapPin color={colors.primary} size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.favoriteTitle}>{island.displayName ?? island.islandName}</Text>
          <Text style={styles.favoriteMeta}>{regionText || island.sourceTitle}</Text>
        </View>
      </View>
      <Text style={styles.description}>{island.description}</Text>
      {island.photoDescription ? <Text style={styles.photoDescription}>{island.photoDescription}</Text> : null}
      {island.ferrySummary ? <DetailRow label="배편" value={island.ferrySummary} /> : null}
      <View style={styles.tagRow}>
        {island.highlights.slice(0, 3).map((highlight) => (
          <Tag key={highlight} label={highlight} />
        ))}
        {island.tags.slice(0, 2).map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </View>
    </View>
  );
}

function ModeCard({ title, description, selected, onPress }: { title: string; description: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.modeCard, selected && styles.modeCardSelected]}>
      <View style={styles.cardTop}>
        <View style={styles.summaryIcon}>
          <Search color={selected ? colors.surface : colors.primary} size={18} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.modeTitle, selected && styles.selectedText]}>{title}</Text>
          <Text style={[styles.modeDescription, selected && styles.selectedSubText]}>{description}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
  );
}

function ChipGroup({ title, options, selected, onSelect }: { title: string; options: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.conditionBlock}>
      <Text style={styles.conditionTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Chip key={option} label={option} selected={selected === option} onPress={() => onSelect(option)} />
        ))}
      </View>
    </View>
  );
}

function MultiChipGroup({ title, options, selected, onChange }: { title: string; options: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  return (
    <View style={styles.conditionBlock}>
      <Text style={styles.conditionTitle}>{title}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <Chip key={option} label={option} selected={selected.includes(option)} onPress={() => toggleValue(option, selected, onChange)} />
        ))}
      </View>
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      {selected ? <Check color={colors.surface} size={13} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InfoPanel({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.infoPanel}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoDescription}>{description}</Text>
    </View>
  );
}

function buildTravelRegions(islands: IslandSummary[]) {
  const regionMap = new Map<string, TravelRegionOption>();
  islands.forEach((island) => {
    const region = getRegionOptionForIsland(island);
    if (!region) return;
    const current = regionMap.get(region.id);
    if (current) current.count += 1;
    else regionMap.set(region.id, { ...region, count: 1 });
  });
  return [...regionMap.values()].sort((left, right) => {
    const kindOrder = { travel: 0, forecast: 1, admin: 2 };
    return kindOrder[left.kind] - kindOrder[right.kind] || right.count - left.count || left.name.localeCompare(right.name, 'ko-KR');
  });
}

function countRegionsByKind(regions: TravelRegionOption[]) {
  return regions.reduce<Record<TravelRegionOption['kind'], number>>(
    (counts, region) => {
      counts[region.kind] += 1;
      return counts;
    },
    { travel: 0, forecast: 0, admin: 0 }
  );
}

function getRegionOptionForIsland(island: IslandSummary): Omit<TravelRegionOption, 'count'> | null {
  if (island.travelRegionId && island.travelRegionName) {
    return { id: island.travelRegionId, name: island.travelRegionName, kind: 'travel' };
  }
  if (island.forecastLocationId && island.forecastLocationName) {
    return { id: `forecast:${island.forecastLocationId}`, name: `${island.forecastLocationName} 예보권역`, kind: 'forecast' };
  }
  const adminName = [island.provinceName, island.cityName].filter(Boolean).join(' ');
  return adminName ? { id: `admin:${adminName}`, name: adminName, kind: 'admin' } : null;
}

function normalizeRegionIdForApi(region: TravelRegionOption) {
  if (region.kind === 'forecast') return region.id.replace(/^forecast:/, '');
  if (region.kind === 'admin') return region.id.replace(/^admin:/, '');
  return region.id;
}

function regionKindLabel(kind: TravelRegionOption['kind']) {
  if (kind === 'travel') return '여행권역';
  if (kind === 'forecast') return '예보권역';
  return '행정권역';
}

function getRouteParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim();
  return normalized ? normalized : null;
}

function toggleValue(value: string, selected: string[], onChange: (value: string[]) => void) {
  onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
}

function categoryLabel(value?: string | null) {
  const labels: Record<string, string> = {
    accommodation: '숙박',
    activity: '액티비티',
    accessibility: '무장애',
    beach: '해변',
    course: '코스',
    facility: '편의시설',
    festival: '축제',
    food: '미식',
    viewpoint: '전망',
    unknown: '기타'
  };
  return value ? labels[value] ?? value : '기타';
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  seedPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 13
  },
  seedTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  seedDescription: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 3 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  sectionMeta: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  modeGrid: { gap: 10 },
  modeExpandedPanel: { gap: 12, paddingBottom: 4 },
  modeCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 8, padding: 14 },
  modeCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  modeDescription: { color: colors.muted, fontSize: 12, fontWeight: '800', lineHeight: 18, marginTop: 4 },
  initialPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 0, overflow: 'hidden' },
  initialPanelHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 68, padding: 12 },
  initialPanelBody: { borderTopColor: colors.border, borderTopWidth: 1, gap: 9, padding: 12 },
  initialPanelTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  initialPanelMeta: { color: colors.muted, fontSize: 12, fontWeight: '800', lineHeight: 17, marginTop: 3 },
  favoriteRow: { alignItems: 'center', backgroundColor: colors.backgroundSoft, borderColor: colors.border, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, padding: 10 },
  favoriteTitle: { color: colors.navy, fontSize: 13, fontWeight: '900' },
  favoriteMeta: { color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 3 },
  todayCard: { backgroundColor: colors.backgroundSoft, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 9, padding: 11 },
  recommendedIslandSection: { gap: 9, marginTop: 4 },
  recommendedIslandCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 9, padding: 11 },
  photoDescription: { color: colors.primaryDark, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  todayLinkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inlineLinkButton: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  inlineLinkText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  regionPicker: {
    gap: 8
  },
  regionKindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  regionKindBadge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12
  },
  regionKindBadgeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  regionKindBadgeDisabled: {
    opacity: 0.45
  },
  regionKindBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  regionKindBadgeTextSelected: {
    color: colors.surface
  },
  regionKindBadgeCount: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  regionKindBadgeCountSelected: {
    color: '#e5f1ff'
  },
  regionSummaryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 12
  },
  regionSummaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  regionSummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  regionSummaryName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2
  },
  regionSummaryMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3
  },
  regionOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  regionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 156,
    padding: 12
  },
  regionCardSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  regionName: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  regionMeta: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 5 },
  emptyRegionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    width: '100%'
  },
  emptyRegionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  selectedText: { color: colors.surface },
  selectedSubText: { color: '#e5f1ff' },
  collapsiblePicker: {
    gap: 8
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 12
  },
  summaryIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  summaryName: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2
  },
  summaryMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 3
  },
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  styleCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 76,
    minWidth: 152,
    padding: 12
  },
  styleCardSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  styleLabel: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  styleDescription: { color: colors.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 5 },
  conditionPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 14, padding: 14 },
  conditionBlock: { gap: 8 },
  conditionTitle: { color: colors.navy, fontSize: 13, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 11
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  chipTextSelected: { color: colors.surface },
  keywordSearchPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  keywordInputRow: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 11
  },
  keywordInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 0,
    paddingVertical: 8
  },
  secondarySearchButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12
  },
  secondarySearchButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  secondarySearchButtonTextDisabled: {
    color: colors.muted
  },
  searchButtonDisabled: {
    opacity: 0.55
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48
  },
  searchButtonText: { color: colors.surface, fontSize: 15, fontWeight: '900' },
  cardList: { gap: 10 },
  resultCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 10, padding: 13 },
  resultCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  cardTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  rankBadge: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 32, justifyContent: 'center', width: 32 },
  rankText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  courseIcon: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  resultTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  resultTitleLink: { textDecorationLine: 'underline' },
  resultMeta: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 3 },
  description: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  iconButton: { alignItems: 'center', borderColor: colors.border, borderRadius: 8, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
  iconButtonSelected: { backgroundColor: colors.coral, borderColor: colors.coral },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.backgroundSoft, borderRadius: 999, maxWidth: 150, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  detailPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 },
  detailEyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  detailTitle: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  detailRow: { borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 9 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  reasonBox: { alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 8, flexDirection: 'row', gap: 8, padding: 10 },
  reasonText: { color: colors.navy, flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 18 },
  courseMetricRow: { flexDirection: 'row', gap: 8 },
  courseMetricItem: { backgroundColor: colors.backgroundSoft, borderRadius: 8, flex: 1, gap: 4, padding: 10 },
  courseMetricValue: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  stopList: { gap: 8 },
  stopItem: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  stopIndex: { color: colors.primary, fontSize: 12, fontWeight: '900', width: 20 },
  stopText: { color: colors.text, flex: 1, fontSize: 13, fontWeight: '800' },
  courseStopDetailList: { gap: 10 },
  courseStopDetail: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 11
  },
  courseStopDetailHeader: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  courseStopTitle: { color: colors.navy, fontSize: 14, fontWeight: '900' },
  infoPanel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 },
  infoTitle: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  infoDescription: { color: colors.muted, fontSize: 13, fontWeight: '700', lineHeight: 19 }
});
