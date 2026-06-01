import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL, SERVICE_CONTACT_EMAIL, SERVICE_CONTACT_LABEL } from '@/api/config';
import { checkServerHealth } from '@/api/health';
import { colors } from '@/theme/colors';

type ConnectionState = 'checking' | 'online' | 'offline';

type ServerConnectionGateProps = {
  children: React.ReactNode;
};

export function ServerConnectionGate({ children }: ServerConnectionGateProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking');
  const [message, setMessage] = useState('서버 연결 상태를 확인하고 있습니다.');

  const checkConnection = useCallback(async () => {
    setConnectionState('checking');
    setMessage('서버 연결 상태를 확인하고 있습니다.');

    const result = await checkServerHealth();

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

  const openContact = useCallback(() => {
    if (!SERVICE_CONTACT_EMAIL) {
      return;
    }

    const subject = encodeURIComponent('[섬똑] 서버 연결 문의');
    const body = encodeURIComponent(`앱 실행 중 서버 연결 오류가 발생했습니다.\n\nAPI: ${API_BASE_URL}`);
    void Linking.openURL(`mailto:${SERVICE_CONTACT_EMAIL}?subject=${subject}&body=${body}`);
  }, []);

  if (connectionState === 'online') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <View style={styles.iconBox}>
          {connectionState === 'checking' ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <Text style={styles.iconText}>!</Text>
          )}
        </View>
        <Text style={styles.eyebrow}>섬똑 서버 연결</Text>
        <Text style={styles.title}>
          {connectionState === 'checking' ? '서버 상태를 확인하고 있어요' : '서버에 연결되지 않았어요'}
        </Text>
        <Text style={styles.description}>
          {connectionState === 'checking'
            ? '운항 정보와 섬여행 데이터를 안전하게 불러오기 위해 연결 상태를 먼저 확인합니다.'
            : '네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요. 문제가 계속되면 서비스 문의로 알려주세요.'}
        </Text>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>연결 주소</Text>
          <Text style={styles.statusValue} numberOfLines={2}>{API_BASE_URL}</Text>
          <Text style={styles.statusLabel}>상태</Text>
          <Text style={styles.statusValue}>{message}</Text>
        </View>
        {connectionState === 'offline' ? (
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={checkConnection} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>다시 연결하기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!SERVICE_CONTACT_EMAIL}
              onPress={openContact}
              style={[styles.secondaryButton, !SERVICE_CONTACT_EMAIL ? styles.disabledButton : null]}
            >
              <Text style={styles.secondaryButtonText}>서비스 문의</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.contactText}>
          문의: {SERVICE_CONTACT_LABEL}{SERVICE_CONTACT_EMAIL ? ` (${SERVICE_CONTACT_EMAIL})` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background
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
    color: colors.text,
    marginBottom: 6
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
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
  disabledButton: {
    opacity: 0.45
  },
  contactText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted
  }
});
