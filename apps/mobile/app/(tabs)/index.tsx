import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { Text, View, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <Screen
      title="오늘 배 뜨나요?"
      subtitle="출발지와 도착지를 기준으로 오늘 운항상태, 다음 출항, 내일 예보를 한 번에 확인합니다."
    >
      <InfoCard title="인천 -> 백령도" eyebrow="관심 항로 예시">
        <View style={styles.row}>
          <Text style={styles.label}>오늘 운항상태</Text>
          <StatusPill label="정상운항" tone="good" />
        </View>
        <View style={styles.divider} />
        <Text style={styles.primary}>08:30 하모니플라워호</Text>
        <Text style={styles.secondary}>인천항 출발 to 백령도 도착 예정</Text>
      </InfoCard>

      <InfoCard title="내일 운항예보">
        <StatusPill label="주의" tone="warning" />
        <Text style={styles.secondary}>기상 영향 가능성이 있습니다. 출발 전 터미널 공지를 다시 확인하세요.</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  label: {
    color: '#52616f',
    fontSize: 14,
    fontWeight: '700'
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7'
  },
  primary: {
    color: '#102a43',
    fontSize: 22,
    fontWeight: '800'
  },
  secondary: {
    color: '#52616f',
    fontSize: 14,
    lineHeight: 21
  }
});
