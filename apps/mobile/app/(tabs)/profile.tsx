import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Bell, CalendarDays, ChevronRight, MapPin, Ship, Star, Waves } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { useAppSelectionContext } from '@/state/app-selection-context';
import { buildInterestAlerts, type InterestAlert } from '@/state/interest-alerts';
import { colors } from '@/theme/colors';

export default function ProfileScreen() {
  const appContext = useAppSelectionContext();
  const alerts = useMemo(() => buildInterestAlerts(appContext), [appContext]);
  const activeRoute = appContext.route;
  const activeIsland = appContext.island;

  return (
    <Screen
      title="내정보"
      subtitle="즐겨찾기, 관심 항로, 알림 기준을 관리합니다."
      mascotSource={require('../../assets/mascot/boogi_bg5.png')}
    >
      <MascotBanner
        eyebrow="관심 알림"
        title="바다누리가 자주 보는 항로를 먼저 챙겨드릴게요"
        description="시간표 즐겨찾기와 최근 선택한 섬, 항로를 기준으로 홈과 예보, 섬여행 화면을 이어서 보여줍니다."
        imageSource={require('../../assets/mascot/boogi-profile.png')}
        tone="coral"
      />

      <InfoCard title="관심 항로 알림 센터" eyebrow={`${alerts.length}건`}>
        <View style={styles.alertList}>
          {alerts.map((alert) => (
            <View key={alert.id} style={styles.alertRow}>
              <View style={[styles.alertIcon, { backgroundColor: `${alertToneColor(alert.tone)}18` }]}>
                {alert.category === 'trip' ? (
                  <MapPin color={alertToneColor(alert.tone)} size={18} />
                ) : alert.category === 'forecast' ? (
                  <Waves color={alertToneColor(alert.tone)} size={18} />
                ) : (
                  <Ship color={alertToneColor(alert.tone)} size={18} />
                )}
              </View>
              <View style={styles.alertCopy}>
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertTitle} numberOfLines={2}>
                    {alert.title}
                  </Text>
                  <Text style={[styles.alertCategory, { color: alertToneColor(alert.tone) }]}>{categoryLabel(alert.category)}</Text>
                </View>
                <Text style={styles.secondary}>{alert.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </InfoCard>

      <InfoCard title="현재 이어보기" eyebrow="앱 공통 선택">
        <View style={styles.contextGrid}>
          <View style={styles.contextPanel}>
            <View style={styles.contextHeader}>
              <Ship color={colors.primary} size={19} />
              <Text style={styles.contextTitle}>선택 항로</Text>
            </View>
            <Text style={styles.contextValue}>
              {activeRoute ? `${activeRoute.departure} -> ${activeRoute.arrival}` : '아직 선택한 항로가 없습니다'}
            </Text>
            <Text style={styles.secondary} numberOfLines={2}>
              {activeRoute ? [activeRoute.departureTime, activeRoute.vesselName, relativeTime(activeRoute.selectedAt)].filter(Boolean).join(' · ') : '시간표에서 항로를 선택하면 홈과 예보가 자동으로 연결됩니다.'}
            </Text>
          </View>

          <View style={styles.contextPanel}>
            <View style={styles.contextHeader}>
              <MapPin color={colors.mint} size={19} />
              <Text style={styles.contextTitle}>선택 섬</Text>
            </View>
            <Text style={styles.contextValue}>{activeIsland?.islandName ?? '아직 선택한 섬이 없습니다'}</Text>
            <Text style={styles.secondary} numberOfLines={2}>
              {activeIsland ? [activeIsland.provinceName, activeIsland.cityName, relativeTime(activeIsland.selectedAt)].filter(Boolean).join(' · ') : '섬여행이나 섬지도에서 섬을 선택하면 상세와 예보가 이어집니다.'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Link href="/schedule" asChild>
            <Pressable style={styles.actionButton}>
              <CalendarDays color={colors.primary} size={16} />
              <Text style={styles.actionText}>시간표</Text>
            </Pressable>
          </Link>
          <Link href="/forecast" asChild>
            <Pressable style={styles.actionButton}>
              <Waves color={colors.primary} size={16} />
              <Text style={styles.actionText}>예보</Text>
            </Pressable>
          </Link>
        </View>
      </InfoCard>

      <InfoCard title="알림 기준" eyebrow="관심 항로">
        <View style={styles.ruleList}>
          <RuleRow icon={<Bell color={colors.primary} size={18} />} title="출항 전 확인" description="즐겨찾기 항로는 출항 전 운항상태와 예보를 함께 확인합니다." />
          <RuleRow icon={<Ship color={colors.danger} size={18} />} title="결항/통제 우선" description="결항, 통제, 지연처럼 이동에 직접 영향을 주는 상태를 가장 먼저 보여줍니다." />
          <RuleRow icon={<Waves color={colors.warning} size={18} />} title="예보 위험 상승" description="풍속, 파고, 특보 신호가 나빠지면 홈과 예보 화면에서 주의 표시를 강화합니다." />
          <RuleRow icon={<Star color={colors.mint} size={18} />} title="즐겨찾기 우선순위" description="시간표의 즐겨찾기 순서가 홈 관심 알림의 표시 순서에 반영됩니다." />
        </View>
      </InfoCard>
    </Screen>
  );
}

function RuleRow({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIcon}>{icon}</View>
      <View style={styles.ruleCopy}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.secondary}>{description}</Text>
      </View>
    </View>
  );
}

function categoryLabel(category: InterestAlert['category']) {
  if (category === 'forecast') return '예보';
  if (category === 'trip') return '섬여행';
  return '항로';
}

function alertToneColor(tone: InterestAlert['tone']) {
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'good') return colors.mint;
  return colors.primary;
}

function relativeTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}/${date.getDate()} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')} 선택`;
}

const styles = StyleSheet.create({
  alertList: {
    gap: 10
  },
  alertRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11
  },
  alertIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  alertCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  alertTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  alertTitle: {
    color: colors.navy,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20
  },
  alertCategory: {
    fontSize: 11,
    fontWeight: '900',
    paddingTop: 2
  },
  contextGrid: {
    gap: 10
  },
  contextPanel: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 12
  },
  contextHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  contextTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  contextValue: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 128
  },
  actionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  ruleList: {
    gap: 10
  },
  ruleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10
  },
  ruleIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  ruleCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  ruleTitle: {
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
