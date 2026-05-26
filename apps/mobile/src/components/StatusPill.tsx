import { StyleSheet, Text, View } from 'react-native';

type StatusPillProps = {
  label: string;
  tone?: 'good' | 'warning' | 'danger' | 'neutral';
};

const toneStyle = {
  good: { backgroundColor: '#e3fcef', color: '#087f5b' },
  warning: { backgroundColor: '#fff4d6', color: '#9a6700' },
  danger: { backgroundColor: '#ffe3e3', color: '#c92a2a' },
  neutral: { backgroundColor: '#edf2f7', color: '#52616f' }
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

