import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Anchor,
  Building2,
  CalendarDays,
  ChevronRight,
  RefreshCcw,
  Search,
  Ship,
  Ticket,
  X
} from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CruiseOperatorLicense, CruiseSchedule, CruiseTourProduct } from '@badagil/shared';
import { fetchCruiseOverview, fetchCruiseScheduleDetail, fetchCruiseSchedules } from '@/api/cruises';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

const DATE_FILTERS = [
  { label: '오늘부터', days: 0 },
  { label: '7일', days: 7 },
  { label: '30일', days: 30 },
  { label: '올해', days: null }
] as const;

type DateFilter = (typeof DATE_FILTERS)[number];

export default function CruiseScreen() {
  const [selectedPortName, setSelectedPortName] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<CruiseOperatorLicense | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>(DATE_FILTERS[0]);

  const overviewQuery = useQuery({
    queryKey: ['cruise-overview'],
    queryFn: () => fetchCruiseOverview(12),
    staleTime: 10 * 60 * 1000
  });

  const scheduleRange = useMemo(() => getScheduleRange(dateFilter), [dateFilter]);
  const schedulesQuery = useQuery({
    queryKey: ['cruise-schedules', selectedPortName, keyword, scheduleRange.from, scheduleRange.to],
    queryFn: () =>
      fetchCruiseSchedules({
        portName: selectedPortName,
        keyword,
        from: scheduleRange.from,
        to: scheduleRange.to,
        limit: 80
      }),
    staleTime: 10 * 60 * 1000
  });

  const selectedScheduleQuery = useQuery({
    queryKey: ['cruise-schedule-detail', selectedScheduleId],
    queryFn: () => fetchCruiseScheduleDetail(selectedScheduleId ?? ''),
    enabled: Boolean(selectedScheduleId),
    staleTime: 10 * 60 * 1000
  });

  const overview = overviewQuery.data;
  const ports = overview?.ports ?? [];
  const schedules = schedulesQuery.data ?? overview?.upcomingSchedules ?? [];
  const groupedSchedules = useMemo(() => groupSchedulesByMonth(schedules), [schedules]);
  const selectedSchedule = selectedScheduleQuery.data ?? schedules.find((schedule) => schedule.id === selectedScheduleId) ?? null;
  const featuredSchedule = schedules[0] ?? overview?.upcomingSchedules?.[0] ?? null;
  const selectedPortLabel = selectedPortName ?? '전체 항만';

  const submitSearch = () => setKeyword(keywordInput.trim());
  const resetSearch = () => {
    setKeywordInput('');
    setKeyword('');
    setSelectedPortName(null);
    setDateFilter(DATE_FILTERS[0]);
  };

  return (
    <Screen title="크루즈" subtitle="입항 일정, 선박 규모, 항만 정보와 연안 관광 크루즈를 한 번에 확인합니다.">
      <MascotBanner
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        eyebrow="크루즈 일정 안내"
        title={featuredSchedule ? `${featuredSchedule.port.portName} ${featuredSchedule.vesselName}` : '국내 크루즈 정보를 모아봅니다'}
        description={
          featuredSchedule
            ? `${formatShortDate(featuredSchedule.arrivalDate)} ${featuredSchedule.arrivalTime ?? ''} 입항 예정 · ${featuredSchedule.nextPortName ? `다음 항 ${featuredSchedule.nextPortName}` : '상세 일정 확인 가능'}`
            : '부산항, 인천항, 여수항, 포항운하 데이터를 기준으로 크루즈 이용 정보를 제공합니다.'
        }
        tone="blue"
      />

      <View style={styles.heroStats}>
        <HeroStat icon={Anchor} label="항만" value={overview?.summary.totalPorts ?? 0} />
        <HeroStat icon={Ship} label="선박" value={overview?.summary.totalVessels ?? 0} />
        <HeroStat icon={CalendarDays} label="일정" value={overview?.summary.totalSchedules ?? 0} />
        <HeroStat icon={Building2} label="사업자" value={overview?.summary.totalOperatorLicenses ?? 0} />
      </View>

      <InfoCard title="크루즈 찾기" eyebrow={schedulesQuery.isFetching ? '조회 중' : `${selectedPortLabel} · ${schedules.length}건`}>
        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} strokeWidth={2.5} />
          <TextInput
            value={keywordInput}
            onChangeText={setKeywordInput}
            onSubmitEditing={submitSearch}
            placeholder="선박명, 항만, 이전항, 다음항 검색"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {keywordInput ? (
            <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => setKeywordInput('')} style={styles.iconButton}>
              <X color={colors.muted} size={17} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" onPress={submitSearch} style={styles.primaryButton}>
            <Search color={colors.surface} size={17} strokeWidth={2.5} />
            <Text style={styles.primaryButtonText}>검색</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={resetSearch} style={styles.secondaryButton}>
            <RefreshCcw color={colors.primary} size={16} strokeWidth={2.5} />
            <Text style={styles.secondaryButtonText}>초기화</Text>
          </Pressable>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>항만</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
            <FilterChip label="전체" active={!selectedPortName} onPress={() => setSelectedPortName(null)} />
            {ports.map((port) => (
              <FilterChip
                key={port.id}
                label={port.portName}
                active={selectedPortName === port.portName}
                onPress={() => setSelectedPortName(port.portName)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>기간</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroller}>
            {DATE_FILTERS.map((option) => (
              <FilterChip key={option.label} label={option.label} active={dateFilter.label === option.label} onPress={() => setDateFilter(option)} />
            ))}
          </ScrollView>
        </View>
      </InfoCard>

      <InfoCard title="입항 일정" eyebrow={keyword ? `"${keyword}" 검색 결과` : selectedPortLabel}>
        {schedulesQuery.isError ? (
          <Text style={styles.emptyText}>크루즈 일정을 불러오지 못했습니다.</Text>
        ) : groupedSchedules.length > 0 ? (
          groupedSchedules.map((group) => (
            <View key={group.label} style={styles.scheduleGroup}>
              <Text style={styles.scheduleMonth}>{group.label}</Text>
              {group.items.map((schedule) => (
                <ScheduleRow key={schedule.id} schedule={schedule} onPress={() => setSelectedScheduleId(schedule.id)} />
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>조건에 맞는 입항 일정이 없습니다.</Text>
        )}
      </InfoCard>

      <InfoCard title="관광 크루즈" eyebrow={`${overview?.tourProducts.length ?? 0}건`}>
        {overview?.tourProducts.length ? (
          overview.tourProducts.map((product) => <TourProductCard key={product.id} product={product} />)
        ) : (
          <Text style={styles.emptyText}>관광 크루즈 상품 데이터가 준비되면 여기에 표시됩니다.</Text>
        )}
      </InfoCard>

      <InfoCard title="등록 유람선 사업자" eyebrow={`${overview?.summary.totalOperatorLicenses ?? 0}건`}>
        {overview?.operatorLicenses.length ? (
          overview.operatorLicenses.map((operator) => <OperatorCard key={operator.id} operator={operator} onPress={() => setSelectedOperator(operator)} />)
        ) : (
          <Text style={styles.emptyText}>관광유람선업 인허가 정보를 불러오고 있습니다.</Text>
        )}
      </InfoCard>

      <InfoCard title="데이터 갱신" eyebrow={overview?.updatedAt ? formatDateTime(overview.updatedAt) : '확인 중'}>
        <View style={styles.sourceWrap}>
          {(overview?.summary.sourceNames ?? []).map((sourceName) => (
            <Text key={sourceName} style={styles.sourceChip}>
              {sourceName.replace('행정안전부_문화_', '행안부 ')}
            </Text>
          ))}
        </View>
      </InfoCard>

      <ScheduleDetailModal schedule={selectedSchedule} loading={selectedScheduleQuery.isLoading} visible={Boolean(selectedScheduleId)} onClose={() => setSelectedScheduleId(null)} />
      <OperatorDetailModal operator={selectedOperator} visible={Boolean(selectedOperator)} onClose={() => setSelectedOperator(null)} />
    </Screen>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Anchor;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.heroStat}>
      <Icon color={colors.primary} size={18} strokeWidth={2.5} />
      <Text style={styles.heroStatValue}>{value.toLocaleString()}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={active ? { selected: true } : undefined} onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ScheduleRow({ schedule, onPress }: { schedule: CruiseSchedule; onPress: () => void }) {
  const passengerText = schedule.vessel?.passengerCapacity ? `${schedule.vessel.passengerCapacity.toLocaleString()}명` : null;
  const vesselSizeText = schedule.vessel?.grossTonnage ? `${schedule.vessel.grossTonnage.toLocaleString()}GT` : null;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.scheduleRow}>
      <View style={styles.scheduleDateBox}>
        <Text style={styles.scheduleDay}>{formatScheduleDay(schedule.arrivalDate)}</Text>
        <Text style={styles.scheduleTime}>{schedule.arrivalTime ?? '확인'}</Text>
      </View>
      <View style={styles.scheduleCopy}>
        <View style={styles.scheduleTitleRow}>
          <Text style={styles.scheduleTitle} numberOfLines={2}>
            {schedule.vesselName}
          </Text>
          {schedule.scheduleType ? <Text style={styles.scheduleType}>{schedule.scheduleType}</Text> : null}
        </View>
        <Text style={styles.scheduleMeta} numberOfLines={2}>
          {[schedule.port.portName, schedule.berthName, schedule.departureTime && `출항 ${schedule.departureTime}`].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.scheduleRoute} numberOfLines={2}>
          {[schedule.previousPortName && `전항 ${schedule.previousPortName}`, schedule.nextPortName && `차항 ${schedule.nextPortName}`].filter(Boolean).join(' · ') ||
            schedule.operatorName ||
            schedule.sourceName}
        </Text>
        <View style={styles.inlineChips}>
          {[passengerText, vesselSizeText, schedule.operatorName].filter(Boolean).map((item) => (
            <Text key={item} style={styles.smallChip}>
              {item}
            </Text>
          ))}
        </View>
      </View>
      <ChevronRight color={colors.primary} size={18} strokeWidth={2.5} />
    </Pressable>
  );
}

function TourProductCard({ product }: { product: CruiseTourProduct }) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productIconBox}>
        <Ticket color={colors.good} size={20} strokeWidth={2.5} />
      </View>
      <View style={styles.productCopy}>
        <View style={styles.productHeader}>
          <Text style={styles.productTitle}>{product.productName}</Text>
          {product.port?.portName ? <Text style={styles.greenBadge}>{product.port.portName}</Text> : null}
        </View>
        <Text style={styles.productDescription} numberOfLines={3}>
          {product.description ?? product.address ?? '연안 관광 크루즈 상품입니다.'}
        </Text>
        <View style={styles.inlineChips}>
          {[product.priceText, product.operatingHours, product.travelTimeText && `${product.travelTimeText}시간`, product.imageIncluded ? '사진 정보' : null]
            .filter(Boolean)
            .map((item) => (
              <Text key={item} style={styles.smallChip}>
                {item}
              </Text>
            ))}
        </View>
      </View>
    </View>
  );
}

function OperatorCard({ operator, onPress }: { operator: CruiseOperatorLicense; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.operatorCard}>
      <View style={styles.productHeader}>
        <Text style={styles.operatorTitle}>{operator.businessName}</Text>
        {operator.port?.portName ? <Text style={styles.blueBadge}>{operator.port.portName}</Text> : null}
      </View>
      <Text style={styles.productDescription} numberOfLines={2}>
        {operator.roadAddress ?? operator.lotAddress ?? operator.localGovernmentName ?? '주소 확인 필요'}
      </Text>
      <View style={styles.inlineChips}>
        {[operator.businessStatus, operator.detailStatus, operator.phone, operator.permitDate && `인허가 ${operator.permitDate}`].filter(Boolean).map((item) => (
          <Text key={item} style={styles.smallChip}>
            {item}
          </Text>
        ))}
      </View>
      <View style={styles.cardActionRow}>
        <Text style={styles.cardActionText}>상세 보기</Text>
        <ChevronRight color={colors.primary} size={16} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

function OperatorDetailModal({ operator, visible, onClose }: { operator: CruiseOperatorLicense | null; visible: boolean; onClose: () => void }) {
  const detailFields = operator?.detailFields ?? [];
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleBox}>
              <Text style={styles.modalEyebrow}>관광유람선업 원장</Text>
              <Text style={styles.modalTitle}>{operator?.businessName ?? '사업자 상세'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.closeButton}>
              <X color={colors.muted} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {operator ? (
              <>
                <View style={styles.detailHero}>
                  <Text style={styles.detailHeroDate}>{operator.businessName}</Text>
                  <Text style={styles.detailHeroText}>{operator.roadAddress ?? operator.lotAddress ?? '주소 확인 필요'}</Text>
                  <View style={styles.inlineChips}>
                    {[operator.businessStatus, operator.detailStatus, operator.port?.portName, operator.permitDate && `인허가 ${operator.permitDate}`].filter(Boolean).map((item) => (
                      <Text key={item} style={styles.detailHeroBadge}>
                        {item}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>기본 정보</Text>
                  <DetailLine label="관리번호" value={operator.managementNo} />
                  <DetailLine label="전화번호" value={operator.phone} />
                  <DetailLine label="도로명주소" value={operator.roadAddress} />
                  <DetailLine label="지번주소" value={operator.lotAddress} />
                  <DetailLine label="관할코드" value={operator.localGovernmentCode} />
                  <DetailLine label="좌표" value={operator.x && operator.y ? `${operator.x}, ${operator.y}` : null} />
                </View>

                {detailFields.length ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>원장 상세 항목</Text>
                    {detailFields.map((field) => (
                      <DetailLine key={`${field.label}-${field.value}`} label={field.label} value={field.value} />
                    ))}
                  </View>
                ) : null}

                <Text style={styles.detailSource}>출처: {operator.sourceName}</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>사업자 상세 정보를 찾지 못했습니다.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ScheduleDetailModal({
  schedule,
  loading,
  visible,
  onClose
}: {
  schedule: CruiseSchedule | null;
  loading: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleBox}>
              <Text style={styles.modalEyebrow}>{schedule?.port.portName ?? '크루즈 일정'}</Text>
              <Text style={styles.modalTitle}>{schedule?.vesselName ?? (loading ? '상세 조회 중' : '일정 상세')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.closeButton}>
              <X color={colors.muted} size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {schedule ? (
              <>
                <View style={styles.detailHero}>
                  <Text style={styles.detailHeroDate}>{formatLongDate(schedule.arrivalDate)}</Text>
                  <Text style={styles.detailHeroText}>
                    입항 {schedule.arrivalTime ?? '확인 필요'} · 출항 {schedule.departureDate ?? schedule.arrivalDate} {schedule.departureTime ?? '확인 필요'}
                  </Text>
                  <View style={styles.inlineChips}>
                    {[schedule.scheduleType, schedule.berthName, schedule.operatorName].filter(Boolean).map((item) => (
                      <Text key={item} style={styles.detailHeroBadge}>
                        {item}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>선박 정보</Text>
                  <DetailLine label="선사" value={schedule.operatorName} />
                  <DetailLine label="승객 정원" value={schedule.vessel?.passengerCapacity ? `${schedule.vessel.passengerCapacity.toLocaleString()}명` : null} />
                  <DetailLine label="총톤수" value={schedule.vessel?.grossTonnage ? `${schedule.vessel.grossTonnage.toLocaleString()} GT` : null} />
                  <DetailLine label="선박 길이" value={schedule.vessel?.lengthMeter ? `${schedule.vessel.lengthMeter} m` : null} />
                  <DetailLine label="승무원" value={schedule.vessel?.crewCount ? `${schedule.vessel.crewCount.toLocaleString()}명` : null} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>운항 경로</Text>
                  <DetailLine label="터미널" value={schedule.port.terminalName} />
                  <DetailLine label="출항지" value={schedule.homePortName} />
                  <DetailLine label="전항지" value={schedule.previousPortName} />
                  <DetailLine label="차항지" value={schedule.nextPortName} />
                  <DetailLine label="대리점" value={schedule.agentName} />
                  <DetailLine label="연락처" value={schedule.agentTel} />
                </View>

                <Text style={styles.detailSource}>출처: {schedule.sourceName}</Text>
              </>
            ) : (
              <Text style={styles.emptyText}>{loading ? '상세 정보를 불러오는 중입니다.' : '상세 정보를 찾지 못했습니다.'}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailLine({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ? String(value) : '확인 필요'}</Text>
    </View>
  );
}

function groupSchedulesByMonth(schedules: CruiseSchedule[]) {
  const groups = new Map<string, CruiseSchedule[]>();
  schedules.forEach((schedule) => {
    const label = `${schedule.arrivalDate.slice(0, 4)}년 ${Number(schedule.arrivalDate.slice(5, 7))}월`;
    groups.set(label, [...(groups.get(label) ?? []), schedule]);
  });
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

function getScheduleRange(filter: DateFilter) {
  const from = todayDateString();
  if (filter.days === null) {
    return { from, to: `${new Date().getFullYear()}-12-31` };
  }
  if (filter.days === 0) {
    return { from, to: null };
  }
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + filter.days);
  return { from, to: toDate.toISOString().slice(0, 10) };
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatScheduleDay(value: string) {
  return value.slice(5).replace('-', '.');
}

function formatShortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  heroStat: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '23%',
    flexGrow: 1,
    gap: 4,
    minWidth: 74,
    paddingHorizontal: 8,
    paddingVertical: 12
  },
  heroStatValue: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800'
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  searchInput: {
    color: colors.navy,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 0,
    paddingVertical: 10
  },
  iconButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900'
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  filterBlock: {
    gap: 8
  },
  filterLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '900'
  },
  chipScroller: {
    gap: 8,
    paddingRight: 4
  },
  filterChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterChipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  filterChipTextActive: {
    color: colors.surface
  },
  scheduleGroup: {
    gap: 8
  },
  scheduleMonth: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  scheduleRow: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  scheduleDateBox: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 62,
    width: 64
  },
  scheduleDay: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  scheduleTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2
  },
  scheduleCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  scheduleTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  scheduleTitle: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 0
  },
  scheduleType: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  scheduleMeta: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18
  },
  scheduleRoute: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  inlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  smallChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  productCard: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  productIconBox: {
    alignItems: 'center',
    backgroundColor: '#ddf8f1',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  productCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  productHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  productTitle: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900'
  },
  productDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19
  },
  operatorCard: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  operatorTitle: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '900'
  },
  cardActionRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4
  },
  cardActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  greenBadge: {
    backgroundColor: '#ddf8f1',
    borderRadius: 8,
    color: colors.good,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  blueBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20
  },
  sourceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  sourceChip: {
    backgroundColor: colors.surfaceBlue,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  modalBackdrop: {
    backgroundColor: 'rgba(16, 42, 67, 0.36)',
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: '86%',
    paddingTop: 8
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: 8,
    height: 4,
    marginBottom: 10,
    width: 44
  },
  modalHeader: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 14,
    paddingHorizontal: 18
  },
  modalTitleBox: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  modalTitle: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: '900'
  },
  closeButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  modalContent: {
    gap: 14,
    padding: 18,
    paddingBottom: 28
  },
  detailHero: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  detailHeroDate: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '900'
  },
  detailHeroText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19
  },
  detailHeroBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  detailSection: {
    gap: 8
  },
  detailSectionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900'
  },
  detailLine: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800'
  },
  detailValue: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20
  },
  detailSource: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  }
});
