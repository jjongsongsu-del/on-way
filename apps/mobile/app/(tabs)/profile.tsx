import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StyleSheet, Text, View } from 'react-native';

const favorites = ['인천 -> 백령도', '하모니플라워호', '인천항 국제여객터미널'];

export default function ProfileScreen() {
  return (
    <Screen title="내 정보" subtitle="즐겨찾기와 알림 설정을 관리합니다.">
      <InfoCard title="즐겨찾기">
        {favorites.map((favorite) => (
          <View key={favorite} style={styles.favoriteRow}>
            <Text style={styles.favorite}>{favorite}</Text>
          </View>
        ))}
      </InfoCard>

      <InfoCard title="알림 설정">
        <Text style={styles.secondary}>출항 1시간 전</Text>
        <Text style={styles.secondary}>결항/통제 즉시</Text>
        <Text style={styles.secondary}>내일 예보 갱신 시</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  favoriteRow: {
    borderBottomColor: '#edf2f7',
    borderBottomWidth: 1,
    paddingVertical: 8
  },
  favorite: {
    color: '#102a43',
    fontSize: 15,
    fontWeight: '700'
  },
  secondary: {
    color: '#52616f',
    fontSize: 14,
    lineHeight: 21
  }
});

