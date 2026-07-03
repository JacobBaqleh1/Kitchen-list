import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { UserMenuButton } from '@/src/components/user-menu';
import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.green600,
        tabBarInactiveTintColor: colors.gray500,
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.green600,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'MyKitchenList',
          headerRight: () => <UserMenuButton />,
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="fridge"
        options={{
          title: 'Fridge',
          headerTitle: 'Fridge & Pantry',
          href: null,
        }}
      />
      <Tabs.Screen
        name="meal"
        options={{
          title: 'Meals',
          headerTitle: 'AI Meal Ideas',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: 'Share',
          headerTitle: 'Share your list',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'person.2', android: 'group', web: 'group' }} tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ color }) => (
            <SymbolView name={{ ios: 'gearshape', android: 'settings', web: 'settings' }} tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
