import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter, LogBox, View, Dimensions, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { initEcho } from '@/services/echo';
import Config from '@/constants/Config';
import Toast from 'react-native-toast-message'; 
import { ThemedText } from '@/components/themed-text';
import {
  handleNewMessagePush,
  registerPushNotifications,
  setActiveChatForPush,
  setPushAppState,
  syncPushTokenWithServer,
} from '@/services/pushNotifications';
import { checkAppVersion } from '@/services/versionEnforcement';
import * as Updates from 'expo-updates';

// Get screen dimensions for centering
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * SILENCE LOGBOX BANNERS
 * This prevents developer error screens for handled network issues.
 */
LogBox.ignoreLogs([
  'Setting a timer',
  'AxiosError',
  'Request failed with status code 403',
  'Fetch Roles Error',
  'Fetch Users Error'
]);

/**
 * Toast Configuration
 */
const toastConfig = {
  success: ({ text1, text2 }: any) => (
    <View style={styles.centeredContainer}>
      <View style={[styles.bubble, { backgroundColor: '#28a745' }]}>
        <ThemedText style={styles.text1}>{text1}</ThemedText>
        {text2 && <ThemedText style={styles.text2}>{text2}</ThemedText>}
      </View>
    </View>
  ),
  info: ({ text1, text2 }: any) => (
    <View style={styles.centeredContainer}>
      <View style={[styles.bubble, { backgroundColor: '#007AFF' }]}>
        <ThemedText style={styles.text1}>{text1}</ThemedText>
        {text2 && <ThemedText style={styles.text2}>{text2}</ThemedText>}
      </View>
    </View>
  ),
  error: ({ text1, text2 }: any) => (
    <View style={styles.centeredContainer}>
      <View style={[styles.bubble, { backgroundColor: '#ff4444' }]}>
        <ThemedText style={styles.text1}>{text1}</ThemedText>
        {text2 && <ThemedText style={styles.text2}>{text2}</ThemedText>}
      </View>
    </View>
  ),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const setupPush = async () => {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      if (isLoggedIn !== 'true') return;
      await registerPushNotifications();
      await syncPushTokenWithServer();
    };

    setupPush();

    const checkOtaUpdate = async () => {
      if (__DEV__ || !Updates.isEnabled) return;
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log('[OTA] Update check failed:', error);
      }
    };

    checkOtaUpdate();

    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      setPushAppState(nextState);
      if (nextState === 'active') {
        checkOtaUpdate();
        syncPushTokenWithServer();
        const versionResult = await checkAppVersion();
        if (!versionResult.allowed) {
          router.replace('/');
        }
      }
    });
    setPushAppState(AppState.currentState);

    const chatActiveSub = DeviceEventEmitter.addListener('chat-active', (data) => {
      setActiveChatForPush(data?.active && data?.id ? Number(data.id) : null);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'chat' && data?.sender_id) {
        router.push({
          pathname: '/(drawer)/(tabs)/chat/[id]',
          params: {
            id: String(data.sender_id),
            name: String(data.sender_name || 'Chat'),
          },
        });
      }
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      if (data?.type === 'chat') {
        DeviceEventEmitter.emit('new-message-received', {
          message: {
            sender_id: Number(data.sender_id),
            content: notification.request.content.body,
          },
        });
      }
    });

    const setupGlobalEcho = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (!userData) return;
        const user = JSON.parse(userData);
        const prefix = Config.getChannelPrefix();
        const echo = await initEcho();
        if (echo && isMounted.current) {
          const channelName = `${prefix}App.Models.User.${user.id}`;
          echo.private(channelName)
            .stopListening('.MessageSent') 
            .listen('.MessageSent', (e: any) => {
              DeviceEventEmitter.emit('new-message-received', e);
              handleNewMessagePush(e);
            });
        }
      } catch (error) {
        // Log to terminal only, prevents dev screen
        console.log('❌ [ROOT] Echo setup error:', error);
      }
    };

    setupGlobalEcho();
    const loginSub = DeviceEventEmitter.addListener('user-logged-in', async () => {
      await registerPushNotifications();
      await syncPushTokenWithServer();
      setupGlobalEcho();
    });

    return () => {
      isMounted.current = false;
      loginSub.remove();
      appStateSub.remove();
      chatActiveSub.remove();
      responseSub.remove();
      receivedSub.remove();
    };
  }, []);

  // FIXED: Removed the "ok" typo here
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        </Stack>
        
        <Toast 
          config={toastConfig} 
          position="top" 
          topOffset={SCREEN_HEIGHT / 2 - 40} 
          visibilityTime={2500}
        /> 
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bubble: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    maxWidth: '85%',
  },
  text1: {
    fontSize: 17,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  text2: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
  },
});