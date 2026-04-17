import { Tabs } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Pressable, Image, Platform, DeviceEventEmitter } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Hook to handle safe areas (notched phones and tablet gesture bars)
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE } from '../../../src/api/axios';

/**
 * TabLayout Component
 * Manages the main navigation tabs, global UI listeners, and safe area adjustments.
 * Fix: TabBar background is now dynamic to support Dark Mode.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark'; // Identify current theme
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [userPhoto, setUserPhoto] = useState(null);
  
  const isChatActive = useRef(false);
  const myUserId = useRef(null);
  const countRef = useRef(0);
  const lastSocketTime = useRef(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Syncs unread messages from the server.
   */
  const hardSyncBadge = async () => {
    const timeSinceSocket = Date.now() - lastSocketTime.current;
    if (timeSinceSocket < 3000 || isChatActive.current) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      
      const res = await axios.get(`${API_BASE}/chat/unread-count?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const count = Number(res.data.count || 0);
      countRef.current = count;
      setUnreadCount(count);
    } catch (e) {
      // Background sync failed silently
    }
  };

  useEffect(() => {
    // Load initial user session data
    AsyncStorage.getItem('userData').then(d => {
      if (d) myUserId.current = JSON.parse(d).id;
    });
    AsyncStorage.getItem('userProfilePhoto').then(p => p && setUserPhoto(p));
    
    hardSyncBadge();

    // Listeners for real-time updates
    const photoSub = DeviceEventEmitter.addListener('user-photo-updated', (newPhoto) => {
      setUserPhoto(newPhoto);
    });

    const msgSub = DeviceEventEmitter.addListener('new-message-received', (e) => {
      const msg = e?.message || e;
      const senderId = msg?.sender_id;

      if (senderId && myUserId.current && Number(senderId) === Number(myUserId.current)) return;

      if (!isChatActive.current) {
        lastSocketTime.current = Date.now(); 
        countRef.current += 1;
        setUnreadCount(countRef.current);
      }
    });

    const activeSub = DeviceEventEmitter.addListener('chat-active', (active) => {
      isChatActive.current = active;
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      if (active) {
        countRef.current = 0;
        setUnreadCount(0);
      } else {
        lastSocketTime.current = 0;
        syncTimeoutRef.current = setTimeout(() => {
          hardSyncBadge();
        }, 3000);
      }
    });

    const readSub = DeviceEventEmitter.addListener('chat-messages-read', () => {
      if (isChatActive.current) {
        countRef.current = 0;
        setUnreadCount(0);
      } else {
        setTimeout(() => {
          hardSyncBadge();
        }, 2000);
      }
    });

    return () => {
      photoSub.remove();
      msgSub.remove();
      activeSub.remove();
      readSub.remove();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: true,
      headerStyle: { backgroundColor: '#343a40' },
      headerTintColor: '#fff',
      // FIX: Changed fixed '#fff' to dynamic color based on theme
      tabBarStyle: { 
        backgroundColor: isDark ? '#1a1a1a' : '#fff', // Dark gray for dark mode, white for light mode
        height: Platform.OS === 'ios' ? 88 : (65 + insets.bottom), 
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 8,
        borderTopWidth: isDark ? 0 : 1, // Cleaner look in dark mode
        borderTopColor: isDark ? '#333' : '#eee',
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      headerLeft: () => (
        <Pressable 
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())} 
          style={({ pressed }) => ({ 
            marginLeft: 35, 
            padding: 10,
            opacity: pressed ? 0.5 : 1,
            justifyContent: 'center',
            alignItems: 'center',
          })}
        >
          <IconSymbol name="line.3.horizontal" size={24} color="#fff" />
        </Pressable>
      ),
      headerRight: () => null,
    }}>
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'Inicio', 
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} /> 
        }} 
      />
      
      <Tabs.Screen 
        name="chat" 
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ff3b30', color: 'white' }
        }} 
      />
      
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Mi Perfil', 
          tabBarIcon: ({ color }) => userPhoto 
            ? <Image key={userPhoto} source={{ uri: userPhoto }} style={{ width: 28, height: 28, borderRadius: 14 }} /> 
            : <IconSymbol size={28} name="person.fill" color={color} /> 
        }} 
      />
      
      {/* Hidden Screens mapping */}
      <Tabs.Screen name="chat/[id]" options={{ href: null, title: 'Chat' }} />
      <Tabs.Screen name="residents" options={{ href: null, title: 'Habitantes' }} />
      <Tabs.Screen name="roles" options={{ href: null, title: 'Roles' }} />
      <Tabs.Screen name="permissions" options={{ href: null, title: 'Permisos' }} />
      <Tabs.Screen name="streets" options={{ href: null, title: 'Catálogo de calles' }} />
      <Tabs.Screen name="fees" options={{ href: null, title: 'Catálogo de aportaciones' }} />
      <Tabs.Screen name="expense-categories" options={{ href: null, title: 'Caátalogo de salidas' }} />
      <Tabs.Screen name="expenses" options={{ href: null, title: 'Salidas' }} />
      <Tabs.Screen name="addresses" options={{ href: null, title: 'Predios y aportaciones' }} />
      <Tabs.Screen name="statement" options={{ href: null, title: 'Estatus global' }} />
      <Tabs.Screen name="reports" options={{ href: null, title: 'Reportes' }} />
      <Tabs.Screen name="create-payment" options={{ href: null, title: 'Enviar Notificación' }} />
      <Tabs.Screen name="payment-history" options={{ href: null, title: 'Historial' }} />
    </Tabs>
  );
}