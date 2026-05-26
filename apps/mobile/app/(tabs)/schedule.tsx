import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { StyleSheet, Text, View } from 'react-native';

const schedules = [
  { time: '08:30', vessel: '하모니플라워호', status: '정상운항', tone: 'good' as const },
  { time: '13:00', vessel: '코리아프라이드호', status: '운항예정', tone: 'neutral' as const },
  { time: '17:30', vessel: '백령아일랜드호', status: '통제', tone: 'danger' as const }
];

export default function ScheduleScreen() {
  return (
    <Screen title="시간표" subtitle="날짜별 출항시간과 선박별 운항상태를 확인합니다.">
      <InfoCard title="2026.05.26 인천 -> 백령도">
        {schedules.map((item) => (
          <View key={`${item.time}-${item.vessel}`} style={styles.item}>
            <View>
              <Text style={styles.time}>{item.time}</Text>
              <Text style={styles.vessel}>{item.vessel}</Text>
            </View>
            <StatusPill label={item.status} tone={item.tone} />
          </View>
        ))}
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8
  },
  time: {
    color: '#102a43',
    fontSize: 20,
    fontWeight: '800'
  },
  vessel: {
    color: '#52616f',
    fontSize: 14,
    marginTop: 4
  }
});

