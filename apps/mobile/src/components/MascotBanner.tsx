import type { ImageSourcePropType } from 'react-native';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

type MascotBannerProps = {
  imageSource: ImageSourcePropType;
  eyebrow: string;
  title: string;
  description: string;
  tone?: 'blue' | 'mint' | 'amber' | 'coral';
};

const toneStyle = {
  blue: { backgroundColor: colors.primarySoft, accent: colors.primary },
  mint: { backgroundColor: '#ddf8f1', accent: colors.good },
  amber: { backgroundColor: '#fff2d6', accent: colors.amber },
  coral: { backgroundColor: '#ffe8e8', accent: colors.coral }
};

export function MascotBanner({ imageSource, eyebrow, title, description, tone = 'blue' }: MascotBannerProps) {
  const selectedTone = toneStyle[tone];

  return (
    <View style={[styles.banner, { backgroundColor: selectedTone.backgroundColor }]}>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: selectedTone.accent }]}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.imageFrame}>
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 148,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  copy: {
    flex: 1,
    gap: 5,
    justifyContent: 'center'
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900'
  },
  title: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26
  },
  description: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19
  },
  imageFrame: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    width: 108
  },
  image: {
    height: 132,
    width: 120
  }
});
