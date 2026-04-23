import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

import { API_BASE } from '../../../src/api/axios';
import { ThemedText } from '@/components/themed-text';

const screenWidth = Dimensions.get('window').width;
const cardSize = (screenWidth - 40) / 3;

export default function PaymentsCalendarScreen() {
  const params = useLocalSearchParams();
  const initialAddressId = params.addressId as string;
  const currentYear = new Date().getFullYear();

  // --- STATE ---
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressId, setAddressId] = useState(initialAddressId || '');
  const [selectedAddressLabel, setSelectedAddressLabel] = useState('Seleccionar...');

  const [year, setYear] = useState<number>(currentYear);

  const [availableFees, setAvailableFees] = useState<any[]>([]);
  const [feeId, setFeeId] = useState<number | string>('');
  const [selectedFeeLabel, setSelectedFeeLabel] = useState('Seleccionar...');

  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const [feeModalVisible, setFeeModalVisible] = useState(false);

  const months = [
    { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' }, { value: 4, label: 'Abr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' }
  ];

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Whenever address changes, fetch full history
  useEffect(() => {
    if (addressId) fetchHistory();
  }, [addressId]);

  // Whenever History or Year changes, determine which Fees are available
  useEffect(() => {
    updateAvailableFees();
  }, [fullHistory, year]);

  // Whenever Fee selection changes, update the calendar grid
  useEffect(() => {
    if (feeId) {
      const filtered = fullHistory.filter(p => 
        Number(p.year) === Number(year) && 
        Number(p.fee_id) === Number(feeId) && 
        p.deleted_at === null
      );
      setFilteredPayments(filtered);
    } else {
      setFilteredPayments([]);
    }
  }, [feeId, year, fullHistory]);

  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userDataString = await AsyncStorage.getItem('userData');
      const user = userDataString ? JSON.parse(userDataString) : null;

      const res = await axios.get(`${API_BASE}/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let data = res.data.data || res.data;
      if (user && user.id) data = data.filter((a: any) => a.user_id === user.id);
      setAddresses(data);

      const current = data.find((a: any) => a.id.toString() === addressId.toString());
      if (current) setSelectedAddressLabel(`${current.street?.name} #${current.street_number}`);
    } catch (e) { console.error("Addresses Error", e); }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Using paymentHistory method from controller to get all records for this address
      const res = await axios.get(`${API_BASE}/address_payments/history/${addressId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFullHistory(res.data.data || []);
    } catch (e) { console.error("History Error", e); }
    finally { setLoading(false); }
  };

  const updateAvailableFees = () => {
    // Filter records for the current selected year
    const yearRecords = fullHistory.filter(p => Number(p.year) === Number(year) && p.deleted_at === null);
    
    // Extract unique Fees found in those records
    const uniqueFeesMap = new Map();
    yearRecords.forEach(p => {
      if (p.fee && !uniqueFeesMap.has(p.fee_id)) {
        uniqueFeesMap.set(p.fee_id, { id: p.fee_id, name: p.fee.name });
      }
    });

    const list = Array.from(uniqueFeesMap.values());
    setAvailableFees(list);

    // Auto-select the first available fee if the list changed
    if (list.length > 0) {
      setFeeId(list[0].id);
      setSelectedFeeLabel(list[0].name);
    } else {
      setFeeId('');
      setSelectedFeeLabel('Sin Pagos');
    }
  };

  const getStatus = (monthValue: number) => {
    const p = filteredPayments.find(p => Number(p.month) === monthValue);
    if (p) {
      if (p.status === 'Pagado') return 'paid';
      if (p.status === 'Condonado') return 'condoned';
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYearCheck = now.getFullYear();

    if (year < currentYearCheck || (year === currentYearCheck && monthValue < currentMonth)) {
      return 'overdue';
    }
    return 'none';
  };

  const getColor = (status: string) => {
    switch (status) {
      case 'paid': return '#28a745'; 
      case 'overdue': return '#dc3545';
      case 'condoned': return '#17a2b8';
      default: return '#ffffff';
    }
  };

  const readyToShow = addressId && year && feeId;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.customSelector} onPress={() => setAddressModalVisible(true)}>
            <ThemedText style={styles.selectorLabel}>PREDIO</ThemedText>
            <ThemedText numberOfLines={1} style={styles.selectorValue}>{selectedAddressLabel}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.customSelector, { flex: 0.3 }]} onPress={() => setYearModalVisible(true)}>
            <ThemedText style={styles.selectorLabel}>AÑO</ThemedText>
            <ThemedText style={styles.selectorValue}>{year}</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.customSelector} onPress={() => setFeeModalVisible(true)}>
            <ThemedText style={styles.selectorLabel}>CUOTA</ThemedText>
            <ThemedText numberOfLines={1} style={styles.selectorValue}>{selectedFeeLabel}</ThemedText>
          </TouchableOpacity>
        </View>

        {readyToShow && (
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#28a745'}]} /><ThemedText style={styles.legendText}>Pagado</ThemedText></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#dc3545'}]} /><ThemedText style={styles.legendText}>Atrasado</ThemedText></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#17a2b8'}]} /><ThemedText style={styles.legendText}>Condonado</ThemedText></View>
          </View>
        )}
      </View>

      {!readyToShow ? (
        <View style={styles.emptyState}>
          <ThemedText style={{color: '#888', textAlign: 'center'}}>
            {availableFees.length === 0 && !loading ? 'No se encontraron cuotas pagadas para este año.' : 'Selecciona los parámetros para ver el calendario.'}
          </ThemedText>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={months}
          keyExtractor={(item) => item.value.toString()}
          numColumns={3}
          renderItem={({ item }) => {
            const status = getStatus(item.value);
            const hasStatus = status !== 'none';
            return (
              <View style={[styles.card, { backgroundColor: getColor(status) }, !hasStatus && styles.cardBorder]}>
                <ThemedText style={{ color: hasStatus ? '#fff' : '#333', fontWeight: 'bold' }}>{item.label}</ThemedText>
                {hasStatus && <ThemedText style={styles.cardIcon}>{status === 'paid' && '✔'}{status === 'overdue' && '✖'}{status === 'condoned' && 'C'}</ThemedText>}
              </View>
            );
          }}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* PREDIO MODAL */}
      <Modal visible={addressModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setAddressModalVisible(false)}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Mis Predios</ThemedText>
            <ScrollView>{addresses.map((a) => (
              <TouchableOpacity key={a.id} style={styles.modalItem} onPress={() => { setAddressId(a.id); setSelectedAddressLabel(`${a.street?.name} #${a.street_number}`); setFeeId(''); setAddressModalVisible(false); }}>
                <ThemedText>{a.street?.name} #{a.street_number}</ThemedText>
              </TouchableOpacity>
            ))}</ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* YEAR MODAL */}
      <Modal visible={yearModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setYearModalVisible(false)}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Seleccionar Año</ThemedText>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <TouchableOpacity key={y} style={styles.modalItem} onPress={() => { setYear(Number(y)); setFeeId(''); setYearModalVisible(false); }}>
                <ThemedText style={{ textAlign: 'center', fontSize: 18, color: year === y ? '#007AFF' : '#333' }}>{y}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FEE MODAL */}
      <Modal visible={feeModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setFeeModalVisible(false)}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Cuotas Disponibles</ThemedText>
            <ScrollView>
              {availableFees.map((f) => (
                <TouchableOpacity key={f.id} style={styles.modalItem} onPress={() => { setFeeId(f.id); setSelectedFeeLabel(f.name); setFeeModalVisible(false); }}>
                  <ThemedText>{f.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerContainer: { backgroundColor: '#fff', zIndex: 10, elevation: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  topBar: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 15, paddingBottom: 10, gap: 8 },
  customSelector: { flex: 1, backgroundColor: '#f8f9fa', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', minHeight: 55, justifyContent: 'center' },
  selectorLabel: { fontSize: 9, color: '#007AFF', fontWeight: 'bold', marginBottom: 2 },
  selectorValue: { fontSize: 12, color: '#333', fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 15, paddingTop: 5 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11, color: '#666' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  listContainer: { padding: 10, paddingTop: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { width: cardSize, margin: 5, paddingVertical: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardBorder: { borderWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#fff' },
  cardIcon: { fontSize: 18, color: '#fff', marginTop: 5, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }
});