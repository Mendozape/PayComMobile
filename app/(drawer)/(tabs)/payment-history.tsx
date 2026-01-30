import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, View, FlatList, ActivityIndicator, TouchableOpacity, 
  Alert, Modal, TextInput 
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const API_BASE = 'http://192.168.1.16:8000/api';

export default function PaymentHistoryScreen() {
  const { addressId } = useLocalSearchParams();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/address_payments/history/${addressId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data.data || res.data);
    } catch (e) { 
      console.error("Error fetching history:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleCancel = async () => {
    if (reason.length < 5) return Alert.alert("Error", "El motivo debe tener al menos 5 caracteres.");
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // POST request to void the specific payment
      await axios.post(`${API_BASE}/address_payments/cancel/${selectedPayment.id}`, { reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Éxito", "El pago ha sido anulado.");
      setCancelModal(false);
      fetchHistory(); // Refresh list after voiding
    } catch (e) { 
      Alert.alert("Error", "No se pudo anular el pago."); 
    } finally { 
      setIsSaving(false); 
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} />;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={{marginBottom: 20}}>Historial de Pagos</ThemedText>
      
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={{flex:1}}>
              <ThemedText style={styles.feeName}>{item.fee?.name}</ThemedText>
              <ThemedText style={styles.period}>{item.month}/{item.year}</ThemedText>
              <ThemedText style={styles.date}>Pagado el: {item.payment_date}</ThemedText>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <ThemedText style={styles.amount}>${item.amount_paid}</ThemedText>
              <View style={[
                styles.badge, 
                {backgroundColor: item.deleted_at ? '#dc3545' : item.status === 'Condonado' ? '#17a2b8' : '#28a745'}
              ]}>
                <ThemedText style={styles.badgeText}>
                  {item.deleted_at ? 'Anulado' : item.status}
                </ThemedText>
              </View>
              {/* Void button - only shown if payment is not already deleted */}
              {!item.deleted_at && (
                <TouchableOpacity onPress={() => { setSelectedPayment(item); setReason(''); setCancelModal(true); }}>
                  <IconSymbol name="ban" size={20} color="#dc3545" style={{marginTop: 8}} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      {/* Void Payment Modal */}
      <Modal visible={cancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle">Anular Pago</ThemedText>
            <TextInput 
              style={styles.input} 
              placeholder="Motivo de anulación..." 
              multiline 
              onChangeText={setReason} 
              value={reason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setCancelModal(false)}>
                <ThemedText>Cerrar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCancel} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{color:'white'}}>Confirmar</ThemedText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  paymentCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', elevation: 2 },
  feeName: { fontWeight: 'bold', fontSize: 16 },
  period: { color: '#666' },
  date: { fontSize: 12, color: '#aaa' },
  amount: { fontWeight: 'bold', fontSize: 16, color: '#28a745' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '85%' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', height: 80, marginVertical: 15, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#dc3545', padding: 10, borderRadius: 8, minWidth: 80, alignItems: 'center' }
});