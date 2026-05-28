import { fetchRealtimeTraffic } from '@/api/routes';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';
import type { RealtimeTrafficSummary } from '@badagil/shared';
import { useQuery } from '@tanstack/react-query';
import { Activity, Anchor, Gauge, Grid3X3, RefreshCw, Ship, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const congestionLabel = {
  LOW: '여유',
  MEDIUM: '보통',
  HIGH: '혼잡',
  UNKNOWN: '확인 필요'
} as const;

const congestionTone = {
  LOW: 'good',
  MEDIUM: 'warning',
  HIGH: 'danger',
  UNKNOWN: 'neutral'
} as const;

export default function RoutesScreen() {
  const [selectedTraffic, setSelectedTraffic] = useState<RealtimeTrafficSummary | null>(null);
  const trafficQuery = useQuery({
    queryKey: ['realtime-traffic'],
    queryFn: fetchRealtimeTraffic,
    retry: false,
    staleTime: 60 * 1000
  });

  const trafficItems = trafficQuery.data ?? [];
  const summary = useMemo(() => {
    const activeGrids = trafficItems.length;
    const totalTraffic = trafficItems.reduce((sum, item) => sum + (item.vesselTrafficCount ?? 0), 0);
    const highDensity = trafficItems.filter((item) => item.congestionLevel === 'HIGH').length;

    return { activeGrids, totalTraffic, highDensity };
  }, [trafficItems]);

  return (
    <Screen
      title="항로"
      subtitle="현재 해역 교통량과 밀집도를 기준으로 운항 상황을 확인합니다."
      mascotSource={require('../../assets/mascot/boogi_bg3.png')}
    >
      <MascotBanner
        eyebrow="실시간 교통정보"
        title="지금 바다 위 흐름을 확인해요"
        description="한국해양교통안전공단 실시간 교통정보의 격자별 통항량과 밀도를 기준으로 현재 해역 혼잡도를 보여줍니다."
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        tone="mint"
      />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Grid3X3 color={colors.primary} size={22} />
          <Text style={styles.summaryLabel}>관측 격자</Text>
          <Text style={styles.summaryValue}>{summary.activeGrids}곳</Text>
        </View>
        <View style={styles.summaryItem}>
          <Ship color={colors.mint} size={22} />
          <Text style={styles.summaryLabel}>통항량</Text>
          <Text style={styles.summaryValue}>{summary.totalTraffic.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Gauge color={colors.warning} size={22} />
          <Text style={styles.summaryLabel}>혼잡</Text>
          <Text style={styles.summaryValue}>{summary.highDensity}곳</Text>
        </View>
      </View>

      <InfoCard title="현재 해역 교통정보" eyebrow="실시간 조회">
        {trafficQuery.isFetching ? <Message text="실시간 교통정보를 불러오는 중입니다." /> : null}
        {trafficQuery.isError ? <Message text="실시간 교통정보를 불러오지 못했습니다. API 서버 상태를 확인해 주세요." /> : null}
        {trafficItems.length === 0 && !trafficQuery.isFetching ? <Message text="현재 표시할 교통정보가 없습니다." /> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trafficStrip}>
          {trafficItems.slice(0, 20).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => setSelectedTraffic(item)}
              style={styles.trafficCard}
            >
              <View style={styles.trafficIcon}>
                <Activity color={colors.primary} size={20} />
              </View>
              <Text style={styles.gridId} numberOfLines={1}>
                {item.gridId}
              </Text>
              <Text style={styles.density}>{formatDensity(item.density)}</Text>
              <StatusPill label={congestionLabel[item.congestionLevel]} tone={congestionTone[item.congestionLevel]} />
            </Pressable>
          ))}
        </ScrollView>
      </InfoCard>

      <InfoCard title="조회 기준">
        <View style={styles.shipRow}>
          <Anchor color={colors.primary} size={20} />
          <Text style={styles.secondary}>
            실시간 교통정보는 특정 선박 위치가 아니라 해역 격자별 통항량과 밀도 지표입니다. 혼잡도가 높은 격자를 먼저 정렬해 보여줍니다.
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => trafficQuery.refetch()} style={styles.refreshButton}>
          {trafficQuery.isFetching ? <ActivityIndicator color={colors.surface} /> : <RefreshCw color={colors.surface} size={18} />}
          <Text style={styles.refreshButtonText}>다시 조회</Text>
        </Pressable>
      </InfoCard>

      <TrafficDetailModal traffic={selectedTraffic} onClose={() => setSelectedTraffic(null)} />
    </Screen>
  );
}

function TrafficDetailModal({ traffic, onClose }: { traffic: RealtimeTrafficSummary | null; onClose: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={traffic !== null} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>교통정보 상세</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconButton}>
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>
          {traffic ? (
            <View style={styles.detailStack}>
              <DetailLine label="격자 ID" value={traffic.gridId} />
              <DetailLine label="통항량" value={traffic.vesselTrafficCount?.toLocaleString() ?? '확인 필요'} />
              <DetailLine label="밀도" value={formatDensity(traffic.density)} />
              <DetailLine label="혼잡도" value={congestionLabel[traffic.congestionLevel]} />
              <DetailLine label="조회 시각" value={formatObservedAt(traffic.observedAt)} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Message({ text }: { text: string }) {
  return <Text style={styles.message}>{text}</Text>;
}

function formatDensity(value: number | null) {
  return value === null ? '밀도 확인 필요' : `${value.toFixed(1)}%`;
}

function formatObservedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    gap: 10
  },
  summaryItem: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    minHeight: 104,
    padding: 13
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  summaryValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  trafficStrip: {
    gap: 10,
    paddingRight: 8
  },
  trafficCard: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 152,
    padding: 12,
    width: 150
  },
  trafficIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  gridId: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  density: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '900'
  },
  shipRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  secondary: {
    color: colors.muted,
    flex: 1,
    fontSize: 14,
    lineHeight: 21
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46
  },
  refreshButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900'
  },
  message: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    padding: 12
  },
  modalBackdrop: {
    backgroundColor: 'rgba(16, 42, 67, 0.38)',
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14
  },
  modalPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: 14,
    padding: 16
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  detailStack: {
    gap: 10
  },
  detailLine: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    gap: 5,
    padding: 12
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  detailValue: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21
  }
});
