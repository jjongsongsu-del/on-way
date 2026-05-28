import { StyleSheet, Text, View } from 'react-native';
import { Bell, ChevronRight, Star } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

const favorites = ['인천 → 백령도', '하모니플라워', '인천항 국제여객터미널'];

export default function ProfileScreen() {
  return (
    <Screen
      title="내정보"
      subtitle="즐겨찾기와 알림 설정을 관리합니다."
      mascotSource={require('../../assets/mascot/boogi_bg5.png')}
    >
      <MascotBanner
        eyebrow="내정보"
        title="관심 항로 알림은 부기가 챙겨둘게요"
        description="즐겨찾기, 출항 전 알림, 예보 갱신 소식을 한곳에서 관리할 수 있습니다."
        imageSource={require('../../assets/mascot/boogi-profile.png')}
        tone="coral"
      />

      <InfoCard title="즐겨찾기">
        {favorites.map((favorite) => (
          <View key={favorite} style={styles.favoriteRow}>
            <View style={styles.favoriteTitle}>
              <Star color={colors.primary} size={18} />
              <Text style={styles.favorite}>{favorite}</Text>
            </View>
            <ChevronRight color={colors.muted} size={18} />
          </View>
        ))}
      </InfoCard>

      <InfoCard title="알림 설정">
        <View style={styles.settingRow}>
          <Bell color={colors.primary} size={19} />
          <Text style={styles.secondary}>출항 1시간 전</Text>
        </View>
        <Text style={styles.secondary}>결항/통제 즉시</Text>
        <Text style={styles.secondary}>내일 예보 갱신 시</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  favoriteRow: {
    alignItems: 'center',
    borderBottomColor: '#edf2f7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  favoriteTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  favorite: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '800'
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  secondary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  }
});
