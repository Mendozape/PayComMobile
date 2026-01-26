// Drawer layout (side menu)

import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false, // Tabs already have header
        drawerActiveTintColor: '#007bff',
        drawerLabelStyle: { marginLeft: -10 },
      }}
    >
      {/* This loads the Tabs layout inside the drawer */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Dashboard',
          title: 'Dashboard',
          drawerIcon: ({ color }) => (
            <IconSymbol name="house.fill" size={22} color={color} />
          ),
        }}
      />

      {/* Future modules go here */}
      <Drawer.Screen
        name="streets"
        options={{
          drawerLabel: 'Streets',
          title: 'Streets',
          drawerIcon: ({ color }) => (
            <IconSymbol name="road.fill" size={22} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
