import { Tabs } from 'expo-router';
import { CalendarDays, Compass, Home, Map, MapPin, Ship, User } from 'lucide-react-native';
import { colors } from '@/theme/colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8a99a6',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 8,
          height: 70,
          paddingBottom: 9,
          paddingTop: 9,
          shadowColor: '#12324f',
          shadowOffset: { height: -8, width: 0 },
          shadowOpacity: 0.06,
          shadowRadius: 16
        },
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 4,
          marginVertical: 6
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          letterSpacing: 0
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '바다누리',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '시간표',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="island-trip"
        options={{
          title: '섬여행',
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="islands"
        options={{
          title: '섬지도',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="forecast"
        options={{
          title: '예보',
          tabBarIcon: ({ color, size }) => <Ship color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
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
