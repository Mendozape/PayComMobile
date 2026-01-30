import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, 
  Alert, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const API_BASE = 'http://192.168.1.16:8000/api';

export default function CreatePaymentScreen() {
  const router = useRouter();
  const { addressId } = useLocalSearchParams();
  
  const [address, setAddress] = useState<any>(null);
  const [fees, setFees] = useState<any[]>([]);
  const [paidMonths, setPaidMonths] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [feeId, setFeeId] = useState('');
  // Set initial year to current year
  const currentYearInt = new Date().getFullYear();
  const [year, setYear] = useState(currentYearInt.toString());
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [waivedMonths, setWaivedMonths] = useState<number[]>([]);
  const [unitAmount, setUnitAmount] = useState(0);

  // Generate year options: Previous, Current, Next
  const yearOptions = [
    (currentYearInt - 1).toString(),
    currentYearInt.toString(),
    (currentYearInt + 1).toString()
  ];

  const months = [
    { v: 1, l: 'Ene' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' }, { v: 4, l: 'Abr' },
    { v: 5, l: 'May' }, { v: 6, l: 'Jun' }, { v: 7, l: 'Jul' }, { v: 8, l: 'Ago' },
    { v: 9, l: 'Sep' }, { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dic' }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Refresh data when year or fee changes
  useEffect(() => {
    if (feeId && year) fetchPaidMonths();
  }, [feeId, year]);

  const fetchInitialData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [resAddr, resFees] = await Promise.all([
        axios.get(`${API_BASE}/addresses/${addressId}`, config),
        axios.get(`${API_BASE}/fees`, config)
      ]);
      setAddress(resAddr.data.data);
      setFees(resFees.data.data.filter((f: any) => !f.deleted_at));
    } catch (e) { 
      Alert.alert("Error", "No se pudo cargar la información del predio."); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchPaidMonths = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/address_payments/paid-months/${addressId}/${year}?fee_id=${feeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaidMonths(res.data.months || []);
      setSelectedMonths([]);
      setWaivedMonths([]);
    } catch (e) { 
      console.error("Error fetching paid months:", e); 
    }
  };

  const handleFeeSelect = (fee: any) => {
    setFeeId(fee.id.toString());
    let amount = 0;
    if (address.type === 'TERRENO') amount = fee.amount_land;
    else amount = address.status === 'Habitada' ? fee.amount_occupied : fee.amount_empty;
    setUnitAmount(amount);
  };

  const toggleMonth = (month: number, type: 'P' | 'C') => {
    if (type === 'P') {
      if (selectedMonths.includes(month) && !waivedMonths.includes(month)) {
        setSelectedMonths(prev => prev.filter(m => m !== month));
      } else {
        setSelectedMonths(prev => [...prev.filter(m => m !== month), month]);
        setWaivedMonths(prev => prev.filter(m => m !== month));
      }
    } else {
      if (waivedMonths.includes(month)) {
        setWaivedMonths(prev => prev.filter(m => m !== month));
        setSelectedMonths(prev => prev.filter(m => m !== month));
      } else {
        setWaivedMonths(prev => [...prev.filter(m => m !== month), month]);
        setSelectedMonths(prev => [...prev.filter(m => m !== month), month]);
      }
    }
  };

  const handleSave = async () => {
    if (selectedMonths.length === 0) return Alert.alert("Aviso", "Seleccione al menos un mes.");
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_BASE}/address_payments`, {
        address_id: addressId,
        fee_id: feeId,
        year: year,
        payment_date: new Date().toISOString().split('T')[0],
        months: selectedMonths.filter(m => !waivedMonths.includes(m)),
        waived_months: waivedMonths
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      Alert.alert("Éxito", "Pago registrado correctamente.");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.response?.data?.message || "Fallo al registrar.");
    } finally { 
      setIsSaving(false); 
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{flex:1}} />;

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle">Pago: {address?.street?.name} #{address?.street_number}</ThemedText>
        
        <ThemedText style={styles.label}>1. Seleccione Cuota</ThemedText>
        <View style={styles.feeList}>
          {fees.map(f => (
            <TouchableOpacity 
              key={f.id} 
              style={[styles.feeBtn, feeId === f.id.toString() && styles.activeBtn]} 
              onPress={() => handleFeeSelect(f)}
            >
              <ThemedText style={feeId === f.id.toString() && {color:'white'}}>{f.name}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {feeId ? (
          <View style={styles.card}>
            <ThemedText style={styles.amountText}>Monto por mes: ${unitAmount}</ThemedText>
            
            <ThemedText style={styles.label}>2. Seleccione Año</ThemedText>
            <View style={styles.yearSelector}>
              {yearOptions.map(y => (
                <TouchableOpacity 
                  key={y} 
                  style={[styles.yearBtn, year === y && styles.activeYearBtn]}
                  onPress={() => setYear(y)}
                >
                  <ThemedText style={year === y && {color: 'white', fontWeight: 'bold'}}>{y}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.miniBtn, styles.payActive, {width: 18, height: 18}]}><ThemedText style={styles.legendText}>P</ThemedText></View>
                <ThemedText style={styles.legendLabel}> = Pagar</ThemedText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.miniBtn, styles.waiveActive, {width: 18, height: 18}]}><ThemedText style={styles.legendText}>C</ThemedText></View>
                <ThemedText style={styles.legendLabel}> = Condonar</ThemedText>
              </View>
            </View>
            
            <View style={styles.monthsGrid}>
              {months.map(m => {
                const paid = paidMonths.find(p => p.month === m.v);
                const isSel = selectedMonths.includes(m.v);
                const isWaive = waivedMonths.includes(m.v);
                return (
                  <View key={m.v} style={styles.monthBox}>
                    <ThemedText style={styles.monthLabel}>{m.l}</ThemedText>
                    {paid ? (
                      <View style={[styles.statusBadge, {backgroundColor: paid.status === 'Condonado' ? '#17a2b8' : '#28a745'}]}>
                        <ThemedText style={styles.badgeText}>{paid.status[0]}</ThemedText>
                      </View>
                    ) : (
                      <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => toggleMonth(m.v, 'P')} style={[styles.miniBtn, isSel && !isWaive && styles.payActive]}>
                          <ThemedText style={[styles.miniText, isSel && !isWaive && {color:'white'}]}>P</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleMonth(m.v, 'C')} style={[styles.miniBtn, isWaive && styles.waiveActive]}>
                          <ThemedText style={[styles.miniText, isWaive && {color:'white'}]}>C</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, isSaving && {backgroundColor: '#ccc'}]} 
              onPress={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText style={styles.saveBtnText}>
                  Registrar ${(selectedMonths.length - waivedMonths.length) * unitAmount}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  label: { fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  feeList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feeBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: 'white' },
  activeBtn: { backgroundColor: '#28a745', borderColor: '#28a745' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginTop: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  amountText: { fontSize: 18, fontWeight: 'bold', color: '#28a745', textAlign: 'center', marginBottom: 15 },
  yearSelector: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  yearBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fdfdfd' },
  activeYearBtn: { backgroundColor: '#007bff', borderColor: '#007bff' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 15, paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#eee' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  legendLabel: { fontSize: 12, color: '#666' },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthBox: { width: '23%', alignItems: 'center', marginBottom: 15, padding: 5, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  monthLabel: { fontSize: 12, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 4, marginTop: 5 },
  miniBtn: { width: 25, height: 25, borderRadius: 5, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  payActive: { backgroundColor: '#28a745' },
  waiveActive: { backgroundColor: '#17a2b8' },
  miniText: { fontSize: 10, fontWeight: 'bold' },
  statusBadge: { width: '100%', marginTop: 5, borderRadius: 4, alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#28a745', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});