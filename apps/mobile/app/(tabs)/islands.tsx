import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { colors } from '@/theme/colors';

const MAP_BOUNDS: IslandMapBounds = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132
};

const MAP_VIEW_PRESETS = [
  { label: '전국', description: '전체 도서', bounds: MAP_BOUNDS },
  { label: '서해', description: '인천, 충남, 전북', bounds: { minLatitude: 35.5, maxLatitude: 38.6, minLongitude: 124.1, maxLongitude: 127.2 } },
  { label: '남해', description: '전남, 경남', bounds: { minLatitude: 33.5, maxLatitude: 35.8, minLongitude: 126, maxLongitude: 129.7 } },
  { label: '동해', description: '울릉, 독도 권역', bounds: { minLatitude: 36.8, maxLatitude: 38.4, minLongitude: 129.8, maxLongitude: 131.4 } },
  { label: '제주', description: '제주 본섬과 부속섬', bounds: { minLatitude: 33, maxLatitude: 34.1, minLongitude: 126, maxLongitude: 127.2 } }
] as const;

const REGION_FILTERS = [
  { label: '전체', value: 'ALL' },
  { label: '인천', value: '인천' },
  { label: '전남', value: '전라남도' },
  { label: '경북', value: '경상북도' },
  { label: '제주', value: '제주' },
  { label: '기타', value: 'OTHER' }
] as const;

type RegionFilter = (typeof REGION_FILTERS)[number]['value'];

export default function IslandsScreen() {
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>('ALL');
  const [selectedIsland, setSelectedIsland] = useState<IslandSummary | null>(null);
  const [focusedIslandId, setFocusedIslandId] = useState<string | null>(null);
  const [mapViewIndex, setMapViewIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const usesNativeMap = Platform.OS === 'android';

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedKeyword(keyword.trim()), 350);
    return () => clearTimeout(timeout);
  }, [keyword]);

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
  const islands = useMemo(
    () => allIslands.filter((island) => matchesRegion(island, selectedRegion)),
    [allIslands, selectedRegion]
  );
  const mapIslands = mapFeaturesQuery.data?.data.length ? mapFeaturesQuery.data.data : islands;
  const visibleMarkers = useMemo(
    () =>
      mapIslands
        .filter((island) => typeof island.latitude === 'number' && typeof island.longitude === 'number')
        .filter((island) => matchesRegion(island, selectedRegion)),
    [mapIslands, selectedRegion]
  );
  const focusedIsland = visibleMarkers.find((island) => island.id === focusedIslandId) ?? visibleMarkers[0] ?? null;
  const nearbyRoutes = useMemo(
    () => findNearbyRoutes(focusedIsland ?? selectedIsland, routeOptionsQuery.data ?? []),
    [focusedIsland, routeOptionsQuery.data, selectedIsland]
  );
  const wmsUrl = useMemo(() => createIslandWmsUrl(mapBounds), [mapBounds]);
  const nativeMapCenter = useMemo(() => getBoundsCenter(mapBounds), [mapBounds]);
  const nativeMapZoom = getNativeMapZoom(mapViewIndex, zoomLevel);
  const dataSource = getDataSourceLabel(islandsQuery.data?.meta.source, islands);
  const mapSource = getDataSourceLabel(mapFeaturesQuery.data?.meta.source, visibleMarkers);
  const hasActiveFilter = Boolean(debouncedKeyword) || selectedRegion !== 'ALL';

  const selectPreset = (index: number) => {
    setMapViewIndex(index);
    setZoomLevel(1);
    setFocusedIslandId(null);
  };

  const focusIslandOnMap = (island: IslandSummary) => {
    setFocusedIslandId(island.id);
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
              onPress={() => setSelectedRegion(region.value)}
              style={[styles.regionChip, selected && styles.regionChipSelected]}
            >
              {selected ? <Check color={colors.surface} size={14} /> : null}
              <Text style={[styles.regionChipText, selected && styles.regionChipTextSelected]}>{region.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.statusPanel}>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{islandsQuery.isFetching ? '도서정보를 갱신하고 있습니다' : '도서정보 검색 준비 완료'}</Text>
          <Text style={styles.statusDescription}>
            {debouncedKeyword ? `"${debouncedKeyword}" 검색 결과를 보여줍니다.` : '검색어를 입력하거나 권역을 선택하면 지도와 목록이 함께 좁혀집니다.'}
          </Text>
        </View>
        <View style={[styles.sourcePill, dataSource.tone === 'preview' && styles.sourcePillPreview]}>
          <Text style={[styles.sourcePillText, dataSource.tone === 'preview' && styles.sourcePillTextPreview]}>
            {dataSource.label}
          </Text>
        </View>
      </View>

      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <View style={styles.mapTitleRow}>
            <Layers color={colors.primary} size={18} />
            <View>
              <Text style={styles.mapTitle}>2D 도서 지도</Text>
              <Text style={styles.mapSubtitle}>{MAP_VIEW_PRESETS[mapViewIndex].description}</Text>
            </View>
          </View>
          <Text style={styles.sourceBadge}>{visibleMarkers.length}개 마커</Text>
        </View>

        <View style={styles.mapControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapViewChips}>
            {MAP_VIEW_PRESETS.map((preset, index) => {
              const selected = mapViewIndex === index;

              return (
                <Pressable
                  key={preset.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${preset.label} 지도 보기`}
                  onPress={() => selectPreset(index)}
                  style={[styles.mapViewChip, selected && styles.mapViewChipSelected]}
                >
                  <Text style={[styles.mapViewChipText, selected && styles.mapViewChipTextSelected]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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

          <View style={styles.mapSourceBadge}>
            <Text style={styles.mapSourceText}>{mapSource.label}</Text>
          </View>

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
          <Text style={styles.sectionSubtitle}>{getFilterSummary(debouncedKeyword, selectedRegion)}</Text>
        </View>
        <Text style={styles.countText}>{islands.length}개</Text>
      </View>

      {islandsQuery.isLoading ? <InfoPanel title="도서정보를 불러오고 있습니다." description="잠시만 기다려 주세요." /> : null}
      {islandsQuery.isError ? <InfoPanel title="도서정보를 불러오지 못했습니다." description="API 서버 상태를 확인한 뒤 다시 시도해 주세요." /> : null}
      {!islandsQuery.isLoading && !islandsQuery.isError && islands.length === 0 ? (
        <InfoPanel
          title={hasActiveFilter ? '검색 결과가 없습니다.' : '표시할 도서정보가 없습니다.'}
          description="섬 이름이나 지역 필터를 조금 다르게 선택해 보세요."
        />
      ) : null}

      <View style={styles.list}>
        {islands.map((island) => (
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
              <LocateFixed color={colors.primary} size={20} />
            </View>
            <Text style={styles.description}>{island.description ?? '도서 기본정보를 확인할 수 있습니다.'}</Text>
          </Pressable>
        ))}
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
    { label: '면적', value: formatArea(island?.areaSquareMeters) },
    { label: '인구', value: formatNumber(island?.population) },
    { label: '해안선', value: formatLength(island?.coastlineLengthMeters) }
  ].filter((item) => item.value);
  const locationDetails = [
    { label: '위도', value: island?.latitude?.toFixed(4) },
    { label: '경도', value: island?.longitude?.toFixed(4) }
  ].filter((item) => item.value);
  const sourceLabel = island?.source === 'VWORLD' ? 'VWorld 도서정보' : '미리보기 데이터';
  const sourceTone = island?.source === 'VWORLD' ? 'live' : 'preview';

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

function getFilterSummary(keyword: string, region: RegionFilter) {
  const selectedRegion = REGION_FILTERS.find((item) => item.value === region)?.label ?? '전체';
  if (keyword) {
    return `${selectedRegion} 지역에서 "${keyword}" 검색`;
  }

  return `${selectedRegion} 지역 기준`;
}

function getDataSourceLabel(source: string | undefined, islands: IslandSummary[]) {
  if (source?.includes('preview') || source?.includes('seed') || islands.every((island) => island.source === 'MOCK')) {
    return { label: '미리보기 데이터', tone: 'preview' as const };
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
