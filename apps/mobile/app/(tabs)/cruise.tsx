import { Anchor, CalendarDays, Database, FileText, MapPin, Ship, Waves } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { MascotBanner } from '@/components/MascotBanner';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme/colors';

type CruiseSource = {
  title: string;
  kind: 'API' | '파일';
  description: string;
  fields: string[];
};

type CruiseSection = {
  title: string;
  description: string;
  Icon: ComponentType<{ color: string; size: number; strokeWidth?: number }>;
};

const cruiseSources: CruiseSource[] = [
  {
    title: '부산항 크루즈 스케줄',
    kind: '파일',
    description: '입항·출항 예정일, 선석, 전항지와 차항지 기준의 국제 크루즈 운항 정보',
    fields: ['선명', '선사', '승객수', '입항예정일', '출항예정일', '선석']
  },
  {
    title: '여수항 크루즈선 정보',
    kind: '파일',
    description: '여수항 입항 크루즈의 선박 제원과 여정 정보를 확인하는 기준 데이터',
    fields: ['선박', '운항사', '총톤수', '승객수', '입항예정일', '전항지']
  },
  {
    title: '여수항 크루즈 입항 스케줄',
    kind: '파일',
    description: '입항·출항 시간, 이전 항구와 다음 항구, 대리점 연락처 중심의 스케줄 데이터',
    fields: ['선박', '입항예정일', '출항예정일', '이전항', '다음항', '연락처']
  },
  {
    title: '포항운하크루즈',
    kind: '파일',
    description: '포항운하크루즈 기본정보, 추천 코스, 상세 설명, 이미지 보유 여부',
    fields: ['코스', '주소', '이용시간', '이용요금', '추천순서', '이미지']
  },
  {
    title: '크루즈 공공 API',
    kind: 'API',
    description: 'ref_api/크루즈의 API 안내 자료를 기준으로 호출 항목을 정리해 연동 예정',
    fields: ['스케줄', '항만', '선박', '운항', '기항지']
  }
];

const cruiseSections: CruiseSection[] = [
  {
    title: '입출항 스케줄',
    description: '항만별 입항·출항 일시와 선석을 한 번에 확인',
    Icon: CalendarDays
  },
  {
    title: '크루즈 선박',
    description: '선명, 선사, 국적, 총톤수, 승객 규모 중심의 선박 상세',
    Icon: Ship
  },
  {
    title: '기항지·항만',
    description: '전항지, 차항지, 국내 항만 위치를 지도 정보와 연결',
    Icon: MapPin
  },
  {
    title: '연안 크루즈',
    description: '포항운하처럼 관광 코스형 크루즈를 여행 화면과 연결',
    Icon: Waves
  }
];

export default function CruiseScreen() {
  return (
    <Screen title="크루즈" subtitle="국내 항만 크루즈 스케줄과 연안 관광 크루즈 정보를 준비하고 있어요.">
      <MascotBanner
        imageSource={require('../../assets/mascot/boogi-routes.png')}
        eyebrow="공공데이터 기반"
        title="크루즈 일정과 선박 정보를 한 화면으로"
        description="부산항, 여수항, 포항운하크루즈 데이터를 시작점으로 입출항 일정과 선박 상세를 연결합니다."
        tone="blue"
      />

      <InfoCard title="제공할 정보" eyebrow="크루즈 메뉴 1차 범위">
        <View style={styles.sectionGrid}>
          {cruiseSections.map(({ title, description, Icon }) => (
            <View key={title} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon color={colors.primary} size={19} strokeWidth={2.5} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
              </View>
            </View>
          ))}
        </View>
      </InfoCard>

      <InfoCard title="수집 기준 데이터" eyebrow="ref_api/크루즈">
        {cruiseSources.map((source) => (
          <View key={source.title} style={styles.sourceRow}>
            <View style={styles.sourceHeader}>
              <View style={[styles.sourceBadge, source.kind === 'API' ? styles.apiBadge : styles.fileBadge]}>
                {source.kind === 'API' ? (
                  <Database color={colors.primary} size={14} strokeWidth={2.5} />
                ) : (
                  <FileText color={colors.good} size={14} strokeWidth={2.5} />
                )}
                <Text style={[styles.sourceBadgeText, source.kind === 'API' ? styles.apiBadgeText : styles.fileBadgeText]}>
                  {source.kind}
                </Text>
              </View>
              <Text style={styles.sourceTitle}>{source.title}</Text>
            </View>
            <Text style={styles.sourceDescription}>{source.description}</Text>
            <View style={styles.fieldWrap}>
              {source.fields.map((field) => (
                <Text key={field} style={styles.fieldChip}>
                  {field}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </InfoCard>

      <InfoCard title="다음 연결 작업" eyebrow="데이터 적재 후">
        <View style={styles.nextList}>
          <Text style={styles.nextItem}>1. 크루즈 API 호출 테스트와 응답 항목 표준화</Text>
          <Text style={styles.nextItem}>2. 파일 데이터 인코딩 보정 후 DB 마스터 적재</Text>
          <Text style={styles.nextItem}>3. 항만·선박·스케줄 상세 화면 연결</Text>
          <Text style={styles.nextItem}>4. 섬찾기와 크루즈 관광 코스 추천 연결</Text>
        </View>
        <Pressable style={styles.disabledButton} accessibilityRole="button" disabled>
          <Anchor color={colors.muted} size={18} strokeWidth={2.5} />
          <Text style={styles.disabledButtonText}>크루즈 검색 준비 중</Text>
        </Pressable>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionGrid: {
    gap: 10
  },
  featureItem: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  featureIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  featureCopy: {
    flex: 1,
    gap: 3
  },
  featureTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '800'
  },
  featureDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  sourceRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 8,
    paddingBottom: 12
  },
  sourceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  sourceBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  apiBadge: {
    backgroundColor: colors.primarySoft
  },
  fileBadge: {
    backgroundColor: '#ddf8f1'
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '900'
  },
  apiBadgeText: {
    color: colors.primary
  },
  fileBadgeText: {
    color: colors.good
  },
  sourceTitle: {
    color: colors.navy,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  sourceDescription: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19
  },
  fieldWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  fieldChip: {
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  nextList: {
    gap: 6
  },
  nextItem: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19
  },
  disabledButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.backgroundSoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  disabledButtonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  }
});
