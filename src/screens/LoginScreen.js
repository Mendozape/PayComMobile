import React, { useState, useEffect } from 'react';
import { 
    View, 
    TextInput, 
    StyleSheet, 
    Alert, 
    Text, 
    ActivityIndicator, 
    ImageBackground, 
    TouchableOpacity,
    KeyboardAvoidingView, 
    Platform, 
    TouchableWithoutFeedback, 
    Keyboard, 
    ScrollView,
    DeviceEventEmitter
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import axios from 'axios'; 
import api, { API_BASE } from '../api/axios'; // Integrated API_BASE from centralized config
import AsyncStorage from '@react-native-async-storage/async-storage'; 

/**
 * LoginScreen Component
 * Handles user authentication and session persistence.
 */
const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true); 
    const [loading, setLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        /**
         * Check for an existing session on component mount
         */
        const checkSession = async () => {
            try {
                const savedEmail = await AsyncStorage.getItem('userEmail');
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                if (savedEmail) setEmail(savedEmail);
                if (isLoggedIn === 'true') {
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
     * Fetches full user data and profile photo after successful login.
     * Uses dynamic base URL for images and notifies the app about photo changes.
     */
    const fetchAndStoreUserData = async (token) => {
        try {
            const response = await api.get('/user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data) {
                await AsyncStorage.setItem('userData', JSON.stringify(response.data));
            }

            if (response.data.profile_photo_path) {
                // Strips /api from the base URL to access the storage folder
                const baseUrl = API_BASE.replace('/api', '');
                const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
                
                // Store in local storage
                await AsyncStorage.setItem('userProfilePhoto', photoUrl);
                
                // Notify TabLayout and other listeners that the photo is ready/updated
                DeviceEventEmitter.emit('user-photo-updated', photoUrl);
            }
        } catch (error) {
            console.log("Pre-fetch user data error:", error.message);
        }
    };

    /**
     * Main login logic.
     * Dynamically handles CSRF and Login requests based on ENV (dev/prod).
     */
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Fields cannot be empty');
            return;
        }

        setLoading(true);
        try {
            // Get base URL for Sanctum (stripping /api)
            const baseUrl = API_BASE.replace('/api', '');
            
            // Fetch CSRF cookie before authentication
            await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true });
            
            // Perform login via dynamic API instance
            const response = await api.post('/login', { email, password });
            
            if (response.status === 200 || response.status === 204) {
                const token = response.data.token; 
                await AsyncStorage.setItem('userEmail', email);
                await AsyncStorage.setItem('isLoggedIn', 'true');

                if (token) {
                    await AsyncStorage.setItem('userToken', token);
                    // Fetch full data and emit events before redirecting
                    await fetchAndStoreUserData(token);
                }

                router.replace('/(tabs)/home'); 
            }
        } catch (error) {
            console.error("Login Error:", error);
            Alert.alert('Error', 'Invalid credentials or server is down');
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingSession) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <ImageBackground 
            source={require('../../assets/images/bg-login.png')} 
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? -100 : -150} 
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView 
                        contentContainerStyle={styles.scrollContainer}
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.overlay}>
                            <View style={styles.formContainer}>
                                {/* Brand Header */}
                                <Text style={styles.brandText}>Prados de la Huerta</Text>
                                <Text style={styles.welcomeText}>¡Bienvenido!</Text>
                                
                                <View style={styles.inputContainer}>
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Usuario" 
                                        placeholderTextColor="#666"
                                        value={email} 
                                        onChangeText={setEmail} 
                                        autoCapitalize="none" 
                                    />
                                </View>
                                
                                <View style={styles.inputContainer}>
                                    <TextInput 
                                        style={[styles.input, { flex: 1 }]} 
                                        placeholder="Contraseña" 
                                        placeholderTextColor="#666"
                                        value={password} 
                                        onChangeText={setPassword} 
                                        secureTextEntry={secureText} 
                                    />
                                    <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                                        <Ionicons 
                                            name={secureText ? "eye-off-outline" : "eye-outline"} 
                                            size={22} 
                                            color="#444" 
                                        />
                                    </TouchableOpacity>
                                </View>

                                {loading ? (
                                    <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
                                ) : (
                                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                                        <Text style={styles.buttonText}>Iniciar sesión</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    scrollContainer: { flexGrow: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.1)', 
        justifyContent: 'flex-start', 
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 100,
        paddingBottom: 100,
    },
    formContainer: { 
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
        padding: 30, 
        borderRadius: 30, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    brandText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#2E7D32',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 5,
    },
    welcomeText: { 
        fontSize: 18, 
        fontWeight: '600', 
        marginBottom: 25, 
        color: '#555',
        letterSpacing: 1,
        textAlign: 'center'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15,
        width: '100%',
        height: 55,
    },
    input: { 
        fontSize: 16, 
        color: '#000',
        height: '100%',
        width: '100%'
    },
    loginButton: { 
        backgroundColor: '#2E7D32', 
        paddingVertical: 15, 
        borderRadius: 25, 
        alignItems: 'center', 
        marginTop: 10,
        width: '100%',
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default LoginScreen;