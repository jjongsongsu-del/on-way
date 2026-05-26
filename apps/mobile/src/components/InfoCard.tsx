import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    borderColor: '#dbe5ec',
    backgroundColor: '#ffffff',
    padding: 16
  },
  eyebrow: {
    color: '#0b7285',
    fontSize: 12,
    fontWeight: '700'
  },
  title: {
    color: '#102a43',
    fontSize: 18,
    fontWeight: '800'
  },
  body: {
    gap: 8
  }
});

