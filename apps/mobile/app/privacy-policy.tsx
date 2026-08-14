import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_POLICY_CONTACT_EMAIL, PRIVACY_POLICY_EFFECTIVE_DATE, PRIVACY_POLICY_SECTIONS } from '@/content/privacy-policy';
import { colors } from '@/theme/colors';

export default function PrivacyPolicyScreen() {
  const openContact = () => {
    void Linking.openURL(`mailto:${PRIVACY_POLICY_CONTACT_EMAIL}?subject=${encodeURIComponent('섬똑 개인정보 처리방침 문의')}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SEOMTTOK POLICY</Text>
        <Text style={styles.title}>섬똑 개인정보 처리방침</Text>
        <Text style={styles.summary}>
          섬똑은 여객선 운항 정보, 해양 예보, 섬여행 정보와 크루즈 정보를 제공하기 위해 필요한 최소한의 정보만 사용합니다.
        </Text>
        <Text style={styles.effectiveDate}>시행일: {PRIVACY_POLICY_EFFECTIVE_DATE}</Text>
      </View>

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          본 방침은 Google Play 등록 및 서비스 운영을 위해 공개되는 개인정보 처리방침입니다. 앱 기능이나 수집 항목이 변경되면 이 페이지도 함께 갱신됩니다.
        </Text>
      </View>

      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <View key={item} style={styles.itemRow}>
              <Text style={styles.bullet}>-</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>문의가 필요하면 아래 이메일로 연락해 주세요.</Text>
        <Pressable accessibilityRole="button" onPress={openContact} style={styles.contactButton}>
          <Text style={styles.contactButtonText}>{PRIVACY_POLICY_CONTACT_EMAIL}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background
  },
  content: {
    gap: 14,
    marginHorizontal: 'auto',
    maxWidth: 860,
    padding: 20,
    paddingBottom: 42,
    width: '100%'
  },
  header: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  title: {
    color: colors.navy,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 34
  },
  summary: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 24
  },
  effectiveDate: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800'
  },
  noticeBox: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  noticeText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 20
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 18
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '900'
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8
  },
  bullet: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 22
  },
  itemText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22
  },
  footer: {
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700'
  },
  contactButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  contactButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900'
  }
});
