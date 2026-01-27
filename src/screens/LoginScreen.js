import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Alert, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios'; 
import api, { PC_IP } from '../api/axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('userEmail');
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                if (savedEmail) setEmail(savedEmail);
                if (isLoggedIn === 'true') {
                    router.replace('/(tabs)/home');
                }
            } catch (e) {
                console.error("Error checking session:", e);
            } finally {
                setIsCheckingSession(false);
            }
        };
        checkSession();
    }, []);

    /**
     * Helper to fetch user data, photo, and permissions immediately after login success
     */
    const fetchAndStoreUserData = async (token: string) => {
        try {
            const response = await api.get('/user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 🛡️ SAVE FULL USER DATA: This includes the permissions array from Laravel
            if (response.data) {
                await AsyncStorage.setItem('userData', JSON.stringify(response.data));
            }

            if (response.data.profile_photo_path) {
                const photoUrl = `http://${PC_IP}:8000/storage/images/${response.data.profile_photo_path}`;
                await AsyncStorage.setItem('userProfilePhoto', photoUrl);
            }
        } catch (error) {
            console.log("Pre-fetch user data error:", error.message);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Los campos no pueden estar vacíos');
            return;
        }

        setLoading(true);
        try {
            // Get CSRF Cookie
            await axios.get(`http://${PC_IP}:8000/sanctum/csrf-cookie`, { withCredentials: true });
            
            // Login Request
            const response = await api.post('/login', { email, password });

            if (response.status === 200 || response.status === 204) {
                const token = response.data.token; 
                
                await AsyncStorage.setItem('userEmail', email);
                await AsyncStorage.setItem('isLoggedIn', 'true');
                
                if (token) {
                    await AsyncStorage.setItem('userToken', token);
                    
                    // FETCH DATA NOW: Get user details and permissions before navigating
                    await fetchAndStoreUserData(token);
                }
                
                router.replace('/(tabs)/home'); 
            }
        } catch (error) {
            console.log("Login Error:", error.message);
            Alert.alert('Error', 'Credenciales incorrectas o servidor apagado');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingSession) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Prados de la Huerta</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Correo Electrónico" 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
            />
            <TextInput 
                style={styles.input} 
                placeholder="Contraseña" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry 
            />
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <Button title="Iniciar" onPress={handleLogin} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 15, borderRadius: 8 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }
});

export default LoginScreen;