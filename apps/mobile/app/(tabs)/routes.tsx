import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StyleSheet, Text, View } from 'react-native';

const stops = ['인천항', '소청도', '대청도', '백령도'];

export default function RoutesScreen() {
  return (
    <Screen title="항로" subtitle="기항지 순서와 운항 선박을 대중교통 노선처럼 확인합니다.">
      <InfoCard title="인천 - 백령 항로">
        <View style={styles.timeline}>
          {stops.map((stop, index) => (
            <View key={stop} style={styles.stopRow}>
              <View style={styles.marker}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
              <Text style={styles.stopName}>{stop}</Text>
            </View>
          ))}
        </View>
      </InfoCard>

      <InfoCard title="운항 선박">
        <Text style={styles.secondary}>하모니플라워호, 코리아프라이드호</Text>
        <Text style={styles.secondary}>평균 소요시간 약 4시간</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  timeline: {
    gap: 12
  },
  stopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  marker: {
    alignItems: 'center',
    backgroundColor: '#dff6f8',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  markerText: {
    color: '#0b7285',
    fontWeight: '900'
  },
  stopName: {
    color: '#102a43',
    fontSize: 16,
    fontWeight: '800'
  },
  secondary: {
    color: '#52616f',
    fontSize: 14,
    lineHeight: 21
  }
});

