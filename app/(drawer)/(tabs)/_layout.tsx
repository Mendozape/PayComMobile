import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native'; //
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();

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
        tabBarIconStyle: { marginTop: 5 },
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          height: 60,
        },

        // LEFT — Profile icon
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.navigate('profile')}
            style={{ marginLeft: 15 }}
          >
            <IconSymbol name="person.fill" size={24} color="#fff" />
          </Pressable>
        ),

        // RIGHT — Drawer button (☰) corregido para iPhone
        headerRight: () => (
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())} //
            style={{ marginRight: 15 }}
          >
            {/* Asegúrate de agregar 'line.3.horizontal' a tu MAPPING */}
            <IconSymbol name="line.3.horizontal" size={26} color="#fff" />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* Esta pestaña existe pero NO se ve abajo (solo accesible vía Drawer) */}
      <Tabs.Screen
        name="streets"
        options={{
          title: 'Streets',
          href: null, // - Esto oculta el icono de la barra inferior
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}