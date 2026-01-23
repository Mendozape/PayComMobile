import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from '../src/screens/LoginScreen'; 

export default function RootIndex() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Effect to verify if a session already exists on app launch
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Fetch the login flag from local storage
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        
        if (isLoggedIn === 'true') {
          // If authenticated, skip login and move to home
          router.replace('/(tabs)/home');
        }
      } catch (e) {
        // Log error for debugging while keeping it silent for the user
        console.error("Error checking session:", e);
      } finally {
        // Hide the loading indicator regardless of the result
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  // Show a centered loading spinner while the app determines the auth state
  if (isCheckingSession) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // If no session is found, render the translated Login screen
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