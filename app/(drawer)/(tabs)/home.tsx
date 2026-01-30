import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, ActivityIndicator, 
  TouchableOpacity, ScrollView, RefreshControl 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import usePermission from '@/hooks/usePermission';

// API Configuration
const API_BASE = 'http://192.168.1.16:8000/api';

/**
 * HomeScreen Component (Stats)
 * Landing page after login. Shows summary cards based on roles.
 */
export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [counts, setCounts] = useState({ userCount: 0, roleCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize permission hook
  const { can } = usePermission(user);

  /**
   * Load user from storage on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const userDataJson = await AsyncStorage.getItem('userData');
        if (userDataJson) {
          const parsedUser = JSON.parse(userDataJson);
          setUser(parsedUser);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Load error in Home:", e);
        setLoading(false);
      }
    };
    initialize();
  }, []);

  /**
   * Fetch counts whenever user data is ready
   */
  useEffect(() => {
    if (user) {
      if (can('Ver-usuarios') || can('Ver-roles')) {
        fetchCounts();
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  /**
   * Fetches statistics from Laravel API
   */
  const fetchCounts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE}/users/count`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          Accept: 'application/json' 
        },
      });
      
      if (response.data) {
        setCounts({
          userCount: response.data.userCount || 0,
          roleCount: response.data.roleCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats counts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCounts();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28a745" />
        }
      >
        <ThemedText type="title" style={styles.welcomeText}>
          ¡Bienvenido, {user?.name?.split(' ')[0]}!
        </ThemedText>
        <ThemedText style={styles.subtitle}>Residencial Prados de la Huerta</ThemedText>

        <View style={styles.statsRow}>
          {/* USERS STATS BOX */}
          {can('Ver-usuarios') && (
            <TouchableOpacity 
              style={[styles.card, styles.cardSuccess]} 
              onPress={() => router.push('/residents')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome name="users" size={24} color="white" />
                <ThemedText style={styles.cardNumber}>{counts.userCount}</ThemedText>
              </View>
              <ThemedText style={styles.cardTitle}>Residentes en Sistema</ThemedText>
              <View style={styles.manageBtn}>
                <ThemedText style={styles.manageText}>Gestionar</ThemedText>
                <FontAwesome name="arrow-circle-right" size={14} color="white" />
              </View>
            </TouchableOpacity>
          )}

          {/* ROLES STATS BOX */}
          {can('Ver-roles') && (
            <TouchableOpacity 
              style={[styles.card, styles.cardInfo]} 
              onPress={() => router.push('/roles')}
            >
              <View style={styles.cardHeader}>
                <FontAwesome name="user-secret" size={24} color="white" />
                <ThemedText style={styles.cardNumber}>{counts.roleCount}</ThemedText>
              </View>
              <ThemedText style={styles.cardTitle}>Roles de Residente</ThemedText>
              <View style={styles.manageBtn}>
                <ThemedText style={styles.manageText}>Configurar</ThemedText>
                <FontAwesome name="arrow-circle-right" size={14} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!can('Ver-usuarios') && !can('Ver-roles') && (
          <View style={styles.noAccess}>
            <FontAwesome name="building" size={80} color="#f0f0f0" />
            <ThemedText style={styles.noAccessText}>
              Has iniciado sesión como residente. Utiliza el menú lateral para consultar tu estado de cuenta.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingTop: 40 },
  welcomeText: { fontSize: 26, fontWeight: 'bold' },
  subtitle: { color: '#888', marginBottom: 30, fontSize: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  card: { 
    flex: 1, 
    borderRadius: 20, 
    padding: 18, 
    minHeight: 155, // Increased slightly
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cardSuccess: { backgroundColor: '#28a745' },
  cardInfo: { backgroundColor: '#17a2b8' },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', // Changed to center for vertical alignment
    paddingTop: 5 // Padding to prevent clipping on top
  },
  cardNumber: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white',
    lineHeight: 38, // Explicit line height to ensure full rendering
    includeFontPadding: false // Android specific to prevent extra spacing
  },
  cardTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: 10 },
  manageBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginTop: 15, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  manageText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  noAccess: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  noAccessText: { color: '#aaa', marginTop: 20, textAlign: 'center', fontSize: 15, lineHeight: 22 }
});