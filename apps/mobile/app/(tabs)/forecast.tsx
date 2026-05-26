import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { StyleSheet, Text, View } from 'react-native';

export default function ForecastScreen() {
  return (
    <Screen title="예보" subtitle="내일의 운항 가능성을 확정 정보가 아닌 가능성 중심으로 안내합니다.">
      <InfoCard title="인천 -> 백령도" eyebrow="내일의 운항예보">
        <View style={styles.row}>
          <StatusPill label="주의" tone="warning" />
          <Text style={styles.risk}>여행 위험도 보통</Text>
        </View>
        <Text style={styles.secondary}>풍랑 또는 시정 악화 가능성이 있어 출발 전 재확인이 필요합니다.</Text>
      </InfoCard>

      <InfoCard title="인천 -> 덕적도" eyebrow="내일의 운항예보">
        <StatusPill label="운항 가능" tone="good" />
        <Text style={styles.secondary}>현재 예보 기준으로 운항 가능성이 높습니다.</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  risk: {
    color: '#102a43',
    fontSize: 14,
    fontWeight: '800'
  },
  secondary: {
    color: '#52616f',
    fontSize: 14,
    lineHeight: 21
  }
});

