import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../src/api/axios';

const PUSH_TOKEN_KEY = 'fcm_push_token';
const CHAT_CHANNEL_ID = 'chat-messages';

let appState: AppStateStatus = AppState.currentState;
let activeChatUserId: number | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function setPushAppState(state: AppStateStatus) {
  appState = state;
}

export function setActiveChatForPush(userId: number | null) {
  activeChatUserId = userId;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHAT_CHANNEL_ID, {
    name: 'Notificacion',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2E7D32',
    sound: 'default',
  });
}

/**
 * Requests permission and returns the native FCM (Android) or APNs (iOS) token.
 */
export async function clearChatNotificationBadge(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
    if (Platform.OS === 'android') {
      await Notifications.dismissAllNotificationsAsync();
    }
  } catch (_) {
    // Badge APIs may be unavailable on some devices
  }
}

export async function registerPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
      android: {},
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[Push] Notification permission not granted:', finalStatus);
    return null;
  }

  let tokenResult;
  try {
    tokenResult = await Notifications.getDevicePushTokenAsync();
  } catch (error: any) {
    console.log('[Push] getDevicePushTokenAsync failed:', error?.message);
    return null;
  }
  const token = tokenResult.data;
  if (token) {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  }
  return token || null;
}

/**
 * Sends the device token to Laravel so the server can push via Firebase when the app is closed.
 */
export async function syncPushTokenWithServer(): Promise<void> {
  const userToken = await AsyncStorage.getItem('userToken');
  if (!userToken) return;

  let token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) {
    token = await registerPushNotifications();
  }
  if (!token) return;

  try {
    await axios.post(
      `${API_BASE}/push-token`,
      {
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || Device.modelName || 'unknown',
      },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.log('[Push] Token sync failed (add POST /api/push-token on backend):', error?.message);
  }
}

export async function unregisterPushTokenFromServer(): Promise<void> {
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  const userToken = await AsyncStorage.getItem('userToken');

  if (token && userToken) {
    try {
      await axios.delete(`${API_BASE}/push-token`, {
        data: { token },
        headers: {
          Authorization: `Bearer ${userToken}`,
          Accept: 'application/json',
        },
      });
    } catch (_) {
      // Backend may not implement DELETE yet
    }
  }

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

function shouldSkipNotification(senderId: number): boolean {
  if (appState === 'active' && activeChatUserId === senderId) {
    return true;
  }
  return false;
}

/**
 * Shows a local notification (app in background but still alive).
 * When the phone is locked/killed, the backend must send FCM.
 */
export async function showChatNotification(payload: {
  senderId: number;
  senderName?: string;
  body: string;
}): Promise<void> {
  const { senderId, senderName, body } = payload;
  if (shouldSkipNotification(senderId)) return;

  const preview = body?.length > 120 ? `${body.slice(0, 117)}...` : body;
  const messageBody = senderName ? `${senderName}: ${preview}` : preview;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Notificacion',
      body: messageBody,
      data: {
        type: 'chat',
        sender_id: String(senderId),
        sender_name: senderName || '',
      },
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: CHAT_CHANNEL_ID } : {}),
    },
    trigger: null,
  });
}

export function parseIncomingMessageEvent(e: any) {
  const msg = e?.message || e;
  const senderId = Number(msg?.sender_id ?? e?.sender_id);
  const body = String(msg?.content ?? e?.content ?? 'Nuevo mensaje');
  const senderName = String(
    msg?.sender?.name ?? e?.sender?.name ?? msg?.sender_name ?? ''
  ).trim();
  return { senderId, body, senderName };
}

export async function handleNewMessagePush(e: any): Promise<void> {
  const { senderId, body, senderName } = parseIncomingMessageEvent(e);
  if (!senderId || Number.isNaN(senderId)) return;

  const userData = await AsyncStorage.getItem('userData');
  if (userData) {
    const me = JSON.parse(userData);
    if (Number(me.id) === senderId) return;
  }

  if (appState !== 'active') {
    await showChatNotification({ senderId, senderName, body });
  }
}
