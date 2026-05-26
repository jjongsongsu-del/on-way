import { Tabs } from 'expo-router';
import { CalendarDays, Home, Map, Ship, User } from 'lucide-react-native';

const tintColor = '#0b7285';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tintColor,
        tabBarInactiveTintColor: '#8a99a6',
        tabBarStyle: {
          borderTopColor: '#e7edf2',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
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
        name="routes"
        options={{
          title: '항로',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />
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
          title: '내 정보',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }}
      />
    </Tabs>
  );
}

