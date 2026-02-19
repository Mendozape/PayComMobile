import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, Image, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

import { IconSymbol } from '@/components/ui/icon-symbol';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { disconnectEcho } from '@/services/echo'; 

/**
 * ProfileScreen component
 * Handles user profile management and session termination.
 * UI is localized in Spanish for the end user.
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
  const [isLoading, setIsLoading] = useState(true); // Initial data fetch state
  const [isUploading, setIsUploading] = useState(false); // Save process state

  /**
   * Fetch user data from the API on mount
   */
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get('http://192.168.1.16:8000/api/user', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        
        setName(response.data.name);
        setEmail(response.data.email);
        setPhone(response.data.phone || ''); 
        
        // Construct and save the profile photo URL if it exists
        if (response.data.profile_photo_path) {
          const photoUrl = `http://192.168.1.16:8000/storage/images/${response.data.profile_photo_path}`;
          setImageUri(photoUrl);
          await AsyncStorage.setItem('userProfilePhoto', photoUrl);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
        Alert.alert("Error", "No se pudo obtener la información del usuario.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

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
   * Clear session and redirect to the login/landing page
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
            // Clear all local session data
            await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
            router.replace('/');
          }
        }
      ]
    );
  };

  /**
   * Submit profile updates to the backend
   */
  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert("Error", "El nombre es obligatorio.");
      return;
    }

    if (password.length > 0) {
      if (password.length < 6) {
        Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres.");
        return;
      }
      if (password !== passwordConfirmation) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
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

      // Handle file preparation for upload if uri is local
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

      await axios.post('http://192.168.1.16:8000/api/profile/update', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
      });

      if (imageUri) {
        await AsyncStorage.setItem('userProfilePhoto', imageUri);
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
      Alert.alert("Error", "No se pudo guardar la información.");
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
                  <Image source={{ uri: imageUri }} style={styles.profileImage} />
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
                secureTextEntry
              />

              <ThemedText style={styles.label}>Confirmar Contraseña</ThemedText>
              <TextInput 
                style={styles.input} 
                value={passwordConfirmation} 
                onChangeText={setPasswordConfirmation} 
                secureTextEntry
              />
            </View>
            
            {/* ACTION BUTTONS */}
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