import { Tabs } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, Image, Platform, DeviceEventEmitter } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getEcho, initEcho } from '@/services/echo';

/**
 * Main Layout for Tabs.
 * Manages global unread count and real-time socket synchronization.
 */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Ref to track chat active state safely across renders without global leaks
  const isChatActiveRef = useRef(false);
  const checkIntervalRef = useRef<any>(null);

  /**
   * Fetches the true unread count from the backend.
   */
  const fetchCountFromServer = useCallback(async () => {
    try {
      // If we are currently inside a chat, we force the badge to 0
      if (isChatActiveRef.current) {
        setUnreadCount(0);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await axios.get(
        'http://192.168.1.16:8000/api/chat/unread-count',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newCount = Number(response.data.count);
      console.log(`🎯 [BADGE] Current unread messages: ${newCount}`);
      setUnreadCount(newCount);

    } catch {
      console.error('❌ [BADGE] Sync error');
    }
  }, []);

  /**
   * Initializes profile photo and WebSocket listeners.
   */
  const initializeData = async () => {
    try {
      const [photo, userDataJson] = await Promise.all([
        AsyncStorage.getItem('userProfilePhoto'),
        AsyncStorage.getItem('userData')
      ]);

      if (photo) setUserPhoto(photo);

      await fetchCountFromServer();

      if (userDataJson) {
        const user = JSON.parse(userDataJson);
        const echo = await initEcho();

        if (echo) {
          echo.private(`App.Models.User.${user.id}`)
            .stopListening('.MessageSent')
            .listen('.MessageSent', () => {
              console.log('📨 [SOCKET] Layout received new message event');
              fetchCountFromServer();
              // Signal ChatContactsScreen to refresh individual counts
              DeviceEventEmitter.emit('new-message-received');
            });
        }
      }
    } catch {
      console.error('❌ [INIT] Layout initialization error');
    }
  };

  useEffect(() => {
    initializeData();

    // Watchdog to ensure the socket stays alive
    checkIntervalRef.current = setInterval(() => {
      const echo = getEcho();
      if (!echo || echo.connector.pusher.connection.state !== 'connected') {
        console.log('🔄 [WATCHDOG] Reconnecting socket...');
        initializeData();
      }
    }, 15000);

    // Listener for read receipts from detail screen
    const readSub = DeviceEventEmitter.addListener('chat-messages-read', fetchCountFromServer);

    // Listener to toggle counting based on active chat focus
    const activeSub = DeviceEventEmitter.addListener('chat-active', (active: boolean) => {
      console.log(`📱 [TAB] Setting isChatActive to: ${active}`);
      isChatActiveRef.current = active;
      if (active) {
        setUnreadCount(0);
      } else {
        fetchCountFromServer();
      }
    });

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      readSub.remove();
      activeSub.remove();
    };
  }, [fetchCountFromServer]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        headerStyle: { backgroundColor: '#343a40' },
        headerTintColor: '#fff',
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          height: Platform.OS === 'ios' ? 88 : 60,
        },
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
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Mensajes',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="paperplane.fill" color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#ff3b30',
            color: '#fff',
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Mi Cuenta',
          tabBarIcon: ({ color }) =>
            userPhoto ? (
              <Image
                source={{ uri: userPhoto }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
            ) : (
              <IconSymbol size={28} name="person.fill" color={color} />
            ),
        }}
      />

      <Tabs.Screen name="chat/[id]" options={{ href: null, headerShown: true, title: 'Chat' }} />
      <Tabs.Screen name="residents" options={{ href: null }} />
      <Tabs.Screen name="roles" options={{ href: null }} />
      <Tabs.Screen name="permissions" options={{ href: null }} />
      <Tabs.Screen name="streets" options={{ href: null }} />
      <Tabs.Screen name="fees" options={{ href: null }} />
      <Tabs.Screen name="expense-categories" options={{ href: null }} />
      <Tabs.Screen name="expenses" options={{ href: null }} />
      <Tabs.Screen name="addresses" options={{ href: null }} />
      <Tabs.Screen name="statement" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="create-payment" options={{ href: null }} />
      <Tabs.Screen name="payment-history" options={{ href: null }} />
    </Tabs>
  );
}