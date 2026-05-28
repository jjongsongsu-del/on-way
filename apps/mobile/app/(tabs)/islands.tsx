import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Layers, LocateFixed, MapPin, RefreshCw, Search, Ship, X } from 'lucide-react-native';
import type { IslandSummary } from '@badagil/shared';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { fetchIslands } from '@/api/islands';
import { colors } from '@/theme/colors';

const MAP_BOUNDS = {
  minLatitude: 33,
  maxLatitude: 39,
  minLongitude: 124,
  maxLongitude: 132
};

export default function IslandsScreen() {
  const [keyword, setKeyword] = useState('');
  const [selectedIsland, setSelectedIsland] = useState<IslandSummary | null>(null);
  const trimmedKeyword = keyword.trim();

  const islandsQuery = useQuery({
    queryKey: ['islands', trimmedKeyword],
    queryFn: () => fetchIslands(trimmedKeyword),
    staleTime: 24 * 60 * 60 * 1000
  });

  const islands = islandsQuery.data ?? [];
  const visibleMarkers = useMemo(() => islands.filter((island) => island.latitude && island.longitude), [islands]);

  return (
    <Screen
      title="섬지도"
      subtitle="도서정보를 지도에서 찾고, 항로와 시간표로 이어지는 탐색 흐름을 만듭니다."
      mascotSource={require('../../assets/mascot/boogi_bg6.png')}
    >
      <MascotBanner
        eyebrow="ISLAND MAP"
        title="섬을 고르면 다음 이동이 보입니다"
        description="도서정보 API를 기반으로 섬 위치, 기본정보, 가까운 여객 항로 연결을 단계적으로 확장합니다."
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
            style={styles.searchInput}
          />
          {keyword ? (
            <Pressable accessibilityRole="button" onPress={() => setKeyword('')} style={styles.clearButton}>
              <X color={colors.muted} size={17} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" onPress={() => islandsQuery.refetch()} style={styles.refreshButton}>
          <RefreshCw color={colors.primary} size={18} />
        </Pressable>
      </View>

      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <View style={styles.mapTitleRow}>
            <Layers color={colors.primary} size={18} />
            <Text style={styles.mapTitle}>2D 도서 지도</Text>
          </View>
          <Text style={styles.sourceBadge}>WFS/WMS 준비</Text>
        </View>
        <View style={styles.mapCanvas}>
          <View style={styles.seaBandTop} />
          <View style={styles.seaBandBottom} />
          <View style={styles.landShapeLarge} />
          <View style={styles.landShapeSmall} />
          {visibleMarkers.map((island) => {
            const position = getMarkerPosition(island);

            return (
              <Pressable
                key={island.id}
                accessibilityRole="button"
                onPress={() => setSelectedIsland(island)}
                style={[styles.marker, { left: `${position.x}%`, top: `${position.y}%` }]}
              >
                <View style={styles.markerDot}>
                  <MapPin color={colors.surface} size={14} />
                </View>
                <Text style={styles.markerLabel}>{island.islandName}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>도서정보 조회</Text>
        <Text style={styles.countText}>{islands.length}개</Text>
      </View>

      {islandsQuery.isError ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>섬 정보를 불러오지 못했습니다.</Text>
          <Text style={styles.emptyDescription}>API 서버 상태를 확인한 뒤 다시 시도해 주세요.</Text>
        </View>
      ) : null}

      {!islandsQuery.isError && islands.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>검색 결과가 없습니다.</Text>
          <Text style={styles.emptyDescription}>섬 이름이나 지역명을 조금 다르게 입력해 보세요.</Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {islands.map((island) => (
          <Pressable key={island.id} accessibilityRole="button" onPress={() => setSelectedIsland(island)} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.islandIconBox}>
                <Image source={require('../../assets/mascot/boogi_bg6.png')} style={styles.islandIcon} resizeMode="contain" />
              </View>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{island.islandName}</Text>
                <Text style={styles.cardSubtitle}>
                  {[island.provinceName, island.cityName].filter(Boolean).join(' · ') || '지역 정보 없음'}
                </Text>
              </View>
              <LocateFixed color={colors.primary} size={20} />
            </View>
            <Text style={styles.description}>{island.description ?? '도서 기본정보를 확인할 수 있습니다.'}</Text>
          </Pressable>
        ))}
      </View>

      <IslandDetailModal island={selectedIsland} onClose={() => setSelectedIsland(null)} />
    </Screen>
  );
}

function IslandDetailModal({ island, onClose }: { island: IslandSummary | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" transparent visible={Boolean(island)} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>도서 상세정보</Text>
              <Text style={styles.modalTitle}>{island?.islandName}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalCloseButton}>
              <X color={colors.navy} size={20} />
            </Pressable>
          </View>

          <View style={styles.detailGrid}>
            <DetailItem label="지역" value={[island?.provinceName, island?.cityName].filter(Boolean).join(' · ')} />
            <DetailItem label="주소" value={island?.address} />
            <DetailItem label="위도" value={island?.latitude?.toFixed(4)} />
            <DetailItem label="경도" value={island?.longitude?.toFixed(4)} />
          </View>

          <Text style={styles.modalDescription}>{island?.description ?? '도서 상세 설명을 준비하고 있습니다.'}</Text>

          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" style={styles.primaryAction}>
              <Ship color={colors.surface} size={18} />
              <Text style={styles.primaryActionText}>시간표에서 보기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondaryAction}>
              <MapPin color={colors.primary} size={18} />
              <Text style={styles.secondaryActionText}>가까운 항로 찾기</Text>
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
      <Text style={styles.detailValue}>{value || '-'}</Text>
    </View>
  );
}

function getMarkerPosition(island: IslandSummary) {
  const latitude = island.latitude ?? MAP_BOUNDS.minLatitude;
  const longitude = island.longitude ?? MAP_BOUNDS.minLongitude;
  const x = ((longitude - MAP_BOUNDS.minLongitude) / (MAP_BOUNDS.maxLongitude - MAP_BOUNDS.minLongitude)) * 88 + 6;
  const y = (1 - (latitude - MAP_BOUNDS.minLatitude) / (MAP_BOUNDS.maxLatitude - MAP_BOUNDS.minLatitude)) * 82 + 8;

  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(90, Math.max(8, y))
  };
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
  sourceBadge: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  mapCanvas: {
    aspectRatio: 1.18,
    backgroundColor: '#dff5ff',
    overflow: 'hidden',
    position: 'relative'
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
  marker: {
    alignItems: 'center',
    gap: 4,
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
    maxHeight: '82%',
    padding: 18
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
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
  modalActions: {
    gap: 10
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900'
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  }
});
