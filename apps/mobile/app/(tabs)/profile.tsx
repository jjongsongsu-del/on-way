import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Bell, CalendarDays, Check, ChevronRight, Mail, MapPin, ShieldCheck, Ship, Star, Trash2, Waves, X } from 'lucide-react-native';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { fetchMarineForecast } from '@/api/forecasts';
import { fetchScheduleCandidates } from '@/api/schedules';
import {
  clearReadNotifications,
  generateConditionNotifications,
  generateDataNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
  updateNotificationSettings,
  useAppNotificationSettings,
  useAppNotifications,
  type AppNotification,
  type AppNotificationCategory,
  type AppNotificationSettings,
  type AppNotificationSeverity
} from '@/state/app-notifications';
import { useAppSelectionContext } from '@/state/app-selection-context';
import { colors } from '@/theme/colors';

type NotificationFilter = 'all' | 'unread' | AppNotificationCategory;
type ProfilePanel = 'settings' | 'context' | 'rules';

const notificationFilters: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'unread', label: '읽지 않음' },
  { value: 'route', label: '운항' },
  { value: 'forecast', label: '예보' },
  { value: 'trip', label: '여행' },
  { value: 'safety', label: '안전' }
];

export default function ProfileScreen() {
  const appContext = useAppSelectionContext();
  const notificationSnapshot = useAppNotifications();
  const notificationSettings = useAppNotificationSettings();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<ProfilePanel | null>(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const unreadCount = getUnreadNotificationCount(notificationSnapshot.items);
  const activeRoute = appContext.route;
  const activeIsland = appContext.island;
  const enabledRuleCount = [
    notificationSettings.selectedRouteRuleEnabled,
    notificationSettings.favoriteRouteRuleEnabled,
    notificationSettings.forecastRouteRuleEnabled,
    notificationSettings.recentRouteRuleEnabled
  ].filter(Boolean).length;
  const filteredNotifications = useMemo(
    () => filterNotifications(notificationSnapshot.items, activeFilter),
    [activeFilter, notificationSnapshot.items]
  );
  const visibleNotifications = showAllNotifications ? filteredNotifications : filteredNotifications.slice(0, 5);

  const createNotifications = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      generateConditionNotifications(appContext);
      await generateDataNotifications(appContext, {
        fetchScheduleCandidates,
        fetchMarineForecast
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openNotificationDetail = (notification: AppNotification) => {
    markNotificationRead(notification.id);
    setSelectedNotification({
      ...notification,
      readAt: notification.readAt ?? new Date().toISOString()
    });
  };

  const togglePanel = (panel: ProfilePanel) => {
    setExpandedPanel((current) => (current === panel ? null : panel));
  };

  return (
    <Screen
      title="내정보"
      subtitle="내 항로, 관심 섬, 조건 기반 알림을 한곳에서 관리합니다."
      mascotSource={require('../../assets/mascot/boogi_bg5.png')}
    >
      <MascotBanner
        eyebrow="알림 센터"
        title="섬여행 전에 확인할 일을 놓치지 않게 챙길게요"
        description="즐겨찾기 항로, 최근 선택한 섬, 운항 예보 조건을 바탕으로 앱 내부 알림을 생성합니다."
        imageSource={require('../../assets/mascot/boogi-profile.png')}
        tone="coral"
      />

      <InfoCard title="알림함" eyebrow={`${unreadCount}개 읽지 않음`}>
        <View style={styles.notificationToolbar}>
          <Pressable accessibilityRole="button" disabled={isGenerating} onPress={createNotifications} style={[styles.primaryActionButton, isGenerating ? styles.disabledButton : null]}>
            {isGenerating ? <ActivityIndicator color={colors.surface} size="small" /> : <Bell color={colors.surface} size={16} />}
            <Text style={styles.primaryActionText}>{isGenerating ? '확인 중' : '알림 생성'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={markAllNotificationsRead} style={styles.secondaryActionButton}>
            <Check color={colors.primary} size={15} />
            <Text style={styles.secondaryActionText}>모두 읽음</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={clearReadNotifications} style={styles.iconActionButton}>
            <Trash2 color={colors.muted} size={16} />
          </Pressable>
        </View>

        <View style={styles.filterWrap}>
          {notificationFilters.map((filter) => {
            const selected = activeFilter === filter.value;
            const count = countByFilter(notificationSnapshot.items, filter.value);

            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                onPress={() => setActiveFilter(filter.value)}
                style={[styles.filterChip, selected ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                  {filter.label} {count}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.alertList}>
          {visibleNotifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} onOpenDetail={openNotificationDetail} />
          ))}
          {filteredNotifications.length > 5 ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAllNotifications((value) => !value)} style={styles.listMoreButton}>
              <Text style={styles.listMoreButtonText}>
                {showAllNotifications ? '알림 접기' : `전체 알림 ${filteredNotifications.length}개 보기`}
              </Text>
              <ChevronRight color={colors.primary} size={16} style={showAllNotifications ? styles.collapseIconOpen : null} />
            </Pressable>
          ) : null}
          {filteredNotifications.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Bell color={colors.muted} size={22} />
              <Text style={styles.emptyTitle}>표시할 알림이 없습니다</Text>
              <Text style={styles.secondary}>알림 생성을 누르면 현재 항로와 관심 섬 기준으로 새 알림을 만들 수 있습니다.</Text>
            </View>
          ) : null}
        </View>
      </InfoCard>

      <CollapsibleCard
        title="알림 설정"
        eyebrow="조건 조정"
        expanded={expandedPanel === 'settings'}
        onToggle={() => togglePanel('settings')}
        summary={`${notificationSettings.importantOnly ? '주의 알림만' : '전체 알림'} · 출항 ${leadLabel(notificationSettings.departureLeadMinutes)}`}
      >
        <View style={styles.settingList}>
          <SettingToggle
            title="운항 알림"
            description="선택 항로와 즐겨찾기 항로의 운항 확인 알림을 생성합니다."
            value={notificationSettings.routeAlertsEnabled}
            onChange={(value) => updateNotificationSettings({ routeAlertsEnabled: value })}
          />
          <SettingToggle
            title="예보 알림"
            description="도착 섬이나 항구 기준의 예보 확인 알림을 생성합니다."
            value={notificationSettings.forecastAlertsEnabled}
            onChange={(value) => updateNotificationSettings({ forecastAlertsEnabled: value })}
          />
          <SettingToggle
            title="여행 알림"
            description="최근 조회 항로와 여행 이어보기 알림을 생성합니다."
            value={notificationSettings.tripAlertsEnabled}
            onChange={(value) => updateNotificationSettings({ tripAlertsEnabled: value })}
          />
          <SettingToggle
            title="안전 알림"
            description="관심 섬의 안전정보와 여행 전 체크 알림을 생성합니다."
            value={notificationSettings.safetyAlertsEnabled}
            onChange={(value) => updateNotificationSettings({ safetyAlertsEnabled: value })}
          />
          <View style={styles.settingDivider} />
          <SettingToggle
            title="즐겨찾기 항로만"
            description="즐겨찾기에 저장한 항로 위주로 알림을 제한합니다."
            value={notificationSettings.favoriteRoutesOnly}
            onChange={(value) => updateNotificationSettings({ favoriteRoutesOnly: value })}
          />
          <SettingToggle
            title="주의 알림만"
            description="주의 또는 위험 수준 알림만 알림함에 생성합니다."
            value={notificationSettings.importantOnly}
            onChange={(value) => updateNotificationSettings({ importantOnly: value })}
          />
          <SettingToggle
            title="읽은 알림 자동 정리"
            description="새 알림을 생성할 때 읽은 알림을 자동으로 정리합니다."
            value={notificationSettings.autoClearReadOnGenerate}
            onChange={(value) => updateNotificationSettings({ autoClearReadOnGenerate: value })}
          />
          <View style={styles.settingBlock}>
            <Text style={styles.settingTitle}>출항 전 알림 기준</Text>
            <Text style={styles.secondary}>운항 알림 문구에 표시할 출항 전 확인 시간을 선택합니다.</Text>
            <View style={styles.leadOptionRow}>
              {[30, 60, 180].map((minutes) => {
                const value = minutes as AppNotificationSettings['departureLeadMinutes'];
                const selected = notificationSettings.departureLeadMinutes === value;

                return (
                  <Pressable
                    key={minutes}
                    accessibilityRole="button"
                    onPress={() => updateNotificationSettings({ departureLeadMinutes: value })}
                    style={[styles.leadOption, selected ? styles.leadOptionActive : null]}
                  >
                    <Text style={[styles.leadOptionText, selected ? styles.leadOptionTextActive : null]}>{leadLabel(value)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </CollapsibleCard>

      <CollapsibleCard
        title="현재 이어보기"
        eyebrow="공통 선택 정보"
        expanded={expandedPanel === 'context'}
        onToggle={() => togglePanel('context')}
        summary={activeRoute ? `${activeRoute.departure} -> ${activeRoute.arrival}` : activeIsland?.islandName ?? '선택 정보 없음'}
      >
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
              {activeRoute
                ? [activeRoute.departureTime, activeRoute.vesselName, relativeTime(activeRoute.selectedAt)].filter(Boolean).join(' · ')
                : '시간표에서 항로를 선택하면 예보와 섬여행 화면으로 이어집니다.'}
            </Text>
          </View>

          <View style={styles.contextPanel}>
            <View style={styles.contextHeader}>
              <MapPin color={colors.mint} size={19} />
              <Text style={styles.contextTitle}>선택 섬</Text>
            </View>
            <Text style={styles.contextValue}>{activeIsland?.islandName ?? '아직 선택한 섬이 없습니다'}</Text>
            <Text style={styles.secondary} numberOfLines={2}>
              {activeIsland
                ? [activeIsland.provinceName, activeIsland.cityName, relativeTime(activeIsland.selectedAt)].filter(Boolean).join(' · ')
                : '섬여행이나 섬지도에서 섬을 선택하면 안전정보와 예보가 이어집니다.'}
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
      </CollapsibleCard>

      <CollapsibleCard
        title="조건 기반 알림 규칙"
        eyebrow={`${enabledRuleCount}/4 사용`}
        expanded={expandedPanel === 'rules'}
        onToggle={() => togglePanel('rules')}
        summary="선택 항로, 즐겨찾기, 예보 연결, 최근 조회 규칙을 관리합니다."
      >
        <View style={styles.ruleList}>
          <RuleRow
            icon={Bell}
            tone="info"
            title="선택 항로 알림"
            description="현재 선택한 출발지와 도착지, 선박명을 기준으로 운항 확인 알림을 생성합니다."
            value={notificationSettings.selectedRouteRuleEnabled}
            onChange={(value) => updateNotificationSettings({ selectedRouteRuleEnabled: value })}
          />
          <RuleRow
            icon={Ship}
            tone="danger"
            title="즐겨찾기 우선순위"
            description="시간표 즐겨찾기 항로는 결항, 통제, 예보 악화 확인 대상으로 우선 표시합니다."
            value={notificationSettings.favoriteRouteRuleEnabled}
            onChange={(value) => updateNotificationSettings({ favoriteRouteRuleEnabled: value })}
          />
          <RuleRow
            icon={Waves}
            tone="warning"
            title="예보 연결"
            description="선택한 도착 섬 또는 항구를 기준으로 예보 확인 알림을 함께 생성합니다."
            value={notificationSettings.forecastRouteRuleEnabled}
            onChange={(value) => updateNotificationSettings({ forecastRouteRuleEnabled: value })}
          />
          <RuleRow
            icon={Star}
            tone="good"
            title="최근 조회 활용"
            description="최근 조회한 항로는 다시 검색하거나 즐겨찾기로 전환할 수 있게 여행 알림으로 보여줍니다."
            value={notificationSettings.recentRouteRuleEnabled}
            onChange={(value) => updateNotificationSettings({ recentRouteRuleEnabled: value })}
          />
        </View>
      </CollapsibleCard>

      <InfoCard title="서비스 안내" eyebrow="정책 및 문의">
        <View style={styles.serviceGuideList}>
          <Pressable accessibilityRole="button" onPress={() => setPrivacyModalVisible(true)} style={styles.serviceGuideRow}>
            <View style={styles.serviceGuideIcon}>
              <ShieldCheck color={colors.primary} size={20} />
            </View>
            <View style={styles.serviceGuideCopy}>
              <Text style={styles.serviceGuideTitle}>개인정보처리방침</Text>
              <Text style={styles.secondary}>섬똑이 어떤 정보를 사용하고 어떻게 보관하는지 확인합니다.</Text>
            </View>
            <ChevronRight color={colors.primary} size={18} />
          </Pressable>
          <View style={styles.serviceGuideRowStatic}>
            <View style={styles.serviceGuideIcon}>
              <Mail color={colors.primary} size={20} />
            </View>
            <View style={styles.serviceGuideCopy}>
              <Text style={styles.serviceGuideTitle}>서비스 문의</Text>
              <Text style={styles.secondary}>dottoril.ee@gmail.com</Text>
            </View>
          </View>
        </View>
      </InfoCard>

      <NotificationDetailModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      <PrivacyPolicyModal visible={privacyModalVisible} onClose={() => setPrivacyModalVisible(false)} />
    </Screen>
  );
}

function CollapsibleCard({
  title,
  eyebrow,
  expanded,
  onToggle,
  summary,
  children
}: {
  title: string;
  eyebrow: string;
  expanded: boolean;
  onToggle: () => void;
  summary: string;
  children: ReactNode;
}) {
  return (
    <InfoCard title={title} eyebrow={eyebrow}>
      <Pressable accessibilityRole="button" onPress={onToggle} style={styles.collapseHeader}>
        <View style={styles.collapseCopy}>
          <Text style={styles.collapseSummary} numberOfLines={2}>
            {summary}
          </Text>
        </View>
        <View style={styles.collapseAction}>
          <Text style={styles.collapseActionText}>{expanded ? '접기' : '펼치기'}</Text>
          <ChevronRight color={colors.primary} size={16} style={expanded ? styles.collapseIconOpen : null} />
        </View>
      </Pressable>
      {expanded ? <View style={styles.collapsibleBody}>{children}</View> : null}
    </InfoCard>
  );
}

function SettingToggle({
  title,
  description,
  value,
  onChange
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.secondary}>{description}</Text>
      </View>
      <View style={[styles.toggleTrack, value ? styles.toggleTrackActive : null]}>
        <View style={[styles.toggleThumb, value ? styles.toggleThumbActive : null]} />
      </View>
    </Pressable>
  );
}

function NotificationRow({ notification, onOpenDetail }: { notification: AppNotification; onOpenDetail: (notification: AppNotification) => void }) {
  const unread = !notification.readAt;
  const Icon = notificationIcon(notification.category);
  const href = notificationHref(notification);

  return (
    <View style={[styles.alertRow, unread ? styles.alertRowUnread : null]}>
      <View style={[styles.alertIcon, { backgroundColor: `${severityColor(notification.severity)}18` }]}>
        <Icon color={severityColor(notification.severity)} size={18} />
      </View>
      <View style={styles.alertCopy}>
        <View style={styles.alertTitleRow}>
          <Text style={styles.alertTitle} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={[styles.alertCategory, { color: severityColor(notification.severity) }]}>
            {categoryLabel(notification.category)}
          </Text>
        </View>
        <Text style={styles.secondary}>{notification.message}</Text>
        <View style={styles.notificationMetaRow}>
          <Text style={styles.notificationTime}>{relativeTime(notification.createdAt) ?? '방금 생성'}</Text>
          {unread ? <Text style={styles.unreadBadge}>새 알림</Text> : <Text style={styles.readBadge}>읽음</Text>}
        </View>
        <View style={styles.notificationActionRow}>
          <Pressable accessibilityRole="button" style={styles.notificationSmallButton} onPress={() => onOpenDetail(notification)}>
            <Bell color={colors.primary} size={14} />
            <Text style={styles.notificationSmallText}>상세</Text>
          </Pressable>
          <Link href={href} asChild>
            <Pressable style={styles.notificationLinkButton} onPress={() => markNotificationRead(notification.id)}>
              <Text style={styles.notificationLinkText}>{notification.action?.label ?? '바로가기'}</Text>
              <ChevronRight color={colors.primary} size={15} />
            </Pressable>
          </Link>
          {unread ? (
            <Pressable accessibilityRole="button" style={styles.notificationSmallButton} onPress={() => markNotificationRead(notification.id)}>
              <Check color={colors.primary} size={14} />
              <Text style={styles.notificationSmallText}>읽음</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" style={styles.notificationIconButton} onPress={() => removeNotification(notification.id)}>
            <Trash2 color={colors.muted} size={15} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function NotificationDetailModal({ notification, onClose }: { notification: AppNotification | null; onClose: () => void }) {
  if (!notification) return null;

  const Icon = notificationIcon(notification.category);
  const href = notificationHref(notification);
  const hasRoute = Boolean(notification.route);
  const hasIsland = Boolean(notification.islandName);

  return (
    <Modal animationType="fade" transparent visible={Boolean(notification)} onRequestClose={onClose}>
      <View style={styles.detailModalBackdrop}>
        <View style={styles.detailModalCard}>
          <View style={styles.detailModalHeader}>
            <View style={styles.detailHeaderLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${severityColor(notification.severity)}18` }]}>
                <Icon color={severityColor(notification.severity)} size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailEyebrow}>{categoryLabel(notification.category)} · {severityLabel(notification.severity)}</Text>
                <Text style={styles.detailTitle} numberOfLines={2}>
                  {notification.title}
                </Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailCloseButton}>
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScrollArea} contentContainerStyle={styles.detailContent}>
            <View style={styles.detailMessageBox}>
              <Text style={styles.detailMessage}>{notification.message}</Text>
            </View>

            <View style={styles.detailGrid}>
              <DetailField label="생성 시각" value={relativeTime(notification.createdAt) ?? '방금 생성'} />
              <DetailField label="읽음 상태" value={notification.readAt ? `${relativeTime(notification.readAt)} 읽음` : '읽지 않음'} />
              <DetailField label="생성 기준" value={sourceLabel(notification.source)} />
              <DetailField label="알림 종류" value={categoryLabel(notification.category)} />
            </View>

            {hasRoute ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>항로 정보</Text>
                <View style={styles.detailGrid}>
                  <DetailField label="출발" value={notification.route?.departure ?? '-'} />
                  <DetailField label="도착" value={notification.route?.arrival ?? '-'} />
                  <DetailField label="선박" value={notification.route?.vesselName ?? '확인 필요'} />
                  <DetailField label="출항" value={notification.route?.departureTime ?? '확인 필요'} />
                </View>
              </View>
            ) : null}

            {hasIsland ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>섬/권역 정보</Text>
                <DetailField label="대상" value={notification.islandName ?? '확인 필요'} />
              </View>
            ) : null}

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>다음 행동</Text>
              <Text style={styles.secondary}>
                {notification.action?.label ? `${notification.action.label} 화면에서 최신 데이터를 다시 확인하세요.` : '관련 화면으로 이동해 최신 상태를 확인하세요.'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.detailFooter}>
            <Link href={href} asChild>
              <Pressable
                style={styles.detailPrimaryButton}
                onPress={() => {
                  markNotificationRead(notification.id);
                  onClose();
                }}
              >
                <Text style={styles.detailPrimaryButtonText}>{notification.action?.label ?? '관련 화면 보기'}</Text>
                <ChevronRight color={colors.surface} size={16} />
              </Pressable>
            </Link>
            <Pressable
              accessibilityRole="button"
              style={styles.detailDangerButton}
              onPress={() => {
                removeNotification(notification.id);
                onClose();
              }}
            >
              <Trash2 color={colors.danger} size={15} />
              <Text style={styles.detailDangerButtonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PrivacyPolicyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.detailModalBackdrop}>
        <View style={styles.detailModalCard}>
          <View style={styles.detailModalHeader}>
            <View style={styles.detailHeaderLeft}>
              <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}18` }]}>
                <ShieldCheck color={colors.primary} size={20} />
              </View>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.detailEyebrow}>섬똑 서비스 정책</Text>
                <Text style={styles.detailTitle}>개인정보처리방침</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailCloseButton}>
              <X color={colors.muted} size={20} />
            </Pressable>
          </View>

          <ScrollView style={styles.detailScrollArea} contentContainerStyle={styles.detailContent}>
            <View style={styles.detailMessageBox}>
              <Text style={styles.detailMessage}>
                섬똑은 여객선 운항정보, 예보, 섬여행 정보를 제공하기 위해 필요한 최소한의 정보만 사용합니다. 본 방침은 앱 정식 출시 전 초안이며, 서비스 운영 정책과 스토어 심사 기준에 따라 업데이트될 수 있습니다.
              </Text>
            </View>

            <PolicySection
              title="1. 수집하거나 저장하는 정보"
              items={[
                '앱 내에서 사용자가 선택한 출발지, 도착지, 선박명, 검색일자',
                '즐겨찾기 항로, 최근 조회 항로, 관심 섬, 최근 검색어',
                '앱 내부 알림 설정, 읽음 여부, 조건 기반 알림 생성 이력',
                '서버 연결 오류 발생 시 사용자가 서비스 문의를 선택하면 메일 앱에 작성되는 오류 설명'
              ]}
            />
            <PolicySection
              title="2. 이용 목적"
              items={[
                '시간표, 운항 후보, 예보, 섬여행 정보 조회',
                '즐겨찾기, 최근 조회, 관심 섬 기반의 개인화 화면 제공',
                '운항상태, 예보, 여행 전 체크 항목에 대한 앱 내부 알림 제공',
                '서비스 장애 확인 및 사용자 문의 응대'
              ]}
            />
            <PolicySection
              title="3. 보관 및 삭제"
              items={[
                '즐겨찾기, 최근 조회, 알림 설정은 사용자의 기기 저장소에 보관됩니다.',
                '사용자는 앱 안에서 즐겨찾기와 알림을 삭제할 수 있습니다.',
                '앱을 삭제하면 기기에 저장된 앱 데이터도 함께 삭제될 수 있습니다.',
                '서버 로그가 운영되는 경우 장애 대응과 보안 점검 목적에 필요한 기간 동안만 보관합니다.'
              ]}
            />
            <PolicySection
              title="4. 외부 API 및 제3자 제공"
              items={[
                '섬똑은 공공데이터포털, 한국해양교통안전공단, 기상청, 국립해양조사원, 한국관광공사 등 공공 API를 이용합니다.',
                'API 조회에 필요한 검색 조건이 서버로 전달될 수 있으나, 섬똑은 사용자를 식별하기 위한 회원정보를 요구하지 않습니다.',
                '법령에 따른 요구가 있는 경우를 제외하고 개인정보를 제3자에게 판매하거나 제공하지 않습니다.'
              ]}
            />
            <PolicySection
              title="5. 위치정보"
              items={[
                '현재 버전은 사용자가 직접 선택하거나 검색한 섬과 항구 정보를 중심으로 서비스를 제공합니다.',
                '향후 현재 위치 기반 가까운 항구 추천 기능이 추가될 경우, 위치 권한 요청 전 목적과 사용 범위를 앱에서 안내합니다.'
              ]}
            />
            <PolicySection
              title="6. 아동의 개인정보"
              items={[
                '섬똑은 만 14세 미만 아동을 대상으로 개인정보를 의도적으로 수집하지 않습니다.',
                '보호자가 관련 문의를 하는 경우 운영자는 필요한 범위에서 확인 후 조치합니다.'
              ]}
            />
            <PolicySection
              title="7. 문의"
              items={[
                '개인정보 및 서비스 문의: dottoril.ee@gmail.com',
                '시행 예정일: 2026년 6월 4일'
              ]}
            />
          </ScrollView>

          <View style={styles.detailFooter}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailPrimaryButton}>
              <Text style={styles.detailPrimaryButtonText}>확인</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PolicySection({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.policySection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.policyItemRow}>
          <Text style={styles.policyBullet}>-</Text>
          <Text style={styles.policyItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailFieldLabel}>{label}</Text>
      <Text style={styles.detailFieldValue}>{value}</Text>
    </View>
  );
}

function RuleRow({
  icon: Icon,
  tone,
  title,
  description,
  value,
  onChange
}: {
  icon: ComponentType<{ color: string; size: number }>;
  tone: AppNotificationSeverity;
  title: string;
  description: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}) {
  const content = (
    <>
      <View style={[styles.ruleIcon, { backgroundColor: `${severityColor(tone)}16` }]}>
        <Icon color={severityColor(tone)} size={18} />
      </View>
      <View style={styles.ruleCopy}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.secondary}>{description}</Text>
      </View>
      {typeof value === 'boolean' && onChange ? (
        <View style={[styles.toggleTrack, value ? styles.toggleTrackActive : null]}>
          <View style={[styles.toggleThumb, value ? styles.toggleThumbActive : null]} />
        </View>
      ) : null}
    </>
  );

  if (typeof value === 'boolean' && onChange) {
    return (
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.ruleRow}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.ruleRow}>
      {content}
    </View>
  );
}

function filterNotifications(items: AppNotification[], filter: NotificationFilter) {
  if (filter === 'all') return items;
  if (filter === 'unread') return items.filter((item) => !item.readAt);
  return items.filter((item) => item.category === filter);
}

function countByFilter(items: AppNotification[], filter: NotificationFilter) {
  return filterNotifications(items, filter).length;
}

function notificationIcon(category: AppNotificationCategory) {
  if (category === 'forecast') return Waves;
  if (category === 'trip') return MapPin;
  if (category === 'safety') return Bell;
  return Ship;
}

function notificationHref(notification: AppNotification) {
  switch (notification.action?.target) {
    case 'forecast':
      return '/forecast';
    case 'island-trip':
      return '/island-trip';
    case 'islands':
      return '/islands';
    case 'profile':
      return '/profile';
    case 'schedule':
    default:
      return '/schedule';
  }
}

function categoryLabel(category: AppNotificationCategory) {
  if (category === 'forecast') return '예보';
  if (category === 'trip') return '여행';
  if (category === 'safety') return '안전';
  return '운항';
}

function severityColor(severity: AppNotificationSeverity) {
  if (severity === 'danger') return colors.danger;
  if (severity === 'warning') return colors.warning;
  if (severity === 'good') return colors.mint;
  return colors.primary;
}

function severityLabel(severity: AppNotificationSeverity) {
  if (severity === 'danger') return '위험';
  if (severity === 'warning') return '주의';
  if (severity === 'good') return '양호';
  return '정보';
}

function sourceLabel(source: AppNotification['source']) {
  if (source === 'data') return '실제 API 데이터';
  if (source === 'condition') return '앱 조건';
  if (source === 'manual') return '수동 생성';
  return '시스템';
}

function leadLabel(minutes: AppNotificationSettings['departureLeadMinutes']) {
  if (minutes === 180) return '3시간 전';
  if (minutes === 60) return '1시간 전';
  return '30분 전';
}

function relativeTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getMonth() + 1}/${date.getDate()} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  notificationToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 13
  },
  disabledButton: {
    opacity: 0.72
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 12
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  iconActionButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  collapseHeader: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  collapseCopy: {
    flex: 1,
    minWidth: 0
  },
  collapseSummary: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19
  },
  collapseAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3
  },
  collapseActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  collapseIconOpen: {
    transform: [{ rotate: '90deg' }]
  },
  collapsibleBody: {
    gap: 12
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  filterChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  filterChipTextActive: {
    color: colors.surface
  },
  settingList: {
    gap: 12
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12
  },
  settingCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  settingTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  settingDivider: {
    backgroundColor: colors.border,
    height: 1
  },
  settingBlock: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  serviceGuideList: {
    gap: 10
  },
  serviceGuideRow: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12
  },
  serviceGuideRowStatic: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12
  },
  serviceGuideIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  serviceGuideCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  serviceGuideTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900'
  },
  toggleTrack: {
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 52
  },
  toggleTrackActive: {
    backgroundColor: colors.primary
  },
  toggleThumb: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 22,
    width: 22
  },
  toggleThumbActive: {
    alignSelf: 'flex-end'
  },
  leadOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  leadOption: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 11,
    justifyContent: 'center'
  },
  leadOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  leadOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  leadOptionTextActive: {
    color: colors.surface
  },
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
  alertRowUnread: {
    backgroundColor: colors.surface,
    borderColor: colors.primary
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
    gap: 7,
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
  notificationMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  notificationTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  readBadge: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  notificationActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  notificationLinkButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    minHeight: 34,
    paddingHorizontal: 10
  },
  notificationLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  notificationSmallButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 9
  },
  notificationSmallText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  notificationIconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34
  },
  listMoreButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 40
  },
  listMoreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  detailModalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(12, 32, 48, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 16
  },
  detailModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    maxHeight: '88%',
    overflow: 'hidden',
    width: '100%',
    maxWidth: 560
  },
  detailModalHeader: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 16
  },
  detailHeaderLeft: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0
  },
  detailIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  detailHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  detailEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900'
  },
  detailTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  },
  detailCloseButton: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  detailScrollArea: {
    maxHeight: 520
  },
  detailContent: {
    gap: 14,
    padding: 16
  },
  detailMessageBox: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 13
  },
  detailMessage: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  detailField: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    gap: 4,
    minWidth: 132,
    padding: 11
  },
  detailFieldLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900'
  },
  detailFieldValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20
  },
  detailSection: {
    gap: 8
  },
  detailSectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  policySection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 13
  },
  policyItemRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 7
  },
  policyBullet: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 20
  },
  policyItemText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20
  },
  detailFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14
  },
  detailPrimaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 160,
    paddingHorizontal: 14
  },
  detailPrimaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  },
  detailDangerButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: `${colors.danger}33`,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 13
  },
  detailDangerButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900'
  },
  emptyPanel: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
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
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 11
  },
  ruleIcon: {
    alignItems: 'center',
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
