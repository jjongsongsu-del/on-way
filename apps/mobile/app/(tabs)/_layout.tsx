import { Tabs, usePathname } from 'expo-router';
import { Anchor, CalendarDays, Compass, Home, Map, Ship, User } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

type TabItem = {
  routeName: string;
  params?: Record<string, string>;
  label: string;
  match: string;
  Icon: ComponentType<{ color: string; size: number; strokeWidth?: number }>;
};

const tabItems: TabItem[] = [
  { routeName: 'index', label: '섬똑', match: '/', Icon: Home },
  { routeName: 'schedule', label: '시간표', match: '/schedule', Icon: CalendarDays },
  { routeName: 'islands', params: { mode: 'trip' }, label: '섬여행', match: '/islands:trip', Icon: Compass },
  { routeName: 'cruise', label: '크루즈', match: '/cruise', Icon: Anchor },
  { routeName: 'forecast', label: '예보', match: '/forecast', Icon: Ship },
  { routeName: 'profile', label: '내정보', match: '/profile', Icon: User }
];

type TabNavigation = {
  navigate: (routeName: string, params?: Record<string, string>) => void;
};

type TabState = {
  index: number;
  routes: Array<{
    name: string;
    params?: Readonly<object>;
  }>;
};

export default function TabLayout() {
  return (
    <Tabs
      tabBar={({ navigation, state }) => <SeomttokTabBar navigation={navigation} state={state} />}
      screenOptions={{
        headerShown: false
      }}
    >
      <Tabs.Screen name="index" options={{ title: '섬똑' }} />
      <Tabs.Screen name="schedule" options={{ title: '시간표' }} />
      <Tabs.Screen name="island-trip" options={{ title: '섬여행' }} />
      <Tabs.Screen name="trip" options={{ href: null, title: '섬여행' }} />
      <Tabs.Screen name="islands" options={{ title: '섬지도' }} />
      <Tabs.Screen name="cruise" options={{ title: '크루즈' }} />
      <Tabs.Screen name="my-trip" options={{ href: null, title: '섬코스' }} />
      <Tabs.Screen name="forecast" options={{ title: '예보' }} />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: '내정보',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          href: null,
          title: '항로',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />
        }}
      />
    </Tabs>
  );
}

function SeomttokTabBar({ navigation, state }: { navigation: TabNavigation; state: TabState }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  const currentParams = currentRoute?.params as { mode?: unknown } | undefined;
  const currentMode = currentParams?.mode;

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom + 12, 26) }]}>
      {tabItems.map((item) => {
        const active =
          item.match === '/'
            ? pathname === '/'
            : item.match === '/islands:trip'
              ? currentRoute?.name === 'islands' && currentMode === 'trip'
              : item.match === '/islands:my-trip'
                ? currentRoute?.name === 'islands' && currentMode === 'my-trip'
                : pathname.startsWith(item.match);
        const color = active ? colors.primary : '#8a99a6';
        const Icon = item.Icon;

        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={active ? { selected: true } : undefined}
            accessibilityLabel={item.label}
            onPress={() => navigation.navigate(item.routeName, item.params)}
            style={styles.tabItem}
          >
            <Icon color={color} size={22} strokeWidth={active ? 2.8 : 2.4} />
            <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#12324f',
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8
  },
  tabItem: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 1
  },
  tabLabel: {
    maxWidth: '100%',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0
  }
});
