import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType
} from 'react-native';
import { SERVICE_CONTACT_EMAIL } from '@/api/config';
import { checkServerHealth } from '@/api/health';
import { colors } from '@/theme/colors';

type ConnectionState = 'checking' | 'online' | 'offline';

type ServerConnectionGateProps = {
  children: ReactNode;
};

type StartupGuide = {
  image: ImageSourcePropType;
  eyebrow: string;
  title: string;
  description: string;
};

const CONTACT_EMAIL = SERVICE_CONTACT_EMAIL || 'dottoril.ee@gmail.com';
const CONTACT_SUBJECT = '섬똑 서비스 문의 - 서버연결 오류';
const MIN_GUIDE_DURATION_MS = 2600;

const STARTUP_GUIDES: StartupGuide[] = [
  {
    image: require('../../assets/mascot/boogi-schedule.png'),
    eyebrow: '여객선 시간표',
    title: '오늘 탈 배편을 먼저 확인해요',
    description: '출발지와 도착지를 기준으로 운항 후보와 상세 시간표를 빠르게 보여드릴게요.'
  },
  {
    image: require('../../assets/mascot/boogi-routes.png'),
    eyebrow: '섬지도와 항로',
    title: '가고 싶은 섬과 항로를 이어봐요',
    description: '섬 위치, 항로, 주변 정보를 함께 보며 여행 동선을 쉽게 잡을 수 있어요.'
  },
  {
    image: require('../../assets/mascot/boogi-forecast.png'),
    eyebrow: '운항 예보',
    title: '바다 날씨와 안전 정보를 챙겨요',
    description: '풍속, 파고, 조석, 특보를 확인해 안전한 섬여행을 준비할 수 있어요.'
  },
  {
    image: require('../../assets/mascot/boogi-profile.png'),
    eyebrow: '나만의 섬여행',
    title: '즐겨찾기와 최근 조회를 기억해요',
    description: '자주 보는 항로와 관심 섬을 모아 다음 이동도 빠르게 시작할 수 있어요.'
  }
];

function waitForMinimumGuideDuration(startedAt: number) {
  const remaining = MIN_GUIDE_DURATION_MS - (Date.now() - startedAt);

  if (remaining <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    setTimeout(resolve, remaining);
  });
}

export function ServerConnectionGate({ children }: ServerConnectionGateProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [message, setMessage] = useState('서버 연결 상태를 확인하고 있습니다.');
  const [guideIndex, setGuideIndex] = useState(0);
  const [isLocalMode, setIsLocalMode] = useState(false);

  const checkConnection = useCallback(async () => {
    const startedAt = Date.now();

    setIsLocalMode(false);
    setConnectionState('checking');
    setMessage('서버 연결 상태를 확인하고 있습니다.');

    const result = await checkServerHealth();
    await waitForMinimumGuideDuration(startedAt);

    if (result.ok) {
      setConnectionState('online');
      return;
    }

    setConnectionState('offline');
    setMessage(result.message ?? '서버에 연결할 수 없습니다.');
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connectionState !== 'checking') {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setGuideIndex((current) => (current + 1) % STARTUP_GUIDES.length);
    }, 1800);

    return () => clearInterval(intervalId);
  }, [connectionState]);

  const contactBody = useMemo(
    () =>
      [
        '섬똑 앱 실행 중 서버 연결 오류가 발생했습니다.',
        '',
        `오류 내용: ${message}`,
        '',
        '확인 요청드립니다.'
      ].join('\n'),
    [message]
  );

  const openContact = useCallback(() => {
    const subject = encodeURIComponent(CONTACT_SUBJECT);
    const body = encodeURIComponent(contactBody);
    void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`);
  }, [contactBody]);

  const enterLocalMode = useCallback(() => {
    setIsLocalMode(true);
    setConnectionState('online');
  }, []);

  const closeApp = useCallback(() => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
      return;
    }

    setConnectionState('offline');
  }, []);

  if (connectionState === 'online') {
    if (!isLocalMode) {
      return <>{children}</>;
    }

    return (
      <View style={styles.appShell}>
        <View style={styles.localBanner}>
          <Text style={styles.localBannerTitle}>로컬사용 중</Text>
          <Text style={styles.localBannerText}>서버 연결 전까지 일부 서비스가 제한될 수 있습니다.</Text>
        </View>
        <View style={styles.childArea}>{children}</View>
      </View>
    );
  }

  if (connectionState === 'checking') {
    const guide = STARTUP_GUIDES[guideIndex];

    return (
      <View style={styles.container}>
        <View style={styles.startPanel}>
          <Image source={guide.image} style={styles.guideImage} resizeMode="contain" />
          <Text style={styles.eyebrow}>{guide.eyebrow}</Text>
          <Text style={styles.startTitle}>{guide.title}</Text>
          <Text style={styles.description}>{guide.description}</Text>
          <View style={styles.progressRow}>
            {STARTUP_GUIDES.map((item, index) => (
              <View
                key={item.eyebrow}
                style={[styles.progressDot, index === guideIndex ? styles.progressDotActive : null]}
              />
            ))}
          </View>
          <View style={styles.checkingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.checkingText}>섬똑을 준비하고 있어요</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.eyebrow}>섬똑 서버 연결</Text>
        <Text style={styles.title}>서버에 연결되지 않았어요</Text>
        <Text style={styles.description}>
          네트워크 상태를 확인한 뒤 다시 연결해 주세요. 계속 연결되지 않으면 로컬사용으로 앱을 열 수 있지만,
          일부 서비스가 제한될 수 있습니다.
        </Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>상태</Text>
          <Text style={styles.statusValue}>{message}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={checkConnection} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>다시 연결하기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={enterLocalMode} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>로컬사용</Text>
          </Pressable>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={openContact} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>서비스 문의</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={closeApp} style={styles.neutralButton}>
            <Text style={styles.neutralButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: colors.background
  },
  childArea: {
    flex: 1
  },
  localBanner: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.primarySoft
  },
  localBannerTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primaryDark,
    marginBottom: 2
  },
  localBannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.text
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background
  },
  startPanel: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#001b44',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#001b44',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  guideImage: {
    width: '100%',
    height: 210,
    marginBottom: 16
  },
  iconBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    marginBottom: 18
  },
  iconText: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.danger
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8
  },
  startTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.navy,
    marginBottom: 10
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 18
  },
  statusBox: {
    gap: 6,
    padding: 16,
    borderRadius: 8,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark
  },
  statusValue: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text
  },
  progressRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 18
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border
  },
  progressDotActive: {
    width: 22,
    backgroundColor: colors.primary
  },
  checkingRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.primarySoft
  },
  checkingText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.surface
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary
  },
  neutralButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft
  },
  neutralButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text
  }
});
