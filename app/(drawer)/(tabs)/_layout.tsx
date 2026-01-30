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
 * Manages the bottom tab navigation and top header with drawer trigger.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  /**
   * Effect to load the user profile picture from local storage.
   */
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const photo = await AsyncStorage.getItem('userProfilePhoto');
        if (photo) setUserPhoto(photo);
      } catch (e) {
        console.error("Error loading tab photo:", e);
      }
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
        // Header Left: Toggle for the side drawer menu
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
      {/* 🏠 Main Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Panel Principal',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* 👤 Profile Tab with Dynamic Avatar */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Cuenta',
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

      {/* 🚫 HIDDEN SCREENS
          These screens are part of the navigation stack but do not show icons 
          in the bottom tab bar (href: null).
      */}
      
      {/* Residents/Users Module */}
      <Tabs.Screen 
        name="residents" 
        options={{ 
          title: 'Gestión de Residentes', 
          href: null 
        }} 
      />

      {/* Catalog & Maintenance Screens */}
      <Tabs.Screen name="streets" options={{ title: 'Catálogo de Calles', href: null }} />
      <Tabs.Screen name="fees" options={{ title: 'Cuotas de Mantenimiento', href: null }} />
      <Tabs.Screen name="expense-categories" options={{ title: 'Categorías de Gastos', href: null }} />
      <Tabs.Screen name="expenses" options={{ title: 'Control de Gastos', href: null }} />
      <Tabs.Screen name="addresses" options={{ title: 'Catálogo de Predios', href: null }} />
      
      {/* Reports & Financial Statements */}
      <Tabs.Screen name="statement" options={{ title: 'Estado de Cuenta', href: null }} />
      <Tabs.Screen name="reports" options={{ title: 'Generador de Reportes', href: null }} />
      
      {/* Integrated Payment Operations */}
      <Tabs.Screen name="create-payment" options={{ title: 'Registrar Nuevo Pago', href: null }} />
      <Tabs.Screen name="payment-history" options={{ title: 'Historial de Pagos', href: null }} />

    </Tabs>
  );
}