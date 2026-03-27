import React, { useState, useCallback } from 'react'; // Removed useEffect, kept useCallback
import { 
  StyleSheet, View, ActivityIndicator, 
  TouchableOpacity, ScrollView, RefreshControl 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router'; // Added useFocusEffect

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import usePermission from '@/hooks/usePermission';

// Import the dynamic API_BASE from your centralized axios config
import { API_BASE } from '../../../src/api/axios'; 

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
   * 🛡️ FOCUS LOAD: Refreshes statistics every time the user returns to the Dashboard.
   * This ensures counts are always up to date after adding/removing records.
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const userDataJson = await AsyncStorage.getItem('userData');
          if (userDataJson) {
            const parsedUser = JSON.parse(userDataJson);
            setUser(parsedUser);
            
            // Only fetch counts if the user has permission
            // We use parsedUser here because the 'user' state might not be updated yet
            const permissions = parsedUser.roles?.[0]?.permissions || [];
            const canSeeStats = permissions.some((p: any) => 
              ['Ver-usuarios', 'Ver-roles'].includes(p.name)
            );

            if (canSeeStats) {
              await fetchCounts();
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } catch (e) {
          console.error("Load error in Home:", e);
          setLoading(false);
        }
      };

      initialize();

      return () => {
        // Optional cleanup
      };
    }, [])
  );

  /**
   * Fetches statistics from Laravel API using centralized API_BASE.
   * Added cache busting via timestamp.
   */
  const fetchCounts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      
      const response = await axios.get(`${API_BASE}/users/count?t=${t}`, {
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
          ¡Bienvenido: {user?.name?.split(' ')[0]}!
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
    minHeight: 155, 
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
    alignItems: 'center', 
    paddingTop: 5 
  },
  cardNumber: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: 'white',
    lineHeight: 38, 
    includeFontPadding: false 
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