import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LoginScreen from '../src/screens/LoginScreen'; 

// Import the dynamic API_BASE from your centralized configuration
import { API_BASE } from '../src/api/axios'; 

/**
 * RootIndex Component
 * Acts as the entry point gatekeeper to determine authentication state.
 */
export default function RootIndex() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        const token = await AsyncStorage.getItem('userToken');
        
        if (isLoggedIn === 'true' && token) {
          /**
           * 🛡️ SESSION RECOVERY: We fetch user data to ensure valid credentials
           * and persist the profile photo before the UI renders.
           */
          await fetchUserPhoto(token); 
          
          // Navigation happens only after critical data is fetched or timed out
          router.replace('/(drawer)/(tabs)/home');
        }
      } catch (e) {
        console.error("Session check error:", e);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, []);

  /**
   * Function to download and persist user photo using dynamic API_BASE
   */
  const fetchUserPhoto = async (token: string) => {
    try {
      // Use dynamic ENDPOINT instead of hardcoded local IP
      const response = await axios.get(`${API_BASE}/user`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json' 
        },
        timeout: 5000 // Prevents the app from getting stuck on splash screen
      });

      if (response.data.profile_photo_path) {
        // Construct URL based on the environment (Dev or Production)
        const baseUrl = API_BASE.replace('/api', '');
        const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
        
        // Persist to storage BEFORE navigation happens
        await AsyncStorage.setItem('userProfilePhoto', photoUrl);
      }
    } catch (apiError) {
      /**
       * Silent fail: if network is down or API is slow, 
       * proceed to Home to allow offline interaction if possible.
       */
      console.log("Profile data sync failed, proceeding to dashboard.");
    }
  };

  if (isCheckingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  return <LoginScreen />;
}

const styles = StyleSheet.create({
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff' 
  }
});