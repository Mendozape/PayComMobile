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
    DeviceEventEmitter,
    Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import axios from 'axios'; 
import api, { API_BASE } from '../api/axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import Constants from 'expo-constants'; 

/**
 * LoginScreen Component
 * Handles version enforcement, authentication, and "Remember Me" functionality.
 */
const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true); 
    const [loading, setLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const [rememberMe, setRememberMe] = useState(false); // State for the checkbox

    useEffect(() => {
        /**
         * Enforcement logic for Store versions.
         */
        const checkVersionEnforcement = async () => {
            const currentVersion = Constants.expoConfig.version; 
            try {
                const response = await api.get('/app-settings'); 
                const minRequiredVersion = response.data.min_version; 

                if (currentVersion < minRequiredVersion) {
                    Alert.alert(
                        'Actualización obligatoria',
                        'Tu versión actual (' + currentVersion + ') ya no es compatible. Por favor, descarga la versión ' + minRequiredVersion + ' de la tienda.',
                        [
                            { 
                                text: 'Ir a la tienda', 
                                onPress: () => {
                                    const url = Platform.OS === 'ios' 
                                        ? 'https://apps.apple.com/app/idYOUR_ID' 
                                        : 'https://play.google.com/store/apps/details?id=com.erasto.compaymobile'; 
                                    Linking.openURL(url);
                                } 
                            }
                        ],
                        { cancelable: false }
                    );
                }
            } catch (error) {
                console.log("Version check skipped or failed:", error.message);
            }
        };

        /**
         * Check for saved credentials and existing session.
         */
        const checkSavedCredentialsAndSession = async () => {
            try {
                // 1. Check if user wanted to be remembered
                const savedEmail = await AsyncStorage.getItem('rememberedEmail');
                const savedPassword = await AsyncStorage.getItem('rememberedPassword');
                const isRemembered = await AsyncStorage.getItem('rememberMe');

                if (isRemembered === 'true' && savedEmail) {
                    setEmail(savedEmail);
                    setPassword(savedPassword || '');
                    setRememberMe(true);
                }

                // 2. Check for active session
                const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
                if (isLoggedIn === 'true') {
                    router.replace('/(tabs)/home');
                }
            } catch (e) {
                console.error("Initialization error:", e);
            } finally {
                setIsCheckingSession(false);
            }
        };

        checkVersionEnforcement();
        checkSavedCredentialsAndSession();
    }, []);

    const fetchAndStoreUserData = async (token) => {
        try {
            const response = await api.get('/user', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data) await AsyncStorage.setItem('userData', JSON.stringify(response.data));
            if (response.data.profile_photo_path) {
                const baseUrl = API_BASE.replace('/api', '');
                const photoUrl = `${baseUrl}/storage/images/${response.data.profile_photo_path}`;
                await AsyncStorage.setItem('userProfilePhoto', photoUrl);
                DeviceEventEmitter.emit('user-photo-updated', photoUrl);
            }
        } catch (error) {
            console.log("Pre-fetch user data error:", error.message);
        }
    };

    /**
     * Handle Login and save credentials if Remember Me is active.
     */
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Campos vacíos', 'Por favor ingresa tu usuario y contraseña.');
            return;
        }
        setLoading(true);
        try {
            const baseUrl = API_BASE.replace('/api', '');
            await axios.get(`${baseUrl}/sanctum/csrf-cookie`, { withCredentials: true });
            const response = await api.post('/login', { email, password });
            
            if (response.status === 200 || response.status === 204) {
                // Save/Remove credentials based on "Remember Me"
                if (rememberMe) {
                    await AsyncStorage.setItem('rememberedEmail', email);
                    await AsyncStorage.setItem('rememberedPassword', password);
                    await AsyncStorage.setItem('rememberMe', 'true');
                } else {
                    await AsyncStorage.removeItem('rememberedEmail');
                    await AsyncStorage.removeItem('rememberedPassword');
                    await AsyncStorage.setItem('rememberMe', 'false');
                }

                const token = response.data.token; 
                await AsyncStorage.setItem('userEmail', email); // Always save current login email for session
                await AsyncStorage.setItem('isLoggedIn', 'true');
                
                if (token) {
                    await AsyncStorage.setItem('userToken', token);
                    await fetchAndStoreUserData(token);
                }
                router.replace('/(tabs)/home'); 
            }
        } catch (error) {
            console.error("Login Error:", error);
            Alert.alert('Error de acceso', 'Usuario o contraseña incorrectos.');
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
                    <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false} keyboardShouldPersistTaps="handled">
                        <View style={styles.overlay}>
                            <View style={styles.formContainer}>
                                <Text style={styles.brandText}>Prados de la Huerta</Text>
                                <Text style={styles.welcomeText}>Bienvenido</Text>
                                
                                {/* User Input */}
                                <View style={styles.inputContainer}>
                                    <TextInput 
                                        style={styles.input} 
                                        placeholder="Usuario / Correo" 
                                        placeholderTextColor="#666"
                                        value={email} 
                                        onChangeText={setEmail} 
                                        autoCapitalize="none" 
                                    />
                                </View>

                                {/* Password Input */}
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
                                        <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={22} color="#444" />
                                    </TouchableOpacity>
                                </View>

                                {/* Remember Me Checkbox */}
                                <TouchableOpacity 
                                    style={styles.rememberMeContainer} 
                                    onPress={() => setRememberMe(!rememberMe)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons 
                                        name={rememberMe ? "checkbox" : "square-outline"} 
                                        size={24} 
                                        color={rememberMe ? "#2E7D32" : "#666"} 
                                    />
                                    <Text style={styles.rememberMeText}>Recuérdame</Text>
                                </TouchableOpacity>

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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 20, paddingTop: 100, paddingBottom: 100 },
    formContainer: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.85)', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)', elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    brandText: { fontSize: 18, fontWeight: '900', color: '#2E7D32', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 },
    welcomeText: { fontSize: 18, fontWeight: '600', marginBottom: 25, color: '#555', letterSpacing: 1, textAlign: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 15, paddingHorizontal: 15, marginBottom: 15, width: '100%', height: 55 },
    input: { fontSize: 16, color: '#000', height: '100%', width: '100%' },
    rememberMeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 20,
        marginLeft: 5
    },
    rememberMeText: {
        fontSize: 14,
        color: '#555',
        marginLeft: 8,
        fontWeight: '500'
    },
    loginButton: { backgroundColor: '#2E7D32', paddingVertical: 15, borderRadius: 25, alignItems: 'center', marginTop: 10, width: '100%' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default LoginScreen;