import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

type StatusPillProps = {
  label: string;
  tone?: 'good' | 'warning' | 'danger' | 'neutral';
};

const toneStyle = {
  good: { backgroundColor: '#def8ef', color: colors.good },
  warning: { backgroundColor: '#fff2d6', color: colors.warning },
  danger: { backgroundColor: '#ffe2e2', color: colors.danger },
  neutral: { backgroundColor: '#e8eef5', color: colors.muted }
};

export function StatusPill({ label, tone = 'neutral' }: StatusPillProps) {
  const colorSet = toneStyle[tone];

  return (
    <View style={[styles.pill, { backgroundColor: colorSet.backgroundColor }]}>
      <Text style={[styles.text, { color: colorSet.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  text: {
    fontSize: 12,
    fontWeight: '800'
  }
});
