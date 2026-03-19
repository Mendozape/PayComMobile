import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Config from '../constants/Config'; // Global app config (ENV, prefixes, etc.)
import { API_BASE } from '../src/api/axios'; 

let echoInstance: Echo<any> | null = null;

/**
 * Initializes a singleton Echo instance.
 * Prevents multiple socket connections and duplicated listeners.
 */
export const initEcho = async (): Promise<Echo<any> | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    // Avoid reconnecting if already connected
    if (
      echoInstance &&
      echoInstance.connector.pusher.connection.state === 'connected'
    ) {
      return echoInstance;
    }

    // Clean up any stale instance
    if (echoInstance) {
      echoInstance.disconnect();
    }

    // Required by Laravel Echo (React Native environment)
    (global as any).Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: '66e12194484209bfb23d',
      cluster: 'mt1',
      forceTLS: Config.ENV === 'prod' ? true : false, 
      disableStats: true,

      // Dynamic API endpoint (works for both dev and production)
      authEndpoint: `${API_BASE}/broadcasting/auth`,

      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    /**
     * Debug listeners (very useful in production debugging)
     */
    echoInstance.connector.pusher.connection.bind('connected', () => {
      console.log('✅ [ECHO] Connected');
    });

    echoInstance.connector.pusher.connection.bind('error', (err: any) => {
      console.log('❌ [ECHO ERROR]', err);
    });

    return echoInstance;
  } catch (error) {
    console.error('❌ [ECHO] Critical Initialization Error', error);
    return null;
  }
};

/**
 * Generates a prefixed channel name.
 * Ensures environment isolation between dev and production.
 *
 * Example:
 * dev  -> dev_chat.1.2
 * prod -> prod_chat.1.2
 */
export const getPrefixedChannel = (channel: string): string => {
  const prefix = Config.getChannelPrefix();
  return `${prefix}${channel}`;
};

/**
 * Returns the current active Echo instance.
 */
export const getEcho = () => echoInstance;

/**
 * Gracefully disconnects Echo and clears the instance.
 */
export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};