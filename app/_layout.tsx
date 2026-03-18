import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initEcho } from '@/services/echo';
// IMPORT: Centralized configuration to handle environment prefixes
import Config from '@/constants/Config';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const setup = async () => {
      const echo = await initEcho();
      const userData = await AsyncStorage.getItem('userData');
      
      if (echo && userData) {
        const user = JSON.parse(userData);
        
        // Get the environment prefix ('dev_' or 'prod_') from Config.js
        const prefix = Config.getChannelPrefix();

        /**
         * Listen to personal notification channel using the environment prefix.
         * This ensures that production events from the live domain do not 
         * trigger listeners or counters on local development devices.
         */
        echo.private(`${prefix}App.Models.User.${user.id}`)
          .stopListening('.MessageSent')
          .listen('.MessageSent', (e: any) => {
            DeviceEventEmitter.emit('new-message-received', e);
          });
      }
    };
    setup();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}