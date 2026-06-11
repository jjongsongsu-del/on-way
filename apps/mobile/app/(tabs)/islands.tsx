import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Anchor,
  Check,
  Compass,
  Layers,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Ship,
  X
} from 'lucide-react-native';
import type { IslandSummary } from '@badagil/shared';
import { fetchRouteOptions, type RouteOption } from '@/api/routes';
import { createIslandWmsUrl, fetchIslandFeatures, fetchIslandsResponse, type IslandMapBounds } from '@/api/islands';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { VWorldNativeMap } from '@/components/VWorldNativeMap';
import { setCurrentIsland } from '@/state/app-selection-context';
import { colors } from '@/theme/colors';
import IslandTripScreen from './island-trip';
import MyTripScreen from './my-trip';

const MAP_BOUNDS: IslandMapBounds = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132
};

const MAP_VIEW_PRESETS = [
  { label: '전국', description: '전국 도서', bounds: MAP_BOUNDS },
  { label: '서해', description: '인천, 충남, 전북', bounds: { minLatitude: 35.5, maxLatitude: 38.6, minLongitude: 124.1, maxLongitude: 127.2 } },
  { label: '남해', description: '전남, 경남', bounds: { minLatitude: 33.5, maxLatitude: 35.8, minLongitude: 126, maxLongitude: 129.7 } },
  { label: '동해', description: '울릉, 독도 권역', bounds: { minLatitude: 36.8, maxLatitude: 38.4, minLongitude: 129.8, maxLongitude: 131.4 } },
  { label: '제주', description: '제주 본섬과 부속섬', bounds: { minLatitude: 33, maxLatitude: 34.1, minLongitude: 126, maxLongitude: 127.2 } }
] as const;

const REGION_FILTERS = [
  { label: '인천', value: '인천' },
  { label: '전남', value: '전라남도' },
  { label: '경북', value: '경상북도' },
  { label: '제주', value: '제주' },
  { label: '기타', value: 'OTHER' }
] as const;

type RegionFilter = 'ALL' | (typeof REGION_FILTERS)[number]['value'];

const KOREAN_INITIALS = [
  '\u3131',
  '\u3134',
  '\u3137',
  '\u3139',
  '\u3141',
  '\u3142',
  '\u3145',
  '\u3147',
  '\u3148',
  '\u314a',
  '\u314b',
  '\u314c',
  '\u314d',
  '\u314e'
] as const;
const KOREAN_CHOSEONGS = [
  '\u3131',
  '\u3132',
  '\u3134',
  '\u3137',
  '\u3138',
  '\u3139',
  '\u3141',
  '\u3142',
  '\u3143',
  '\u3145',
  '\u3146',
  '\u3147',
  '\u3148',
  '\u3149',
  '\u314a',
  '\u314b',
  '\u314c',
  '\u314d',
  '\u314e'
] as const;
type InitialFilter = 'ALL' | (typeof KOREAN_INITIALS)[number];
const INITIAL_FILTERS: { label: string; value: (typeof KOREAN_INITIALS)[number] }[] = KOREAN_INITIALS.map((initial) => ({
  label: initial,
  value: initial
}));

export default function IslandsScreen() {
  const routeParams = useLocalSearchParams();

  if (routeParams.mode === 'trip') {
    return <IslandTripScreen />;
  }

  if (routeParams.mode === 'my-trip') {
    return <MyTripScreen />;
  }

  return <IslandMapScreen routeParams={routeParams} />;
}

function IslandMapScreen({ routeParams }: { routeParams: ReturnType<typeof useLocalSearchParams> }) {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('ALL');
  const [selectedInitial, setSelectedInitial] = useState<InitialFilter | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<IslandSummary | null>(null);
  const [focusedIslandId, setFocusedIslandId] = useState<string | null>(null);
  const [mapViewIndex, setMapViewIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [visibleListCount, setVisibleListCount] = useState(30);
  const usesNativeMap = Platform.OS === 'android';

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    const islandName = getRouteParam(routeParams.islandName);
    if (!islandName) return;
    setKeyword(islandName);
    setDebouncedKeyword(islandName);
  }, [routeParams.islandName]);

  const mapBounds = useMemo(
    () => getZoomedBounds(MAP_VIEW_PRESETS[mapViewIndex].bounds, zoomLevel),
    [mapViewIndex, zoomLevel]
  );

  const islandsQuery = useQuery({
    queryKey: ['islands', debouncedKeyword],
    queryFn: () => fetchIslandsResponse(debouncedKeyword),
    staleTime: 24 * 60 * 60 * 1000
  });

  const mapFeaturesQuery = useQuery({
    queryKey: ['island-features', mapBounds],
    queryFn: () => fetchIslandFeatures(mapBounds),
    staleTime: 10 * 60 * 1000
  });

  const routeOptionsQuery = useQuery({
    queryKey: ['island-route-options'],
    queryFn: fetchRouteOptions,
    staleTime: 30 * 60 * 1000
  });

  const allIslands = islandsQuery.data?.data ?? [];
  const regionFilteredIslands = useMemo(
    () => allIslands.filter((island) => matchesRegion(island, selectedRegion)),
    [allIslands, selectedRegion]
  );
  const initialBaseIslands = selectedRegion === 'ALL' ? [] : regionFilteredIslands;
  const initialCounts = useMemo(() => getInitialCounts(initialBaseIslands), [initialBaseIslands]);
  const islands = useMemo(() => {
    if (!selectedInitial || selectedRegion === 'ALL') return [];
    return regionFilteredIslands.filter((island) => matchesInitial(island, selectedInitial));
  }, [regionFilteredIslands, selectedInitial, selectedRegion]);
  const visibleListIslands = islands.slice(0, visibleListCount);
  const mapIslands = selectedInitial ? islands : [];
  const visibleMarkers = useMemo(
    () =>
      mapIslands
        .filter((island) => typeof island.latitude === 'number' && typeof island.longitude === 'number')
        .filter((island) => matchesRegion(island, selectedRegion))
        .filter((island) => (selectedInitial ? matchesInitial(island, selectedInitial) : false)),
    [mapIslands, selectedInitial, selectedRegion]
  );
  const focusedIsland = visibleMarkers.find((island) => island.id === focusedIslandId) ?? visibleMarkers[0] ?? null;
  const nearbyRoutes = useMemo(
    () => findNearbyRoutes(focusedIsland ?? selectedIsland, routeOptionsQuery.data ?? []),
    [focusedIsland, routeOptionsQuery.data, selectedIsland]
  );
  const wmsUrl = useMemo(() => createIslandWmsUrl(mapBounds), [mapBounds]);
  const nativeMapCenter = useMemo(() => getBoundsCenter(mapBounds), [mapBounds]);
  const nativeMapZoom = getNativeMapZoom(mapViewIndex, zoomLevel);
  const hasActiveFilter = Boolean(debouncedKeyword) || selectedRegion !== 'ALL' || Boolean(selectedInitial);

  useEffect(() => {
    const islandName = getRouteParam(routeParams.islandName);
    if (!islandName || focusedIslandId || allIslands.length === 0) return;
    const matched = allIslands.find((island) => island.islandName.includes(islandName) || islandName.includes(island.islandName));
    if (!matched) return;
    setSelectedIsland(matched);
    focusIslandOnMap(matched);
  }, [allIslands, focusedIslandId, routeParams.islandName]);

  const selectRegion = (region: RegionFilter) => {
    setSelectedRegion(region);
    setSelectedInitial(null);
    setVisibleListCount(30);
    setFocusedIslandId(null);
    setSelectedIsland(null);
  };

  const selectInitial = (initial: InitialFilter) => {
    setSelectedInitial(initial);
    setVisibleListCount(30);
    setFocusedIslandId(null);
    setSelectedIsland(null);
  };

  const focusIslandOnMap = (island: IslandSummary) => {
    setFocusedIslandId(island.id);
    setCurrentIsland({
      islandName: island.islandName,
      provinceName: island.provinceName,
      cityName: island.cityName,
      source: 'islands'
    });
    const presetIndex = findPresetIndexForIsland(island);
    if (presetIndex >= 0) {
      setMapViewIndex(presetIndex);
      setZoomLevel(2);
    }
  };

  return (
    <Screen
      title="섬지도"
      subtitle="도서정보를 지도에서 찾고, 가까운 항구와 운항 시간표로 이어지는 탐색 흐름을 만듭니다."
      mascotSource={require('../../assets/mascot/boogi_bg6.png')}
    >
      <MascotBanner
        eyebrow="ISLAND MAP"
        title="섬을 고르면 다음 이동이 보입니다"
        description="2D 지도 위에서 도서 위치를 확인하고, 선택한 섬과 연결될 가능성이 높은 항구와 항로 후보를 함께 살펴봅니다."
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        tone="mint"
      />

      <View style={styles.searchPanel}>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="섬 이름, 지역으로 검색"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {keyword ? (
            <Pressable accessibilityRole="button" onPress={() => setKeyword('')} style={styles.clearButton}>
              <X color={colors.muted} size={17} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="도서정보 새로고침"
          onPress={() => {
            islandsQuery.refetch();
            mapFeaturesQuery.refetch();
          }}
          style={styles.refreshButton}
        >
          <RefreshCw color={colors.primary} size={18} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionChips}>
        {REGION_FILTERS.map((region) => {
          const selected = selectedRegion === region.value;

          return (
            <Pressable
              key={region.value}
              accessibilityRole="button"
              onPress={() => selectRegion(region.value)}
              style={[styles.regionChip, selected && styles.regionChipSelected]}
            >
              {selected ? <Check color={colors.surface} size={14} /> : null}
              <Text style={[styles.regionChipText, selected && styles.regionChipTextSelected]}>{region.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.initialPanel}>
        <View style={styles.initialHeader}>
          <Text style={styles.initialTitle}>초성으로 도서 찾기</Text>
          <Text style={styles.initialCount}>{selectedInitial ? `${islands.length}/${regionFilteredIslands.length}개` : '0/0개'}</Text>
        </View>
        <View style={styles.initialChips}>
          {INITIAL_FILTERS.map((filter) => {
            const selected = selectedInitial === filter.value;
            const count = initialCounts[filter.value] ?? 0;
            const disabled = count === 0;

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                disabled={disabled}
                onPress={() => selectInitial(filter.value)}
                style={[styles.initialChip, selected && styles.initialChipSelected, disabled && styles.initialChipDisabled]}
              >
                <Text style={[styles.initialChipText, selected && styles.initialChipTextSelected, disabled && styles.initialChipTextDisabled]}>
                  {filter.label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <View style={styles.mapTitleRow}>
            <Layers color={colors.primary} size={18} />
            <View>
              <Text style={styles.mapTitle}>2D 도서 지도</Text>
              <Text style={styles.mapSubtitle}>{selectedInitial ? `${selectedInitial} 초성 선택 결과` : '초성을 선택하면 지도에 표시됩니다'}</Text>
            </View>
          </View>
          <View style={styles.zoomControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지도 축소"
              disabled={zoomLevel <= 1}
              onPress={() => setZoomLevel((current) => Math.max(1, current - 1))}
              style={[styles.zoomButton, zoomLevel <= 1 && styles.zoomButtonDisabled]}
            >
              <Minus color={zoomLevel <= 1 ? colors.muted : colors.primary} size={16} />
            </Pressable>
            <Text style={styles.zoomText}>x{zoomLevel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="지도 확대"
              disabled={zoomLevel >= 3}
              onPress={() => setZoomLevel((current) => Math.min(3, current + 1))}
              style={[styles.zoomButton, zoomLevel >= 3 && styles.zoomButtonDisabled]}
            >
              <Plus color={zoomLevel >= 3 ? colors.muted : colors.primary} size={16} />
            </Pressable>
          </View>
        </View>

        <View style={styles.mapCanvas}>
          <VWorldNativeMap
            latitude={nativeMapCenter.latitude}
            longitude={nativeMapCenter.longitude}
            zoom={nativeMapZoom}
            style={styles.nativeMap}
          />
          {!usesNativeMap ? <Image source={{ uri: wmsUrl }} style={styles.wmsLayer} resizeMode="stretch" /> : null}

          <View pointerEvents="none" style={styles.gridOverlay}>
            <View style={styles.gridLineVertical} />
            <View style={styles.gridLineHorizontal} />
          </View>

          {mapFeaturesQuery.isFetching ? (
            <View style={styles.mapLoadingBadge}>
              <Text style={styles.mapLoadingText}>지도 갱신중</Text>
            </View>
          ) : null}

          {visibleMarkers.map((island) => {
            const position = getMarkerPosition(island, mapBounds);
            const selected = focusedIslandId === island.id;

            return (
              <Pressable
                key={island.id}
                accessibilityRole="button"
                accessibilityLabel={`${island.islandName} 상세 보기`}
                onPress={() => {
                  setFocusedIslandId(island.id);
                  setSelectedIsland(island);
                }}
                style={[styles.marker, { left: `${position.x}%`, top: `${position.y}%` }]}
              >
                <View style={[styles.markerDot, selected && styles.markerDotSelected]}>
                  <MapPin color={colors.surface} size={selected ? 17 : 14} />
                </View>
                <Text style={[styles.markerLabel, selected && styles.markerLabelSelected]} numberOfLines={1}>
                  {island.islandName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.mapFooter}>
          <View style={styles.boundsSummary}>
            <Compass color={colors.primary} size={16} />
            <Text style={styles.boundsText}>{formatBounds(mapBounds)}</Text>
          </View>
          <View style={styles.mapLegend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>선택하면 상세와 연결 항로를 확인</Text>
          </View>
        </View>
      </View>

      <View style={styles.focusPanel}>
        <View style={styles.focusHeader}>
          <View>
            <Text style={styles.focusEyebrow}>지도 선택</Text>
            <Text style={styles.focusTitle}>{focusedIsland?.islandName ?? '섬을 선택해 주세요'}</Text>
          </View>
          {focusedIsland ? (
            <Pressable accessibilityRole="button" onPress={() => setSelectedIsland(focusedIsland)} style={styles.focusButton}>
              <Text style={styles.focusButtonText}>상세</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.focusDescription}>
          {focusedIsland?.description ?? '마커나 목록에서 섬을 선택하면 가까운 항구 후보와 이동 흐름을 보여드립니다.'}
        </Text>
        <View style={styles.nearbyRouteList}>
          {nearbyRoutes.length > 0 ? (
            nearbyRoutes.map((route) => (
              <View key={route.id} style={styles.nearbyRouteItem}>
                <Anchor color={colors.primary} size={16} />
                <View style={styles.nearbyRouteCopy}>
                  <Text style={styles.nearbyRouteTitle} numberOfLines={1}>
                    {route.departurePortName} → {route.arrivalPortName}
                  </Text>
                  <Text style={styles.nearbyRouteMeta} numberOfLines={1}>
                    {route.routeName}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.nearbyEmpty}>연결 항로 후보를 찾는 중입니다.</Text>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>도서정보 조회</Text>
          <Text style={styles.sectionSubtitle}>{getFilterSummary(debouncedKeyword, selectedRegion, selectedInitial)}</Text>
        </View>
        <Text style={styles.countText}>{islands.length}개</Text>
      </View>

      {islandsQuery.isLoading ? <InfoPanel title="도서정보를 불러오고 있습니다." description="잠시만 기다려 주세요." /> : null}
      {islandsQuery.isError ? <InfoPanel title="도서정보를 불러오지 못했습니다." description="API 서버 상태를 확인한 뒤 다시 시도해 주세요." /> : null}
      {!islandsQuery.isLoading && !islandsQuery.isError && islands.length === 0 ? (
        <InfoPanel
          title={selectedInitial ? '검색 결과가 없습니다.' : '초성을 선택해 주세요.'}
          description={selectedInitial ? '다른 초성이나 권역을 선택해 보세요.' : '초성을 선택하면 해당 초성으로 시작하는 도서정보가 아래에 표시됩니다.'}
        />
      ) : null}

      <View style={styles.list}>
        {visibleListIslands.map((island) => (
          <Pressable
            key={island.id}
            accessibilityRole="button"
            onPress={() => {
              focusIslandOnMap(island);
              setSelectedIsland(island);
            }}
            style={[styles.card, focusedIslandId === island.id && styles.cardFocused]}
          >
            <View style={styles.cardTop}>
              <View style={styles.islandIconBox}>
                <Image source={require('../../assets/mascot/boogi_bg6.png')} style={styles.islandIcon} resizeMode="contain" />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{island.islandName}</Text>
                <Text style={styles.cardSubtitle}>
                  {[island.provinceName, island.cityName].filter(Boolean).join(' · ') || '지역정보 없음'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${island.islandName} 지도에서 보기`}
                onPress={(event) => {
                  event.stopPropagation();
                  focusIslandOnMap(island);
                }}
                style={styles.locateButton}
              >
                <LocateFixed color={colors.primary} size={20} />
              </Pressable>
            </View>
            <Text style={styles.description}>{island.description ?? '도서 기본정보를 확인할 수 있습니다.'}</Text>
          </Pressable>
        ))}
        {islands.length > visibleListIslands.length ? (
          <Pressable accessibilityRole="button" onPress={() => setVisibleListCount((count) => count + 30)} style={styles.listMoreButton}>
            <Text style={styles.listMoreButtonText}>{Math.min(islands.length, visibleListCount + 30)}/{islands.length}개 보기</Text>
            <Plus color={colors.primary} size={16} />
          </Pressable>
        ) : null}
      </View>

      <IslandDetailModal
        island={selectedIsland}
        nearbyRoutes={nearbyRoutes}
        onClose={() => setSelectedIsland(null)}
        onFocus={() => selectedIsland && focusIslandOnMap(selectedIsland)}
      />
    </Screen>
  );
}

function InfoPanel({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function IslandDetailModal({
  island,
  nearbyRoutes,
  onClose,
  onFocus
}: {
  island: IslandSummary | null;
  nearbyRoutes: RouteOption[];
  onClose: () => void;
  onFocus: () => void;
}) {
  const region = [island?.provinceName, island?.cityName].filter(Boolean).join(' · ');
  const primaryDetails = [
    { label: '지역', value: region },
    { label: '주소', value: island?.address },
    { label: '도서구분', value: island?.islandTypeName },
    { label: '연결유형', value: island?.connectionTypeName },
    { label: '다리/제방', value: island?.bridgeNames },
    { label: '예보 권역', value: island?.forecastLocationName },
    { label: '면적', value: formatArea(island?.areaSquareMeters) },
    { label: '인구', value: formatNumber(island?.population) },
    { label: '해안선', value: formatLength(island?.coastlineLengthMeters) }
  ].filter((item) => item.value);
  const locationDetails = [
    { label: '위도', value: island?.latitude?.toFixed(4) },
    { label: '경도', value: island?.longitude?.toFixed(4) }
  ].filter((item) => item.value);
  const sourceLabel =
    island?.source === 'LOCAL_ISLAND_MASTER' ? '행정안전부 도서지역 데이터' : island?.source === 'VWORLD' ? 'VWorld 도서정보' : '데이터 출처 확인 필요';
  const sourceTone = island?.source === 'MOCK' ? 'preview' : 'live';

  return (
    <Modal animationType="slide" transparent visible={Boolean(island)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleBlock}>
              <Text style={styles.modalEyebrow}>도서 상세정보</Text>
              <Text style={styles.modalTitle}>{island?.islandName}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalCloseButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaPill, sourceTone === 'preview' && styles.metaPillPreview]}>
              <Text style={[styles.metaPillText, sourceTone === 'preview' && styles.metaPillTextPreview]}>{sourceLabel}</Text>
            </View>
            <Text style={styles.updatedText}>{formatUpdatedAt(island?.updatedAt)}</Text>
          </View>

          <Text style={styles.modalDescription}>{island?.description ?? '도서 상세 설명을 준비하고 있습니다.'}</Text>

          {primaryDetails.length > 0 ? (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>기본정보</Text>
              <View style={styles.detailGrid}>
                {primaryDetails.map((item) => (
                  <DetailItem key={item.label} label={item.label} value={item.value} />
                ))}
              </View>
            </View>
          ) : null}

          {locationDetails.length > 0 ? (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>위치정보</Text>
              <View style={styles.detailGrid}>
                {locationDetails.map((item) => (
                  <DetailItem key={item.label} label={item.label} value={item.value} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>연결 항로 후보</Text>
            <View style={styles.modalRouteList}>
              {nearbyRoutes.length > 0 ? (
                nearbyRoutes.slice(0, 3).map((route) => (
                  <View key={route.id} style={styles.modalRouteItem}>
                    <Ship color={colors.primary} size={16} />
                    <Text style={styles.modalRouteText} numberOfLines={1}>
                      {route.departurePortName} → {route.arrivalPortName}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.modalRouteEmpty}>가까운 항로 후보를 찾는 중입니다.</Text>
              )}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={onFocus} style={styles.primaryAction}>
              <Navigation color={colors.surface} size={18} />
              <View style={styles.actionTextGroup}>
                <Text style={styles.primaryActionText}>지도에서 위치 보기</Text>
                <Text style={styles.primaryActionHint}>권역과 확대 수준을 맞춥니다</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryAction}>
              <Ship color={colors.primary} size={18} />
              <View style={styles.actionTextGroup}>
                <Text style={styles.secondaryActionText}>시간표 검색으로 연결</Text>
                <Text style={styles.secondaryActionHint}>항구 후보 기반 연결 예정</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function matchesRegion(island: IslandSummary, region: RegionFilter) {
  if (region === 'ALL') return true;

  const province = island.provinceName ?? '';
  if (region === 'OTHER') {
    return !['인천', '전라남도', '경상북도', '제주'].some((value) => province.includes(value));
  }

  return province.includes(region);
}

function matchesInitial(island: IslandSummary, initial: InitialFilter) {
  if (initial === 'ALL') return true;
  return getKoreanInitial(island.islandName) === initial;
}

function getInitialCounts(islands: IslandSummary[]) {
  return islands.reduce<Record<string, number>>((counts, island) => {
    const initial = getKoreanInitial(island.islandName);
    if (initial) {
      counts[initial] = (counts[initial] ?? 0) + 1;
    }

    return counts;
  }, {});
}

function getKoreanInitial(value?: string | null) {
  const firstChar = value?.trim().charAt(0);
  if (!firstChar) return null;
  const code = firstChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const index = Math.floor((code - 0xac00) / 588);
  const initial = KOREAN_CHOSEONGS[index];
  return KOREAN_INITIALS.includes(initial as (typeof KOREAN_INITIALS)[number])
    ? (initial as (typeof KOREAN_INITIALS)[number])
    : null;
}

function getFilterSummary(keyword: string, region: RegionFilter, initial: InitialFilter | null = null) {
  const selectedRegion = REGION_FILTERS.find((item) => item.value === region)?.label ?? '지역 미선택';
  if (!initial) {
    return '초성 미선택';
  }

  if (keyword) {
    if (region === 'ALL') {
      return `지역 미선택 · ${initial} 초성 · "${keyword}" 검색`;
    }

    return `${selectedRegion} 지역 · ${initial} 초성 · "${keyword}" 검색`;
  }

  if (region === 'ALL') {
    return `${initial} 초성 기준`;
  }

  return `${selectedRegion} 지역 · ${initial} 초성 기준`;
}

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getDataSourceLabel(source: string | undefined, islands: IslandSummary[]) {
  if (source?.includes('local-island-master') || islands.some((island) => island.source === 'LOCAL_ISLAND_MASTER')) {
    return { label: '도서지역 DB', tone: 'live' as const };
  }

  if (source?.includes('preview') || source?.includes('seed') || islands.every((island) => island.source === 'MOCK')) {
    return { label: '데이터 출처 확인 필요', tone: 'preview' as const };
  }

  if (source?.includes('vworld') || islands.some((island) => island.source === 'VWORLD')) {
    return { label: 'VWorld 연계', tone: 'live' as const };
  }

  return { label: '도서정보', tone: 'live' as const };
}

function getMarkerPosition(island: IslandSummary, bounds: IslandMapBounds) {
  const latitude = island.latitude ?? bounds.minLatitude;
  const longitude = island.longitude ?? bounds.minLongitude;
  const x = ((longitude - bounds.minLongitude) / (bounds.maxLongitude - bounds.minLongitude)) * 88 + 6;
  const y = (1 - (latitude - bounds.minLatitude) / (bounds.maxLatitude - bounds.minLatitude)) * 82 + 8;

  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(90, Math.max(8, y))
  };
}

function getZoomedBounds(bounds: IslandMapBounds, zoomLevel: number): IslandMapBounds {
  const clampedZoom = Math.min(3, Math.max(1, zoomLevel));
  if (clampedZoom === 1) {
    return bounds;
  }

  const factor = clampedZoom === 2 ? 0.62 : 0.38;
  const centerLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const centerLongitude = (bounds.minLongitude + bounds.maxLongitude) / 2;
  const latitudeSpan = (bounds.maxLatitude - bounds.minLatitude) * factor;
  const longitudeSpan = (bounds.maxLongitude - bounds.minLongitude) * factor;

  return {
    minLatitude: centerLatitude - latitudeSpan / 2,
    maxLatitude: centerLatitude + latitudeSpan / 2,
    minLongitude: centerLongitude - longitudeSpan / 2,
    maxLongitude: centerLongitude + longitudeSpan / 2
  };
}

function getBoundsCenter(bounds: IslandMapBounds) {
  return {
    latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
    longitude: (bounds.minLongitude + bounds.maxLongitude) / 2
  };
}

function getNativeMapZoom(mapViewIndex: number, zoomLevel: number) {
  const baseZoom = mapViewIndex === 0 ? 6 : 8;
  return baseZoom + zoomLevel - 1;
}

function findPresetIndexForIsland(island: IslandSummary) {
  if (typeof island.latitude !== 'number' || typeof island.longitude !== 'number') {
    return -1;
  }

  return MAP_VIEW_PRESETS.findIndex((preset) => isPointInBounds(island.latitude!, island.longitude!, preset.bounds));
}

function isPointInBounds(latitude: number, longitude: number, bounds: IslandMapBounds) {
  return (
    latitude >= bounds.minLatitude &&
    latitude <= bounds.maxLatitude &&
    longitude >= bounds.minLongitude &&
    longitude <= bounds.maxLongitude
  );
}

function findNearbyRoutes(island: IslandSummary | null, routes: RouteOption[]) {
  if (!island) return [];

  const terms = [
    island.islandName.replace(/도$/, ''),
    island.islandName,
    island.cityName?.replace(/군$/, '').replace(/시$/, ''),
    island.provinceName?.slice(0, 2)
  ]
    .filter((term): term is string => Boolean(term && term.length >= 2))
    .map((term) => term.trim());

  return routes
    .filter((route) =>
      terms.some((term) =>
        [route.routeName, route.departurePortName, route.arrivalPortName, ...route.stopPortNames].some((value) => value.includes(term))
      )
    )
    .slice(0, 4);
}

function formatBounds(bounds: IslandMapBounds) {
  return `위도 ${bounds.minLatitude.toFixed(1)}-${bounds.maxLatitude.toFixed(1)} · 경도 ${bounds.minLongitude.toFixed(1)}-${bounds.maxLongitude.toFixed(1)}`;
}

function formatNumber(value?: number | null) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : null;
}

function formatArea(value?: number | null) {
  if (typeof value !== 'number') return null;
  return `${value.toLocaleString('ko-KR')}㎡`;
}

function formatLength(value?: number | null) {
  if (typeof value !== 'number') return null;
  if (value >= 1000) return `${(value / 1000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}km`;
  return `${value.toLocaleString('ko-KR')}m`;
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return '갱신일 확인중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '갱신일 확인중';
  return `${date.toLocaleDateString('ko-KR')} 갱신`;
}

const styles = StyleSheet.create({
  searchPanel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14
  },
  searchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 0
  },
  clearButton: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  regionChips: {
    gap: 8,
    paddingRight: 12
  },
  initialPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  initialHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  initialTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  initialCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  initialChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  initialChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 48,
    paddingHorizontal: 9
  },
  initialChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  initialChipDisabled: {
    opacity: 0.38
  },
  initialChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  initialChipTextSelected: {
    color: colors.surface
  },
  initialChipTextDisabled: {
    color: colors.muted
  },
  initialChipCount: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900'
  },
  initialChipCountSelected: {
    color: colors.surface
  },
  regionChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 14
  },
  regionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  regionChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  regionChipTextSelected: {
    color: colors.surface
  },
  statusPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14
  },
  statusCopy: {
    flex: 1,
    minWidth: 0
  },
  statusTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  statusDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 3
  },
  sourcePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  sourcePillPreview: {
    backgroundColor: '#fff2d6'
  },
  sourcePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  sourcePillTextPreview: {
    color: colors.warning
  },
  mapPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden'
  },
  mapHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  mapTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  mapTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  mapSubtitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1
  },
  sourceBadge: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  mapControls: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10
  },
  mapApiPanel: {
    backgroundColor: colors.backgroundSoft,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  mapApiItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 2,
    minWidth: 92,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  mapApiLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  mapApiValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  mapViewChips: {
    gap: 7,
    paddingRight: 6
  },
  mapViewChip: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: 12
  },
  mapViewChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  mapViewChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  mapViewChipTextSelected: {
    color: colors.surface
  },
  zoomControls: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 3
  },
  zoomButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30
  },
  zoomButtonDisabled: {
    opacity: 0.55
  },
  zoomText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 22,
    textAlign: 'center'
  },
  mapCanvas: {
    aspectRatio: 1.18,
    backgroundColor: '#dff5ff',
    overflow: 'hidden',
    position: 'relative'
  },
  nativeMap: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  seaBandTop: {
    backgroundColor: '#b9e9ff',
    height: '42%',
    left: '-10%',
    position: 'absolute',
    top: '-15%',
    transform: [{ rotate: '-8deg' }],
    width: '130%'
  },
  seaBandBottom: {
    backgroundColor: '#c7f2ee',
    bottom: '-18%',
    height: '38%',
    left: '-8%',
    position: 'absolute',
    transform: [{ rotate: '9deg' }],
    width: '130%'
  },
  wmsLayer: {
    height: '100%',
    left: 0,
    opacity: 0.48,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  landShapeLarge: {
    backgroundColor: '#eff9e9',
    borderColor: '#b5dfb8',
    borderRadius: 8,
    borderWidth: 1,
    height: '58%',
    position: 'absolute',
    right: '-8%',
    top: '24%',
    transform: [{ rotate: '-18deg' }],
    width: '38%'
  },
  landShapeSmall: {
    backgroundColor: '#f7fbef',
    borderColor: '#c8e8bf',
    borderRadius: 8,
    borderWidth: 1,
    height: '22%',
    left: '8%',
    position: 'absolute',
    top: '64%',
    transform: [{ rotate: '16deg' }],
    width: '22%'
  },
  gridOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  gridLineVertical: {
    backgroundColor: 'rgba(23, 105, 224, 0.11)',
    height: '100%',
    left: '50%',
    position: 'absolute',
    width: 1
  },
  gridLineHorizontal: {
    backgroundColor: 'rgba(23, 105, 224, 0.11)',
    height: 1,
    position: 'absolute',
    top: '50%',
    width: '100%'
  },
  mapLoadingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: 10,
    top: 10
  },
  mapLoadingText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  mapSourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
    top: 10
  },
  mapSourceText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900'
  },
  marker: {
    alignItems: 'center',
    gap: 4,
    maxWidth: 92,
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -20 }]
  },
  markerDot: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  markerDotSelected: {
    backgroundColor: colors.coral,
    height: 38,
    width: 38
  },
  markerLabel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  markerLabelSelected: {
    borderColor: colors.coral,
    color: colors.coral
  },
  mapFooter: {
    gap: 8,
    padding: 12
  },
  boundsSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  boundsText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18
  },
  mapLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  legendDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  legendText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  focusPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  focusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  focusEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  focusTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2
  },
  focusButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 8
  },
  focusButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  focusDescription: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  nearbyRouteList: {
    gap: 8
  },
  nearbyRouteItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    padding: 10
  },
  nearbyRouteCopy: {
    flex: 1,
    minWidth: 0
  },
  nearbyRouteTitle: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  nearbyRouteMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  nearbyEmpty: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3
  },
  countText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  emptyPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19
  },
  list: {
    gap: 10
  },
  listMoreButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42
  },
  listMoreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardFocused: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  cardTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  islandIconBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  islandIcon: {
    height: 34,
    width: 34
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  locateButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  cardTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  description: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  modalBackdrop: {
    backgroundColor: 'rgba(16, 42, 67, 0.32)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: 16,
    maxHeight: '88%',
    padding: 18
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  modalTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3
  },
  modalCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  metaPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  metaPillPreview: {
    backgroundColor: '#fff2d6'
  },
  metaPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  metaPillTextPreview: {
    color: colors.warning
  },
  updatedText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  modalSection: {
    gap: 10
  },
  modalSectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  detailItem: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexGrow: 1,
    gap: 4,
    minWidth: '46%',
    padding: 12
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  detailValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  modalDescription: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21
  },
  modalRouteList: {
    gap: 8
  },
  modalRouteItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 10
  },
  modalRouteText: {
    color: colors.navy,
    flex: 1,
    fontSize: 13,
    fontWeight: '900'
  },
  modalRouteEmpty: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  modalActions: {
    gap: 10
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  actionTextGroup: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center'
  },
  primaryActionHint: {
    color: '#dcecff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center'
  },
  secondaryActionHint: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center'
  }
});
