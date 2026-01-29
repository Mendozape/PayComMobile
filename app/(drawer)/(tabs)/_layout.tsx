import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, Image, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * TabLayout Component
 * Configures the Bottom Tab Bar and registers hidden administrative routes.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  /**
   * Sync profile photo for the bottom tab icon.
   */
  useEffect(() => {
    const loadPhoto = async () => {
      const photo = await AsyncStorage.getItem('userProfilePhoto');
      if (photo) setUserPhoto(photo);
    };
    loadPhoto();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerStyle: { backgroundColor: '#343a40' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          height: Platform.OS === 'ios' ? 88 : 60,
        },
        // Sidebar Toggle Button
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 15 }}
          >
            <IconSymbol name="line.3.horizontal" size={26} color="#fff" />
          </Pressable>
        ),
      }}
    >
      {/* --- VISIBLE TABS --- */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Panel Principal',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color }) => (
            userPhoto ? (
              <Image 
                source={{ uri: userPhoto }} 
                style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: color }} 
              />
            ) : (
              <IconSymbol size={28} name="person.fill" color={color} />
            )
          ),
        }}
      />

      {/* --- HIDDEN ROUTES (Accessible via Drawer only) --- */}
      <Tabs.Screen name="addresses" options={{ title: 'Predios', href: null }} />
      <Tabs.Screen name="streets" options={{ title: 'Calles', href: null }} />
      <Tabs.Screen name="fees" options={{ title: 'Cuotas', href: null }} />
      <Tabs.Screen name="expenses" options={{ title: 'Gastos', href: null }} />
      <Tabs.Screen name="expense-categories" options={{ title: 'Categorías', href: null }} />

    </Tabs>
  );
}