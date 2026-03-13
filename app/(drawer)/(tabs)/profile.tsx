import React, { useState, useCallback } from 'react'; // Removed useEffect, added useCallback
import { 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  View, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  Modal, 
  DeviceEventEmitter 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// Corrected relative path to reach src/api/axios from app/(drawer)/(tabs)/
import { API_BASE } from '../../../src/api/axios'; 

import { IconSymbol } from '@/components/ui/icon-symbol';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { disconnectEcho } from '@/services/echo'; 

/**
 * ProfileScreen component
 * Handles user profile management and session termination.
 */
export default function ProfileScreen() {
  const router = useRouter();
  
  // User data states
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); 
  
  // Password security states
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  // Media and loading states
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [isUploading, setIsUploading] = useState(false); 

  /**
   * 🛡️ FOCUS LOAD: Refreshes user data whenever the screen is focused.
   * This ensures the profile reflects the latest server-side state.
   */
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      
      return () => {
        // Optional cleanup
      };
    }, [])
  );

  /**
   * Fetch user data from the API using dynamic API_BASE.
   * Added cache busting for the profile photo.
   */
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime(); // Cache buster
      
      const response = await axios.get(`${API_BASE}/user?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      
      setName(response.data.name);
      setEmail(response.data.email);
      setPhone(response.data.phone || ''); 
      
      // Construct profile photo URL based on the current environment (Dev/Prod)
      if (response.data.profile_photo_path) {
        const baseUrl = API_BASE.replace('/api', '');
        const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
        
        // Force refresh by adding timestamp
        const freshUrl = `${photoUrl}?t=${t}`;
        setImageUri(freshUrl);
        await AsyncStorage.setItem('userProfilePhoto', photoUrl);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "Could not retrieve user information.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Open gallery to pick a profile image
   */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  /**
   * Clear session and redirect to login
   */
  const handleLogout = async () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          style: "destructive",
          onPress: async () => {
            disconnectEcho();
            await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
            router.replace('/');
          }
        }
      ]
    );
  };

  /**
   * Submit profile updates using dynamic API_BASE
   */
  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    if (password.length > 0) {
      if (password.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters.");
        return;
      }
      if (password !== passwordConfirmation) {
        Alert.alert("Error", "Passwords do not match.");
        return;
      }
    }

    setIsUploading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      formData.append('name', name);
      formData.append('email', email); 
      formData.append('phone', phone); 

      if (password.length > 0) {
        formData.append('password', password);
        formData.append('password_confirmation', passwordConfirmation);
      }

      // Prepare local image for upload
      if (imageUri && !imageUri.startsWith('http')) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('photo', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);
      }

      // POST update using centralized dynamic URL
      const response = await axios.post(`${API_BASE}/profile/update`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      // Handle successful photo update and notify other components
      if (response.data.user?.profile_photo_path) {
        const baseUrl = API_BASE.replace('/api', '');
        const finalUrl = `${baseUrl}/storage/images/${response.data.user.profile_photo_path}`;
        
        // Save base URL to storage
        await AsyncStorage.setItem('userProfilePhoto', finalUrl);
        
        // Create fresh URL with timestamp to force refresh everywhere
        const freshUrl = `${finalUrl}?t=${Date.now()}`;
        setImageUri(freshUrl);
        
        // Broadcast change to TabLayout and other listeners
        DeviceEventEmitter.emit('user-photo-updated', freshUrl);
      }

      setPassword('');
      setPasswordConfirmation('');

      Alert.alert(
        "Éxito", 
        "Perfil actualizado correctamente.",
        [{ text: "OK", onPress: () => router.replace('/home') }]
      );
      
    } catch (e: any) {
      console.error("Save Error:", e.response?.data || e.message);
      Alert.alert("Error", "Could not save profile information.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* GLOBAL LOADING OVERLAY */}
      {(isLoading || isUploading) && (
        <Modal transparent animationType="fade">
          <View style={styles.fullLoaderOverlay}>
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color="#007AFF" />
              <ThemedText style={{ marginTop: 10 }}>Cargando...</ThemedText>
            </View>
          </View>
        </Modal>
      )}

      <ParallaxScrollView
        headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
        headerImage={
          <ThemedView style={styles.headerIconContainer}>
            <TouchableOpacity onPress={pickImage} disabled={isUploading}>
              <View style={styles.imageWrapper}>
                {imageUri ? (
                  <Image key={imageUri} source={{ uri: imageUri }} style={styles.profileImage} />
                ) : (
                  <IconSymbol size={180} name="person.crop.circle.fill" color="#808080" />
                )}
              </View>
              <View style={styles.cameraBadge}>
                <IconSymbol size={20} name="camera.fill" color="white" />
              </View>
            </TouchableOpacity>
          </ThemedView>
        }>
        
        <ThemedView style={styles.container}>
          <ThemedText type="title">Mi Perfil</ThemedText>
          
          <View style={styles.inputSection}>
            <ThemedText style={styles.label}>Nombre Completo</ThemedText>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
              placeholder="Nombre"
              placeholderTextColor="#888"
            />

            <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
            <TextInput 
              style={[styles.input, styles.disabledInput]} 
              value={email} 
              editable={false} 
            />

            <ThemedText style={styles.label}>Teléfono</ThemedText>
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="Teléfono"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
            />

            <View style={styles.passwordSection}>
              <ThemedText type="subtitle">Seguridad</ThemedText>
              
              <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
              <TextInput 
                style={styles.input} 
                value={password} 
                onChangeText={setPassword} 
                placeholder="Cambiar contraseña"
                placeholderTextColor="#888"
                secureTextEntry
              />

              <ThemedText style={styles.label}>Confirmar Contraseña</ThemedText>
              <TextInput 
                style={styles.input} 
                value={passwordConfirmation} 
                onChangeText={setPasswordConfirmation} 
                placeholderTextColor="#888"
                secureTextEntry
              />
            </View>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveProfile}
              disabled={isUploading || isLoading}
            >
              <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#ff4444" />
              <ThemedText style={styles.logoutButtonText}>Cerrar Sesión</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullLoaderOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  loaderCard: { backgroundColor: 'white', padding: 30, borderRadius: 15, alignItems: 'center', elevation: 5 },
  headerIconContainer: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  imageWrapper: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 180, height: 180, borderRadius: 90 },
  cameraBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#007AFF', padding: 10, borderRadius: 25 },
  container: { padding: 20 },
  inputSection: { marginVertical: 20 },
  passwordSection: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 },
  label: { fontSize: 14, opacity: 0.6, marginTop: 15 },
  input: { borderBottomWidth: 1, borderBottomColor: '#ccc', fontSize: 18, paddingVertical: 10, marginBottom: 10, color: '#333' },
  disabledInput: { color: '#999', borderBottomColor: '#eee' }, 
  saveButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20, 
    padding: 15,
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 10,
    gap: 10
  },
  logoutButtonText: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 },
});