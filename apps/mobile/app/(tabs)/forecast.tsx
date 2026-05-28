import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';
import { CloudSun, Waves, Wind } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

export default function ForecastScreen() {
  return (
    <Screen
      title="예보"
      subtitle="내일의 운항 가능성을 항로별로 미리 확인합니다."
      mascotSource={require('../../assets/mascot/boogi_bg4.png')}
    >
      <MascotBanner
        eyebrow="운항 예보"
        title="바람과 파도 흐름을 부기가 먼저 살펴볼게요"
        description="주의가 필요한 항로를 빠르게 확인하고 출발 전 다시 점검할 수 있게 도와드립니다."
        imageSource={require('../../assets/mascot/boogi-forecast.png')}
        tone="amber"
      />

      <View style={styles.weatherCard}>
        <View style={styles.weatherIcon}>
          <CloudSun color={colors.primary} size={28} />
        </View>
        <View style={styles.weatherCopy}>
          <Text style={styles.weatherTitle}>서해 중부 앞바다</Text>
          <Text style={styles.weatherText}>바람과 파고가 오후부터 높아질 수 있어요.</Text>
        </View>
      </View>

      <InfoCard title="인천 → 백령도" eyebrow="내일 운항 예보">
        <View style={styles.row}>
          <StatusPill label="주의" tone="warning" />
          <Text style={styles.risk}>위험도 보통</Text>
        </View>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Wind color={colors.amber} size={18} />
            <Text style={styles.metricLabel}>바람</Text>
            <Text style={styles.metricValue}>강함</Text>
          </View>
          <View style={styles.metric}>
            <Waves color={colors.primary} size={18} />
            <Text style={styles.metricLabel}>파고</Text>
            <Text style={styles.metricValue}>주의</Text>
          </View>
        </View>
        <Text style={styles.secondary}>풍랑 또는 시정 악화 가능성이 있어 출발 전 상황 확인이 필요합니다.</Text>
      </InfoCard>

      <InfoCard title="인천 → 덕적도" eyebrow="내일 운항 예보">
        <StatusPill label="운항 가능" tone="good" />
        <Text style={styles.secondary}>현재 예보 기준으로 운항 가능성이 높습니다.</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weatherCard: {
    alignItems: 'center',
    backgroundColor: colors.surfaceBlue,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 14,
    padding: 16
  },
  weatherIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    width: 54
  },
  weatherCopy: {
    flex: 1,
    gap: 4
  },
  weatherTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  weatherText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  risk: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 10
  },
  metric: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    flex: 1,
    gap: 4,
    padding: 12
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  metricValue: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  secondary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  }
});
