import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
}>;

export function InfoCard({ title, eyebrow, children }: InfoCardProps) {
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    shadowColor: '#12324f',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 2
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
  },
  title: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: '800'
  },
  body: {
    gap: 8
  }
});
