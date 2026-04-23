import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, View, ActivityIndicator, 
  TouchableOpacity, ScrollView, Modal, FlatList, Dimensions 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

// Configuración de API y componentes base
import { API_BASE } from '../../../src/api/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const screenWidth = Dimensions.get('window').width;
const cardSize = (screenWidth - 60) / 3; 

/**
 * PaymentsCalendarScreen Component
 * Visualizes payment status across the year in a grid format.
 * Includes property, year, and fee filtering.
 */
export default function PaymentsCalendarScreen() {
  const params = useLocalSearchParams();
  const initialAddressId = params.addressId as string;
  
  // --- STATE ---
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [addressDetails, setAddressDetails] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [availableFees, setAvailableFees] = useState<any[]>([]);
  const [selectedFee, setSelectedFee] = useState<any>(null);
  
  const [fullHistory, setFullHistory] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Modals Visibility
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showFeePicker, setShowFeePicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 1, currentYear, currentYear + 1];

  const months = [
    { v: 1, l: 'Ene' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' },
    { v: 4, l: 'Abr' }, { v: 5, l: 'May' }, { v: 6, l: 'Jun' },
    { v: 7, l: 'Jul' }, { v: 8, l: 'Ago' }, { v: 9, l: 'Sep' },
    { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dic' }
  ];

  /**
   * REFRESH ON FOCUS: Ensures data is fresh when navigating back/forth
   */
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [year, addressDetails?.id])
  );

  /**
   * Updates the calendar grid whenever Fee, Year or History changes
   */
  useEffect(() => {
    if (selectedFee && fullHistory.length > 0) {
      const filtered = fullHistory.filter(p => 
        Number(p.year) === Number(year) && 
        Number(p.fee_id) === Number(selectedFee.id) && 
        p.deleted_at === null
      );
      setFilteredPayments(filtered);
    } else {
      setFilteredPayments([]);
    }
  }, [selectedFee, year, fullHistory]);

  /**
   * Fetches user properties and validates access permissions.
   */
  const fetchInitialData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      
      const response = await axios.get(`${API_BASE}/user?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      
      const freshUser = response.data;

      // Permission validation
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
      setAllAddresses(userProperties);

      // Handle initial address selection
      if (!addressDetails) {
        const initial = userProperties.find((a: any) => a.id.toString() === initialAddressId) || userProperties[0];
        setAddressDetails(initial);
        if (initial) await fetchHistory(initial.id);
      } else {
        await fetchHistory(addressDetails.id);
      }
      
    } catch (error) {
      console.error("Calendar initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the complete history for the specific property
   */
  const fetchHistory = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/address_payments/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const history = res.data.data || [];
      setFullHistory(history);
      updateAvailableFees(history);
    } catch (e) {
      console.error("History fetch error:", e);
    }
  };

  /**
   * Identifies unique fees available for the selected year
   */
  const updateAvailableFees = (history: any[]) => {
    const yearRecords = history.filter(p => Number(p.year) === Number(year) && p.deleted_at === null);
    const uniqueFeesMap = new Map();
    
    yearRecords.forEach(p => {
      if (p.fee && !uniqueFeesMap.has(p.fee_id)) {
        uniqueFeesMap.set(p.fee_id, { id: p.fee_id, name: p.fee.name });
      }
    });

    const list = Array.from(uniqueFeesMap.values());
    setAvailableFees(list);

    // Auto-select first available fee if none selected or if year changed
    if (list.length > 0) {
      setSelectedFee(list[0]);
    } else {
      setSelectedFee(null);
    }
  };

  /**
   * Status logic for each month cell
   */
  const getStatus = (monthNum: number) => {
    const p = filteredPayments.find(p => Number(p.month) === monthNum);
    if (p) {
      if (p.status === 'Pagado') return 'paid';
      if (p.status === 'Condonado') return 'condoned';
    }
    const now = new Date();
    const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && monthNum < (now.getMonth() + 1));
    return isPastMonth ? 'overdue' : 'none';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#28a745'; 
      case 'overdue': return '#dc3545';
      case 'condoned': return '#17a2b8';
      default: return '#fff';
    }
  };

  if (loading) return <ActivityIndicator size="large" style={styles.loader} color="#28a745" />;

  if (!isAuthorized) {
    return (
      <ThemedView style={styles.center}>
        <IconSymbol name="lock.fill" size={50} color="#dc3545" />
        <ThemedText style={styles.errorText}>Acceso Restringido</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.title}>Calendario de Pagos</ThemedText>

        {/* PROPERTY SELECTOR */}
        <ThemedText style={styles.selectionLabel}>Ubicación:</ThemedText>
        <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowAddressPicker(true)}>
          <View>
            <ThemedText style={styles.pickerTriggerText}>
              {addressDetails ? `${addressDetails.street?.name} #${addressDetails.street_number}` : 'Seleccionar...'}
            </ThemedText>
          </View>
          <IconSymbol name="house.fill" size={18} color="#666" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* YEAR SELECTOR */}
            <View style={{ flex: 0.4 }}>
                <ThemedText style={styles.selectionLabel}>Año:</ThemedText>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowYearPicker(true)}>
                    <ThemedText style={styles.pickerTriggerText}>{year}</ThemedText>
                    <IconSymbol name="calendar" size={16} color="#666" />
                </TouchableOpacity>
            </View>

            {/* FEE SELECTOR */}
            <View style={{ flex: 0.6 }}>
                <ThemedText style={styles.selectionLabel}>Concepto:</ThemedText>
                <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowFeePicker(true)}>
                    <ThemedText numberOfLines={1} style={styles.pickerTriggerText}>
                        {selectedFee?.name || 'Sin actividad'}
                    </ThemedText>
                    <IconSymbol name="chevron.down" size={16} color="#666" />
                </TouchableOpacity>
            </View>
        </View>

        {/* LEGEND */}
        {selectedFee && (
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#28a745'}]} /><ThemedText style={styles.legendText}>Activo</ThemedText></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#dc3545'}]} /><ThemedText style={styles.legendText}>Atrasado</ThemedText></View>
            <View style={styles.legendItem}><View style={[styles.dot, {backgroundColor:'#17a2b8'}]} /><ThemedText style={styles.legendText}>Condonado</ThemedText></View>
          </View>
        )}

        {/* MONTHS GRID */}
        {!selectedFee ? (
          <View style={styles.emptyState}>
            <IconSymbol name="info.circle" size={40} color="#ccc" />
            <ThemedText style={styles.emptyText}>No hay registros de pagos para los filtros seleccionados.</ThemedText>
          </View>
        ) : (
          <View style={styles.grid}>
            {months.map(m => {
              const status = getStatus(m.v);
              const isNone = status === 'none';
              return (
                <View key={m.v} style={[
                  styles.card, 
                  { backgroundColor: getStatusColor(status) },
                  isNone && styles.cardEmpty
                ]}>
                  <ThemedText style={[styles.cardLabel, !isNone && {color: '#fff'}]}>{m.l}</ThemedText>
                  {!isNone && (
                    <ThemedText style={styles.cardIcon}>
                      {status === 'paid' ? '✔' : status === 'overdue' ? '✖' : 'C'}
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* --- MODALS --- */}
      
      {/* Address Picker Modal */}
      <Modal visible={showAddressPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Mis Registros</ThemedText>
            <FlatList
              data={allAddresses}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.modalItem, addressDetails?.id === item.id && styles.activeItem]} 
                  onPress={() => {
                    setAddressDetails(item);
                    fetchHistory(item.id);
                    setShowAddressPicker(false);
                  }}
                >
                  <ThemedText style={addressDetails?.id === item.id && {color: '#28a745', fontWeight: 'bold'}}>
                    {item.street?.name} #{item.street_number}
                  </ThemedText>
                  {addressDetails?.id === item.id && <IconSymbol name="checkmark" size={18} color="#28a745" />}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddressPicker(false)}>
              <ThemedText style={styles.closeBtnText}>Cancelar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal visible={showYearPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Seleccionar Año</ThemedText>
            {availableYears.map(y => (
              <TouchableOpacity key={y} style={styles.modalItem} onPress={() => { setYear(y); setShowYearPicker(false); }}>
                <ThemedText style={{textAlign: 'center', fontSize: 18, color: year === y ? '#28a745' : '#333'}}>{y}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Fee Picker Modal */}
      <Modal visible={showFeePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Cuotas con Historial</ThemedText>
            <ScrollView>
              {availableFees.length > 0 ? availableFees.map(f => (
                <TouchableOpacity 
                    key={f.id} 
                    style={[styles.modalItem, selectedFee?.id === f.id && styles.activeItem]} 
                    onPress={() => { setSelectedFee(f); setShowFeePicker(false); }}
                >
                  <ThemedText style={selectedFee?.id === f.id && {color: '#28a745', fontWeight: 'bold'}}>{f.name}</ThemedText>
                </TouchableOpacity>
              )) : (
                <View style={{padding: 20}}>
                    <ThemedText style={{textAlign: 'center', color: '#999'}}>No se detectaron pagos para {year}</ThemedText>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowFeePicker(false)}>
              <ThemedText style={styles.closeBtnText}>Cerrar</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { marginBottom: 20 },
  selectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#888', marginBottom: 4, textTransform: 'uppercase' },
  pickerTrigger: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#eee', 
    marginBottom: 15,
    elevation: 1
  },
  pickerTriggerText: { fontWeight: '600', fontSize: 14 },
  legend: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 15, 
    backgroundColor: '#f8f9fa', 
    padding: 10, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f1f1'
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: cardSize, 
    height: cardSize * 0.9, 
    marginBottom: 15, 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardEmpty: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0', elevation: 0 },
  cardLabel: { fontWeight: 'bold', fontSize: 14 },
  cardIcon: { fontSize: 16, marginTop: 4, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 50, padding: 20 },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 10, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#28a745' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeItem: { borderBottomColor: '#28a745' },
  closeBtn: { marginTop: 10, padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#dc3545', fontWeight: 'bold' },
  errorText: { marginTop: 10, fontWeight: 'bold', fontSize: 18 }
});