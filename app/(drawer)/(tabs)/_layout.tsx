import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, Image } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Component and Theme imports
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * TabLayout Component
 * Manages the bottom tab navigation and shared header configuration.
 * All user-facing strings are in Spanish, developer comments in English.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  /**
   * Sync profile photo from local storage for the tab icon.
   */
  useEffect(() => {
    const loadPhoto = async () => {
      // Get the persisted photo URL from the login/profile update process
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
          height: 60,
        },

        // HEADER LEFT — Menu button (☰) to toggle the Drawer
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            style={{ marginLeft: 15 }}
          >
            <IconSymbol name="line.3.horizontal" size={26} color="#fff" />
          </Pressable>
        ),

        // HEADER RIGHT — Disabled to prevent UI clutter
        headerRight: () => null,
      }}
    >
      {/* 1. DASHBOARD TAB */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Panel Principal',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* 2. STREETS (Hidden from bottom bar, managed via Drawer) */}
      <Tabs.Screen
        name="streets"
        options={{
          title: 'Calles',
          href: null, // Removes the icon from the bottom tab bar
        }}
      />

      {/* 3. FEES / CUOTAS (Hidden from bottom bar, registered for Drawer navigation) */}
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Cuotas', // Displays "Cuotas" in the top header
          href: null,      // Hide from bottom navigation
        }}
      />

      {/* 4. PROFILE TAB */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi cuenta',
          tabBarIcon: ({ color }) => (
            // Dynamic logic: User photo from storage or fallback to default icon
            userPhoto ? (
              <Image 
                source={{ uri: userPhoto }} 
                style={{ 
                  width: 28, 
                  height: 28, 
                  borderRadius: 14, 
                  borderWidth: 1.5, 
                  borderColor: color 
                }} 
              />
            ) : (
              <IconSymbol size={28} name="person.fill" color={color} />
            )
          ),
        }}
      />
    </Tabs>
  );
}