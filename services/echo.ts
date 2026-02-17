import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let echoInstance: Echo<any> | null = null;

/**
 * Initializes the Echo instance as a singleton.
 * Prevents multiple connections that cause event listener leaks.
 */
export const initEcho = async (): Promise<Echo<any> | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    // If already connected and token is the same, reuse instance
    if (echoInstance && echoInstance.connector.pusher.connection.state === 'connected') {
      return echoInstance;
    }

    // Clean up previous instance if it exists but is not connected
    if (echoInstance) {
      echoInstance.disconnect();
    }

    (global as any).Pusher = Pusher;
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: '66e12194484209bfb23d',
      cluster: 'mt1',
      forceTLS: false,
      disableStats: true,
      authEndpoint: 'http://192.168.1.16:8000/api/broadcasting/auth',
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    return echoInstance;
  } catch (error) {
    console.error('❌ [ECHO] Critical Init Error');
    return null;
  }
};

export const getEcho = () => echoInstance;

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};