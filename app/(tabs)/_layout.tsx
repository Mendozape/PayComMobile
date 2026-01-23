// TABS LAYOUT - Bottom navigation bar configuration
import { Tabs } from 'expo-router';
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // Sets the active icon color based on the system theme
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Hides the top header for all screens in this layout
        headerShown: false,
        // Enables haptic feedback when tapping the tabs
        tabBarButton: HapticTab,
        // GLOBAL SETTING: This hides the text labels for ALL tabs
        tabBarShowLabel: false,
        // Centers the icons vertically now that labels are removed
        tabBarIconStyle: {
          marginTop: 5,
        },
      }}>
      
      {/* Home screen: Primary resident dashboard */}
      <Tabs.Screen
        name="home" 
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      
      {/* Profile screen: Account management and Logout access */}
      <Tabs.Screen
        name="profile" 
        options={{
          // Set to empty string to ensure no label is rendered
          title: '', 
          // Renders the "person" icon (the "monito")
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}