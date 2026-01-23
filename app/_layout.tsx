import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Main layout component that wraps the entire application
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Apply theme based on the device color scheme (dark or light)
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* The 'index' screen is the entry point (app/index.tsx). 
            It handles the initial auth check and Login UI. 
        */}
        <Stack.Screen name="index" /> 
        
        {/* The '(tabs)' group contains the protected home and explore screens.
            Accessed only after a successful login.
        */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}