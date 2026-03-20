import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { DeviceEventEmitter, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initEcho, getEcho } from '@/services/echo';
import Config from '@/constants/Config';

LogBox.ignoreLogs(['Setting a timer']);


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const setupGlobalEcho = async () => {
      try {
        
        const userData = await AsyncStorage.getItem('userData');
        if (!userData) {
          return;
        }

        const user = JSON.parse(userData);
        const prefix = Config.getChannelPrefix();
        
        const echo = await initEcho();

        if (echo && isMounted.current) {
          const channelName = `${prefix}App.Models.User.${user.id}`;

         
          echo.private(channelName)
            .stopListening('.MessageSent') 
            .listen('.MessageSent', (e: any) => {
              
              DeviceEventEmitter.emit('new-message-received', e);
            });

          
          echo.connector.pusher.connection.bind('state_change', (states: any) => {
            
          });
        }
      } catch (error) {
        console.error('❌ [ROOT] Error in Echo setup:', error);
      }
    };

    setupGlobalEcho();

    
    const loginSub = DeviceEventEmitter.addListener('user-logged-in', () => {
      setupGlobalEcho();
    });

    return () => {
      isMounted.current = false;
      loginSub.remove();
      const echo = getEcho();
      if (echo) {
        
      }
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}