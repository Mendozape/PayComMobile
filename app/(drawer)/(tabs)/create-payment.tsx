import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { API_BASE } from '../../../src/api/axios';
import { ThemedText } from '@/components/themed-text';

export default function CreatePaymentScreen() {
  const { addressId } = useLocalSearchParams();

  const [address, setAddress] = useState(null);
  const [fees, setFees] = useState([]);
  const [feeId, setFeeId] = useState('');
  const [selectedFeeLabel, setSelectedFeeLabel] = useState('Selecciona...');
  const [year, setYear] = useState('');
  const [paidMonths, setPaidMonths] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [waivedMonths, setWaivedMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [feeModalVisible, setFeeModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const [step, setStep] = useState(1);

  const paymentDate = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const months = [
    { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' }, { value: 4, label: 'Abr' },
    { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' },
    { value: 9, label: 'Sep' }, { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' }
  ];

  useFocusEffect(
    useCallback(() => {
      resetAll();
      fetchData();
    }, [])
  );

  const resetAll = () => {
    setFeeId('');
    setSelectedFeeLabel('Selecciona...');
    setYear('');
    setSelectedMonths([]);
    setWaivedMonths([]);
    setPaidMonths([]);
    setStep(1);
  };

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const [resAddr, resFees] = await Promise.all([
        axios.get(`${API_BASE}/addresses/${addressId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE}/fees`, {
          headers: { Authorization: `Bearer ${token}` }
        } )
      ]);

      setAddress(resAddr.data.data);
      setFees(resFees.data.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPaid = async () => {
      if (!year || !feeId) return;

      try {
        const token = await AsyncStorage.getItem('userToken');

        const res = await axios.get(
          `${API_BASE}/address_payments/paid-months/${addressId}/${year}?fee_id=${feeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setPaidMonths(res.data.months || []);
      } catch {
        setPaidMonths([]);
      }
    };

    fetchPaid();
  }, [year, feeId]);

  const isMonthPaid = (m) =>
    paidMonths.some(x => Number(x.month) === m);

  const getStatus = (m) =>
    paidMonths.find(x => Number(x.month) === m);

  const handleAction = (month, type) => {
    if (isMonthPaid(month)) return;

    setSelectedMonths(prev =>
      prev.includes(month) ? prev : [...prev, month]
    );

    setWaivedMonths(prev => {
      if (type === 'C') {
        return prev.includes(month) ? prev : [...prev, month];
      }
      return prev.filter(m => m !== month);
    });
  };

  const handleSave = async () => {
    if (!feeId || !year || selectedMonths.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Completa todos los campos'
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      await axios.post(`${API_BASE}/address_payments`, {
        address_id: Number(addressId),
        fee_id: Number(feeId),
        year: Number(year),
        payment_date: paymentDate,
        months: selectedMonths,
        waived_months: waivedMonths
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Pagos registrados correctamente'
      });

      resetAll();

      setTimeout(() => {
        router.back();
      }, 600);

    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: e.response?.data?.message || 'No se pudo guardar'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#28a745" />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerText}>
          Registrar Pago: {address?.street?.name} #{address?.street_number}
        </ThemedText>
      </View>

      <View style={styles.card}>
        <View style={styles.selectorsRow}>
          {/* STEP 1: CUOTA */}
          <View style={styles.selectorContainer}>
            <ThemedText style={styles.label}>Cuota</ThemedText>
            <TouchableOpacity 
              style={styles.customSelector} 
              onPress={() => setFeeModalVisible(true)}
            >
              <ThemedText numberOfLines={1} style={styles.selectorValue}>
                {selectedFeeLabel}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* STEP 2: YEAR */}
          <View style={[styles.selectorContainer, { flex: 0.4 }]}>
            <ThemedText style={styles.label}>Año</ThemedText>
            <TouchableOpacity 
              style={[styles.customSelector, step < 2 && { opacity: 0.5 }]} 
              onPress={() => step >= 2 && setYearModalVisible(true)}
            >
              <ThemedText style={styles.selectorValue}>{year || '----'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* STEP 3: MONTHS */}
        {step >= 3 && feeId && year && (
          <>
            <View style={styles.legend}>
              <ThemedText style={styles.legendText}>P = Pagado</ThemedText>
              <ThemedText style={styles.legendText}>C = Condonado</ThemedText>
            </View>

            <View style={styles.monthGrid}>
              {months.map(m => {
                const paid = isMonthPaid(m.value);
                const status = getStatus(m.value);
                const isPay = selectedMonths.includes(m.value) && !waivedMonths.includes(m.value);
                const isCond = waivedMonths.includes(m.value);

                return (
                  <View key={m.value} style={styles.monthBox}>
                    <ThemedText style={styles.monthLabel}>{m.label}</ThemedText>

                    {paid ? (
                      <ThemedText style={styles.paid}>
                        {status?.status === 'Condonado' ? 'C' : 'P'}
                      </ThemedText>
                    ) : (
                      <View style={styles.radioRow}>
                        <TouchableOpacity
                          style={styles.radioItem}
                          onPress={() => handleAction(m.value, 'P')}
                        >
                          <View style={[styles.radioCircle, isPay && styles.radioSelected]} />
                          <ThemedText style={styles.radioText}>P</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.radioItem}
                          onPress={() => handleAction(m.value, 'C')}
                        >
                          <View style={[styles.radioCircle, isCond && styles.radioSelectedCond]} />
                          <ThemedText style={styles.radioText}>C</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <ThemedText style={styles.saveText}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* FEE MODAL */}
      <Modal visible={feeModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setFeeModalVisible(false)}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Seleccionar Cuota</ThemedText>
            <ScrollView>
              {fees.map((f) => (
                <TouchableOpacity key={f.id} style={styles.modalItem} onPress={() => {
                  setFeeId(f.id);
                  setSelectedFeeLabel(f.name);
                  setYear('');
                  setStep(2);
                  setFeeModalVisible(false);
                }}>
                  <ThemedText>{f.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* YEAR MODAL */}
      <Modal visible={yearModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setYearModalVisible(false)}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Seleccionar Año</ThemedText>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <TouchableOpacity key={y} style={styles.modalItem} onPress={() => {
                setYear(y.toString());
                setStep(3);
                setYearModalVisible(false);
              }}>
                <ThemedText style={{ textAlign: 'center', fontSize: 18 }}>{y}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  header: { backgroundColor: '#28a745', padding: 20 },
  headerText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  card: { margin: 15, padding: 15, backgroundColor: 'white', borderRadius: 12, elevation: 3 },
  selectorsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  selectorContainer: { flex: 1 },
  label: { fontSize: 11, fontWeight: 'bold', color: '#007AFF', marginBottom: 4, textTransform: 'uppercase' },
  customSelector: { 
    backgroundColor: '#f8f9fa', 
    padding: 10, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#dee2e6',
    minHeight: 45,
    justifyContent: 'center'
  },
  selectorValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  legendText: { fontWeight: 'bold', fontSize: 13, color: '#444' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 15 },
  monthBox: { width: '23%', padding: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 10, alignItems: 'center', marginBottom: 12, backgroundColor: '#fff' },
  monthLabel: { fontWeight: 'bold', fontSize: 13, color: '#333', marginBottom: 4 },
  paid: { color: '#28a745', fontWeight: 'bold', marginTop: 5, fontSize: 16 },
  radioRow: { flexDirection: 'row', gap: 8, marginTop: 5 },
  radioItem: { alignItems: 'center' },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#ccc', marginBottom: 2 },
  radioText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  radioSelected: { backgroundColor: '#28a745', borderColor: '#28a745' },
  radioSelectedCond: { backgroundColor: '#17a2b8', borderColor: '#17a2b8' },
  saveBtn: { marginTop: 20, backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 15, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }
});