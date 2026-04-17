import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  View, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  Modal, 
  DeviceEventEmitter,
  useColorScheme,
  Keyboard
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

// API configuration
import { API_BASE } from '../../../src/api/axios'; 

// UI Components
import { IconSymbol } from '@/components/ui/icon-symbol';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * ProfileScreen component
 * Handles user profile management and photo updates.
 * Implements an aggressive navigation reset to ensure the user can exit the screen.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
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
   */
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      return () => {};
    }, [])
  );

  /**
   * Fetch user data from the API using dynamic API_BASE.
   */
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime(); 
      
      const response = await axios.get(`${API_BASE}/user?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      
      setName(response.data.name);
      setEmail(response.data.email);
      setPhone(response.data.phone || ''); 
      
      if (response.data.profile_photo_path) {
        const baseUrl = API_BASE.replace('/api', '');
        const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
        setImageUri(`${photoUrl}?t=${t}`);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Open image library to pick a profile photo.
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
   * Aggressive navigation reset.
   * Clears the stack and forces redirection to the main tab.
   */
  const navigateToHome = () => {
    Keyboard.dismiss();
    
    // Attempt to pop all screens if possible
    try {
        if (router.canGoBack()) {
            router.back();
        } else {
            // Force replace to the main application entry point
            router.replace('/(drawer)/(tabs)/home');
        }
    } catch (e) {
        // Fallback to absolute root if everything else fails
        router.replace('/');
    }
  };

  /**
   * Submit profile updates to the server.
   */
  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert("Error", "Name is required.");
      return;
    }

    if (password.length > 0 && (password.length < 6 || password !== passwordConfirmation)) {
      Alert.alert("Error", "Check your password fields.");
      return;
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

      if (imageUri && !imageUri.startsWith('http')) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        formData.append('photo', { uri: imageUri, name: filename, type: 'image/jpeg' } as any);
      }

      const response = await axios.post(`${API_BASE}/profile/update`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (response.data.user?.profile_photo_path) {
        const baseUrl = API_BASE.replace('/api', '');
        const finalUrl = `${baseUrl}/storage/images/${response.data.user.profile_photo_path}`;
        const freshUrl = `${finalUrl}?t=${Date.now()}`;
        setImageUri(freshUrl);
        DeviceEventEmitter.emit('user-photo-updated', freshUrl);
      }

      Alert.alert(
        "Éxito", 
        "Perfil actualizado.", 
        [{ text: "OK", onPress: () => navigateToHome() }]
      );
    } catch (e) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setIsUploading(false);
    }
  };

  const inputTextColor = isDark ? '#FFFFFF' : '#333333';
  const inputBorderColor = isDark ? '#444444' : '#cccccc';
  const sectionBgColor = isDark ? '#252525' : '#f9f9f9';

  return (
    <View style={{ flex: 1 }}>
      {(isLoading || isUploading) && (
        <Modal transparent animationType="fade">
          <View style={styles.fullLoaderOverlay}>
            <View style={[styles.loaderCard, { backgroundColor: isDark ? '#333' : 'white' }]}>
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
            <TouchableOpacity style={styles.backButton} onPress={navigateToHome}>
              <IconSymbol name="chevron.left" size={24} color={isDark ? "white" : "black"} />
            </TouchableOpacity>

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
              style={[styles.input, { color: inputTextColor, borderBottomColor: inputBorderColor }]} 
              value={name} onChangeText={setName} placeholder="Nombre" placeholderTextColor="#888"
            />

            <ThemedText style={styles.label}>Correo Electrónico</ThemedText>
            <TextInput 
              style={[styles.input, styles.disabledInput, { borderBottomColor: inputBorderColor }]} 
              value={email} editable={false} 
            />

            <ThemedText style={styles.label}>Teléfono</ThemedText>
            <TextInput 
              style={[styles.input, { color: inputTextColor, borderBottomColor: inputBorderColor }]} 
              value={phone} onChangeText={setPhone} placeholder="Teléfono" placeholderTextColor="#888" keyboardType="phone-pad"
            />

            <View style={[styles.passwordSection, { backgroundColor: sectionBgColor }]}>
              <ThemedText type="subtitle">Seguridad</ThemedText>
              
              <ThemedText style={styles.label}>Nueva Contraseña</ThemedText>
              <TextInput 
                style={[styles.input, { color: inputTextColor, borderBottomColor: inputBorderColor }]} 
                value={password} onChangeText={setPassword} placeholder="Cambiar contraseña" placeholderTextColor="#888" secureTextEntry
              />

              <ThemedText style={styles.label}>Confirmar Contraseña</ThemedText>
              <TextInput 
                style={[styles.input, { color: inputTextColor, borderBottomColor: inputBorderColor }]} 
                value={passwordConfirmation} onChangeText={setPasswordConfirmation} placeholderTextColor="#888" secureTextEntry
              />
            </View>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isUploading || isLoading}>
              <ThemedText style={styles.saveButtonText}>Guardar Cambios</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={navigateToHome}>
              <ThemedText style={[styles.cancelButtonText, { color: isDark ? '#ccc' : '#666' }]}>
                Descartar Cambios
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ParallaxScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullLoaderOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  loaderCard: { padding: 30, borderRadius: 15, alignItems: 'center', elevation: 5 },
  headerIconContainer: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(128,128,128,0.2)', borderRadius: 20 },
  imageWrapper: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 180, height: 180, borderRadius: 90 },
  cameraBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#007AFF', padding: 10, borderRadius: 25 },
  container: { padding: 20 },
  inputSection: { marginVertical: 20 },
  passwordSection: { marginTop: 10, padding: 15, borderRadius: 10 },
  label: { fontSize: 14, opacity: 0.6, marginTop: 15 },
  input: { borderBottomWidth: 1, fontSize: 18, paddingVertical: 10, marginBottom: 10 },
  disabledInput: { color: '#999' }, 
  saveButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  cancelButton: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#ccc' },
  cancelButtonText: { fontWeight: 'bold' },
});