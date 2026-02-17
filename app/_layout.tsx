import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initEcho } from '@/services/echo';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const setup = async () => {
      const echo = await initEcho();
      const userData = await AsyncStorage.getItem('userData');
      
      if (echo && userData) {
        const user = JSON.parse(userData);
        
        // Listen to personal notification channel and broadcast to entire app
        echo.private(`App.Models.User.${user.id}`)
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