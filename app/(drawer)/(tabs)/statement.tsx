import React, { useState, useCallback } from 'react'; // Removed useEffect, added useCallback
import { 
  StyleSheet, View, ActivityIndicator, 
  TouchableOpacity, ScrollView, Modal, FlatList 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router'; // Added useFocusEffect

// Corrected relative path to reach src/api/axios from app/(drawer)/(tabs)/
import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * StatementScreen Component
 * Allows residents to view their account statements, payment history, and pending balances.
 */
export default function StatementScreen() {
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [addressDetails, setAddressDetails] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [paidMonths, setPaidMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [showPicker, setShowPicker] = useState(false); 

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  const months = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' }
  ];

  /**
   * 🛡️ FOCUS LOAD: Refreshes statement data every time the screen is focused.
   * This ensures residents see their latest payments immediately.
   */
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
      
      return () => {
        // Optional cleanup
      };
    }, [year, addressDetails?.id])
  );

  /**
   * Fetches user properties and validates 'ver-estado-cuenta' permission using dynamic API_BASE.
   * Added cache busting via timestamp.
   */
  const fetchInitialData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      
      const response = await axios.get(`${API_BASE}/user?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      
      const freshUser = response.data;
      // Flatten permissions from roles and direct permissions
      const perms = [
        ...(freshUser.permissions || []), 
        ...(freshUser.roles?.flatMap((r: any) => r.permissions || []) || [])
      ].map(p => p.name.toLowerCase());

      if (!perms.includes('ver-estado-cuenta')) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const userProperties = freshUser.addresses || (freshUser.address ? [freshUser.address] : []);
      if (userProperties.length > 0) {
        setAllAddresses(userProperties);
        // Only set default if not already selected to avoid overwriting during focus refreshes
        if (!addressDetails) {
          setAddressDetails(userProperties[0]);
        }
      }

      if (addressDetails?.id) {
        await fetchStatement();
      }
      
    } catch (error) {
      console.error("Fetch initial error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the specific payment history for the selected address/year combination.
   * Added cache busting via timestamp.
   */
  const fetchStatement = async () => {
    if (!addressDetails?.id) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(
        `${API_BASE}/address_payments/paid-months/${addressDetails.id}/${year}?t=${t}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      setPaidMonths(response.data.months || []);
    } catch (error) {
      console.error("Fetch statement error:", error);
    }
  };

  /**
   * Helper to find payment data for a specific month number.
   */
  const getMonthStatus = (monthNum: number) => 
    paidMonths.find(item => Number(item.month) === monthNum);

  if (loading) return <ActivityIndicator size="large" style={styles.loader} color="#28a745" />;

  if (!isAuthorized) {
    return (
      <ThemedView style={styles.center}>
        <IconSymbol name="lock.fill" size={50} color="#dc3545" />
        <ThemedText style={styles.errorText}>Acceso Denegado</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.title}>Estado de Cuenta</ThemedText>

        {/* PROPERTY SELECTOR (Dropdown style) */}
        <ThemedText style={styles.selectionLabel}>Seleccionar Propiedad:</ThemedText>
        <TouchableOpacity 
          style={styles.pickerTrigger} 
          onPress={() => setShowPicker(true)}
        >
          <View>
            <ThemedText style={styles.pickerTriggerText}>
              {addressDetails?.street?.name} #{addressDetails?.street_number}
            </ThemedText>
            <ThemedText style={styles.pickerTriggerSub}>
              {addressDetails?.type || 'Propiedad'}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.down" size={20} color="#666" />
        </TouchableOpacity>

        {/* MODAL FOR PROPERTY LIST */}
        <Modal visible={showPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Mis Propiedades</ThemedText>
              <FlatList
                data={allAddresses}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.modalItem, 
                      addressDetails?.id === item.id && styles.modalItemActive
                    ]}
                    onPress={() => {
                      setAddressDetails(item);
                      setShowPicker(false);
                    }}
                  >
                    <ThemedText style={[styles.modalItemText, addressDetails?.id === item.id && {color: '#28a745'}]}>
                      {item.street?.name} #{item.street_number}
                    </ThemedText>
                    {addressDetails?.id === item.id && <IconSymbol name="checkmark" size={18} color="#28a745" />}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowPicker(false)}>
                <ThemedText style={styles.closeBtnText}>Cerrar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* YEAR SELECTOR */}
        <View style={styles.yearRow}>
          {availableYears.map(y => (
            <TouchableOpacity 
              key={y} 
              style={[styles.yearBtn, year === y && styles.activeYearBtn]} 
              onPress={() => setYear(y)}
            >
              <ThemedText style={year === y && { color: 'white', fontWeight: 'bold' }}>{y}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* PAYMENTS LISTING */}
        <View style={styles.listContainer}>
          {months.map(m => {
            const status = getMonthStatus(m.v);
            return (
              <View key={m.v} style={styles.monthRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.monthLabel}>{m.l}</ThemedText>
                  <ThemedText style={styles.feeText}>{status?.fee_name || 'Sin cuota'}</ThemedText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[
                    styles.badge, 
                    { backgroundColor: status ? (status.status === 'Condonado' ? '#17a2b8' : '#28a745') : '#dc3545' }
                  ]}>
                    <ThemedText style={styles.badgeText}>{status ? status.status : 'Pendiente'}</ThemedText>
                  </View>
                  <ThemedText style={styles.amountText}>
                    {status ? `$${parseFloat(status.amount_paid).toFixed(2)}` : '$0.00'}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { marginBottom: 15 },
  errorText: { marginTop: 10, fontWeight: 'bold' },
  selectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 5, textTransform: 'uppercase' },
  pickerTrigger: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    marginBottom: 20,
    elevation: 2
  },
  pickerTriggerText: { fontWeight: 'bold', fontSize: 16 },
  pickerTriggerSub: { fontSize: 12, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
  modalItemActive: { backgroundColor: '#f0fff4' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 15, padding: 12, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
  closeBtnText: { fontWeight: 'bold', color: '#333' },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  yearBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginHorizontal: 4, backgroundColor: 'white' },
  activeYearBtn: { backgroundColor: '#007bff', borderColor: '#0056b3' },
  listContainer: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 15, marginBottom: 30, elevation: 3 },
  monthRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f3f5', alignItems: 'center' },
  monthLabel: { fontWeight: 'bold', fontSize: 16 },
  feeText: { fontSize: 12, color: '#adb5bd' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  amountText: { fontWeight: 'bold', color: '#28a745', fontSize: 15 }
});