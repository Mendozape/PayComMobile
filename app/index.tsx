import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LoginScreen from '../src/screens/LoginScreen';
import ForceUpdateScreen from '../src/components/ForceUpdateScreen';
import { checkAppVersion } from '../services/versionEnforcement';
import { API_BASE } from '../src/api/axios';

/**
 * RootIndex — version gate runs for ALL users (logged in or not).
 */
export default function RootIndex() {
  const router = useRouter();
  const [bootState, setBootState] = useState('loading');
  const [versionBlock, setVersionBlock] = useState(null);

  useEffect(() => {
    const boot = async () => {
      const versionResult = await checkAppVersion();

      if (!versionResult.allowed) {
        setVersionBlock({
          currentVersion: versionResult.currentVersion,
          minVersion: versionResult.minVersion,
          storeUrl: versionResult.storeUrl,
        });
        setBootState('blocked');
        return;
      }

      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        const token = await AsyncStorage.getItem('userToken');

        if (isLoggedIn === 'true' && token) {
          await fetchUserPhoto(token);
          router.replace('/(drawer)/(tabs)/home');
          return;
        }
      } catch (e) {
        console.error('Session check error:', e);
      }

      setBootState('login');
    };

    boot();
  }, []);

  const fetchUserPhoto = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 5000,
      });

      if (response.data.profile_photo_path) {
        const baseUrl = API_BASE.replace('/api', '');
        const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
        await AsyncStorage.setItem('userProfilePhoto', photoUrl);
      }
    } catch (apiError) {
      console.log('Profile data sync failed, proceeding to dashboard.');
    }
  };

  if (bootState === 'loading') {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  if (bootState === 'blocked' && versionBlock) {
    return (
      <ForceUpdateScreen
        currentVersion={versionBlock.currentVersion}
        minVersion={versionBlock.minVersion}
        storeUrl={versionBlock.storeUrl}
      />
    );
  }

  return <LoginScreen />;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
