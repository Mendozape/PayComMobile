import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { initEcho } from '@/services/echo';

/**
 * AGGRESSIVE LOG FILTERING
 * This overrides console.log to ignore the "Permisos" spam 
 * so we can focus on the Chat/Echo debugging.
 */
const originalLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Permisos') || message.includes('🛡️')) {
    return; // Ignore permission-related logs
  }
  originalLog(...args);
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const setup = async () => {
      console.log('🚀 [ROOT] Initializing Echo instance...');
      const e = await initEcho();
      if (e) {
        console.log('✅ [ROOT] Echo connection established');
      } else {
        console.log('⚠️ [ROOT] Echo failed to initialize at root');
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