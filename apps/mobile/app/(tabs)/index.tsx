import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CalendarDays, ChevronRight, Map, Search, Ship, Star } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';

const actions = [
  { label: '항로 검색', helper: '출발·도착 선택', icon: Search, color: colors.primary },
  { label: '시간표', helper: '오늘 출항 보기', icon: CalendarDays, color: colors.mint },
  { label: '운항 예보', helper: '내일 위험 확인', icon: Ship, color: colors.amber },
  { label: '즐겨찾기', helper: '관심 항로 관리', icon: Star, color: colors.coral }
];

export default function HomeScreen() {
  return (
    <Screen
      title="바다누리"
      subtitle="부기가 여객선 운항 정보를 안전하게 챙겨드릴게요."
      mascotSource={require('../../assets/mascot/boogi_bg1.png')}
    >
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <Image source={require('../../assets/mascot/boogi_bg1.png')} style={styles.avatar} resizeMode="contain" />
          <View>
            <Text style={styles.greeting}>안녕하세요</Text>
            <Text style={styles.identityText}>오늘의 바다길을 확인해요</Text>
          </View>
        </View>
        <Pressable style={styles.bellButton}>
          <Bell color={colors.primary} size={21} />
          <View style={styles.badge} />
        </Pressable>
      </View>

      <Pressable style={styles.searchBox}>
        <Search color={colors.primary} size={21} />
        <Text style={styles.searchText}>출발지와 도착지를 검색하세요</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>관심 항로</Text>
          <Text style={styles.heroTitle}>인천 → 백령도</Text>
          <View style={styles.heroStatus}>
            <StatusPill label="정상 운항" tone="good" />
            <Text style={styles.heroMeta}>08:30 출항 예정</Text>
          </View>
          <Text style={styles.heroCaption}>하모니플라워 · 평균 4시간 소요</Text>
        </View>
        <Image source={require('../../assets/mascot/boogi_bg2.png')} style={styles.mascot} resizeMode="contain" />
      </View>

      <View style={styles.actionGrid}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Pressable key={action.label} style={styles.actionTile}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
                <Icon color={action.color} size={24} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <Text style={styles.actionHelper}>{action.helper}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <InfoCard title="실시간 체크포인트" eyebrow="운항 상태">
        <View style={styles.checkRow}>
          <View style={styles.checkIcon}>
            <Ship color={colors.primary} size={20} />
          </View>
          <View style={styles.checkCopy}>
            <Text style={styles.checkTitle}>출항 전 확인 권장</Text>
            <Text style={styles.secondary}>기상 변화가 잦은 항로는 터미널 공지와 함께 확인하세요.</Text>
          </View>
          <ChevronRight color={colors.muted} size={20} />
        </View>
      </InfoCard>

      <InfoCard title="내일 운항 예보">
        <View style={styles.row}>
          <StatusPill label="주의" tone="warning" />
          <Text style={styles.riskText}>위험도 보통</Text>
        </View>
        <Text style={styles.secondary}>풍랑 가능성이 있습니다. 출발 전 운항 공지를 다시 확인하세요.</Text>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  avatar: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 48,
    width: 48
  },
  greeting: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700'
  },
  identityText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '900'
  },
  bellButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40
  },
  badge: {
    backgroundColor: colors.coral,
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 10
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    shadowColor: '#12324f',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2
  },
  searchText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700'
  },
  hero: {
    minHeight: 198,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 18
  },
  heroText: {
    flex: 1,
    gap: 9,
    justifyContent: 'center',
    zIndex: 1
  },
  heroEyebrow: {
    color: '#9be7ff',
    fontSize: 13,
    fontWeight: '900'
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34
  },
  heroStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  heroMeta: {
    color: '#d6ecff',
    fontSize: 13,
    fontWeight: '800'
  },
  heroCaption: {
    color: '#d6ecff',
    fontSize: 14,
    lineHeight: 20
  },
  mascot: {
    alignSelf: 'flex-end',
    height: 162,
    marginRight: -10,
    width: 126
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    minHeight: 118,
    padding: 14,
    width: '47.8%'
  },
  actionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  actionCopy: {
    gap: 3
  },
  actionLabel: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  actionHelper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  checkIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  checkCopy: {
    flex: 1,
    gap: 3
  },
  checkTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  riskText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  secondary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21
  }
});
