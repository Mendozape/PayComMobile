import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let echo: Echo<any> | null = null;
let echoToken: string | null = null;

export const initEcho = async (): Promise<Echo<any> | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;

    const isConnected = echo?.connector?.pusher?.connection?.state === 'connected';
    if (echo && echoToken === token && isConnected) return echo;

    if (echo) {
      echo.disconnect();
      echo = null;
    }

    echoToken = token;
    (global as any).Pusher = Pusher;

    echo = new Echo({
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

    return echo;
  } catch (error) {
    console.error('❌ [ECHO] Init failed');
    return null;
  }
};

export const getEcho = () => echo;

export const disconnectEcho = () => {
  if (echo) {
    echo.disconnect();
    echo = null;
    echoToken = null;
  }
};