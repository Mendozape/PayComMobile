import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

import { IconSymbol } from '@/components/ui/icon-symbol';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  const router = useRouter();
  const [name, setName] = useState(''); 
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); 
  // Estados para contraseña
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await axios.get('http://192.168.1.16:8000/api/user', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        });
        
        setName(response.data.name);
        setEmail(response.data.email);
        setPhone(response.data.phone || ''); 
        
        if (response.data.profile_photo_path) {
          setImageUri(`http://192.168.1.16:8000/storage/images/${response.data.profile_photo_path}`);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      }
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleSaveProfile = async () => {
    if (!name) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }

    // VALIDACIÓN DE CONTRASEÑA OPCIONAL
    if (password.length > 0) {
      if (password.length < 6) {
        Alert.alert("Error", "La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (password !== passwordConfirmation) {
        Alert.alert("Error", "Las contraseñas no coinciden");
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

      // Solo enviamos el password si el usuario escribió algo
      if (password.length > 0) {
        formData.append('password', password);
        formData.append('password_confirmation', passwordConfirmation);
      }

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

      Alert.alert("Éxito", "Perfil actualizado correctamente");
      // Limpiamos los campos de password después de guardar
      setPassword('');
      setPasswordConfirmation('');
      
    } catch (e: any) {
      console.error("Save Error:", e.response?.data || e.message);
      if (e.response?.data?.errors) {
        const firstError = Object.values(e.response.data.errors)[0][0];
        Alert.alert("Error de validación", String(firstError));
      } else {
        Alert.alert("Error", "No se pudo guardar la información.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['isLoggedIn', 'userToken']);
    router.replace('/'); 
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <ThemedView style={styles.headerIconContainer}>
            <TouchableOpacity onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.profileImage} />
              ) : (
                <IconSymbol size={180} name="person.crop.circle.fill" color="#808080" />
              )}
              <View style={styles.cameraBadge}><IconSymbol size={20} name="camera.fill" color="white" /></View>
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
            placeholder="Escribe tu nombre"
            placeholderTextColor="#888"
          />

          <ThemedText style={styles.label}>Correo Electrónico (No editable)</ThemedText>
          <TextInput 
            style={[styles.input, styles.disabledInput]} 
            value={email} 
            editable={false} 
            selectTextOnFocus={false}
          />

          <ThemedText style={styles.label}>Teléfono</ThemedText>
          <TextInput 
            style={styles.input} 
            value={phone} 
            onChangeText={setPhone} 
            placeholder="Ej: 4431234567"
            placeholderTextColor="#888"
            keyboardType="phone-pad"
          />

          {/* SECCIÓN DE CONTRASEÑA */}
          <View style={styles.passwordSection}>
            <ThemedText type="subtitle" style={{ marginTop: 10 }}>Seguridad</ThemedText>
            
            <ThemedText style={styles.label}>Nueva Contraseña (Opcional)</ThemedText>
            <TextInput 
              style={styles.input} 
              value={password} 
              onChangeText={setPassword} 
              placeholder="Dejar en blanco para no cambiar"
              placeholderTextColor="#aaa"
              secureTextEntry
            />

            <ThemedText style={styles.label}>Confirmar Nueva Contraseña {password.length > 0 && "*"}</ThemedText>
            <TextInput 
              style={[styles.input, password.length > 0 && styles.requiredInput]} 
              value={passwordConfirmation} 
              onChangeText={setPasswordConfirmation} 
              placeholder={password.length > 0 ? "Campo obligatorio" : "Opcional"}
              placeholderTextColor="#aaa"
              secureTextEntry
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.saveButton, isUploading && { opacity: 0.5 }]} 
            onPress={handleSaveProfile}
            disabled={isUploading}
          >
            <ThemedText style={styles.saveButtonText}>
                {isUploading ? "Guardando..." : "Guardar Cambios"}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutItem} onPress={handleLogout}>
          <IconSymbol size={24} name="rectangle.portrait.and.arrow.right" color="#ff4444" />
          <ThemedText style={styles.logoutLabel}>Cerrar Sesión</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerIconContainer: { height: '100%', justifyContent: 'center', alignItems: 'center' },
  profileImage: { width: 180, height: 180, borderRadius: 90 },
  cameraBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#007AFF', padding: 10, borderRadius: 25 },
  container: { padding: 20 },
  inputSection: { marginVertical: 20 },
  passwordSection: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 10 },
  label: { fontSize: 14, opacity: 0.6, marginTop: 15 },
  input: { borderBottomWidth: 1, borderBottomColor: '#ccc', fontSize: 18, paddingVertical: 10, marginBottom: 10, color: '#333' },
  requiredInput: { borderBottomColor: '#007AFF' },
  disabledInput: { color: '#999', borderBottomColor: '#eee' }, 
  saveButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: 'white', fontWeight: 'bold' },
  logoutItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 },
  logoutLabel: { color: '#ff4444', fontWeight: 'bold' }
});