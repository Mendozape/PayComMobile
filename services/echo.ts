import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORT: Adjust the relative path to your axios configuration file
import { API_BASE } from '../src/api/axios'; 

let echoInstance: Echo<any> | null = null;

/**
 * Initializes the Echo instance as a singleton.
 * This prevents multiple socket connections that lead to memory leaks and duplicate events.
 */
export const initEcho = async (): Promise<Echo<any> | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    // Check if instance already exists and is connected to avoid redundant connections
    if (echoInstance && echoInstance.connector.pusher.connection.state === 'connected') {
      return echoInstance;
    }

    // Disconnect any existing stale instance
    if (echoInstance) {
      echoInstance.disconnect();
    }

    // Attach Pusher to global scope as required by Laravel Echo
    (global as any).Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: '66e12194484209bfb23d',
      cluster: 'mt1',
      // SET TO TRUE: Required for secure WSS connections on production domains (SSL)
      forceTLS: true, 
      disableStats: true,
      // DYNAMIC ENDPOINT: Uses API_BASE to automatically switch between local IP and production domain.
      // This solves the BlueStacks connectivity issue by pointing to the correct environment.
      authEndpoint: `${API_BASE}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    return echoInstance;
  } catch (error) {
    console.error('❌ [ECHO] Critical Initialization Error', error);
    return null;
  }
};

/**
 * Returns the current active Echo instance.
 */
export const getEcho = () => echoInstance;

/**
 * Gracefully disconnects and clears the Echo instance.
 */
export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};