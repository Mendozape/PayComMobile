import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LoginScreen from '../src/screens/LoginScreen'; 

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
           * CRITICAL CHANGE: We MUST wait for the user data here.
           * This ensures the photo is saved in AsyncStorage BEFORE
           * the TabLayout component tries to read it.
           */
          await fetchUserPhoto(token); 
          
          // Now it is safe to move to home
          router.replace('/(tabs)/home');
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
   * Function to download and persist user photo
   */
  const fetchUserPhoto = async (token: string) => {
    try {
      const response = await axios.get('http://192.168.1.16:8000/api/user', {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json' 
        },
        timeout: 5000 // Give it up to 5 seconds to respond
      });

      if (response.data.profile_photo_path) {
        const photoUrl = `http://192.168.1.16:8000/storage/images/${response.data.profile_photo_path}`;
        // Save to storage BEFORE navigation happens
        await AsyncStorage.setItem('userProfilePhoto', photoUrl);
      }
    } catch (apiError) {
      /**
       * If the network is slow or fails, we still let the user in.
       * They just won't see their photo until the next successful sync.
       */
      console.log("Photo sync failed or timed out, proceeding anyway.");
    }
  };

  if (isCheckingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
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