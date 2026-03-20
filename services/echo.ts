import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Config from '../constants/Config'; 
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

    // Avoid reconnecting if already connected and active
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
          /**
           * Critical header for Laravel Sanctum/CORS to 
           * recognize the request as an AJAX/API call.
           */
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    });

    // Lifecycle event binders without console logs
    echoInstance.connector.pusher.connection.bind('connected', () => {
      // Socket connected
    });

    echoInstance.connector.pusher.connection.bind('error', (err: any) => {
      // Socket error handling
    });

    return echoInstance;
  } catch (error) {
    return null;
  }
};

/**
 * Generates a prefixed channel name.
 * Ensures environment isolation between dev and production.
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