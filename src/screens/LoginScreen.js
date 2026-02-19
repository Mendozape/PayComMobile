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
    ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 
import axios from 'axios'; 
import api, { PC_IP } from '../api/axios'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true); 
    const [loading, setLoading] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    useEffect(() => {
        // Check for an existing session on component mount
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

    // Fetches full user data and permissions after successful login
    const fetchAndStoreUserData = async (token) => {
        try {
            const response = await api.get('/user', {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    // Main login logic
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Los campos no pueden estar vacíos');
            return;
        }
        setLoading(true);
        try {
            await axios.get(`http://${PC_IP}:8000/sanctum/csrf-cookie`, { withCredentials: true });
            const response = await api.post('/login', { email, password });
            
            if (response.status === 200 || response.status === 204) {
                const token = response.data.token; 
                await AsyncStorage.setItem('userEmail', email);
                await AsyncStorage.setItem('isLoggedIn', 'true');
                if (token) {
                    await AsyncStorage.setItem('userToken', token);
                    await fetchAndStoreUserData(token);
                }
                router.replace('/(tabs)/home'); 
            }
        } catch (error) {
            Alert.alert('Error', 'Credenciales incorrectas o servidor apagado');
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
            source={require('../../assets/images/bg-login5.png')} 
            style={styles.backgroundImage}
            resizeMode="cover"
        >
            {/* We use keyboardVerticalOffset to control the final position when the keyboard is open.
                Using a negative value here prevents the "double jump" effect when closing the keyboard.
            */}
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
                        {/* Static overlay: Position is now constant to avoid flickering */}
                        <View style={styles.overlay}>
                            <View style={styles.formContainer}>
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
        justifyContent: 'flex-end', 
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 120, // This is your FIXED base position (Keyboard closed)
    },
    formContainer: { 
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.75)', 
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
    welcomeText: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        marginBottom: 25, 
        color: '#222',
        letterSpacing: 1
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