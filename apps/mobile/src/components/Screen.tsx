import type { PropsWithChildren, RefObject } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  mascotSource?: ImageSourcePropType;
  scrollRef?: RefObject<ScrollView | null>;
}>;

export function Screen({ title, subtitle, mascotSource, scrollRef, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {mascotSource ? (
              <View style={styles.titleMascotBox}>
                <Image source={mascotSource} style={styles.titleMascot} resizeMode="contain" />
              </View>
            ) : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 42
  },
  header: {
    gap: 6
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0
  },
  titleMascotBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    shadowColor: '#12324f',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    width: 48,
    elevation: 2
  },
  titleMascot: {
    height: 38,
    width: 38
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  }
});
