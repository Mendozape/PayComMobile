import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

/**
 * RootLayout component
 * Handles the main stack and global theme providers.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Handles initial auth check and Login UI */}
          <Stack.Screen name="index" /> 
          {/* Main application container with Drawer and Tabs */}
          <Stack.Screen name="drawer" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}