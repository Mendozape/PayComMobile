import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, TextInput, 
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// Corrected imports
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view'; 
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

const API_BASE = 'http://192.168.1.16:8000/api';

export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [viewState, setViewState] = useState<'FORM' | 'STREET_PICKER' | 'USER_PICKER' | 'TYPE_PICKER' | 'STATUS_PICKER'>('FORM');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [streetId, setStreetId] = useState('');
  const [streetName, setStreetName] = useState('Seleccionar Calle');
  const [streetNumber, setStreetNumber] = useState('');
  const [residentId, setResidentId] = useState('');
  const [residentName, setResidentName] = useState('Asignar Residente');
  const [type, setType] = useState('CASA');
  const [status, setStatus] = useState('Habitada');
  const [monthsOverdue, setMonthsOverdue] = useState('0');
  const [comments, setComments] = useState('');
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const data = await AsyncStorage.getItem('userData');
      if (data) setUser(JSON.parse(data));
      await Promise.all([fetchAddresses(), fetchStreets(), fetchUsers()]);
      setLoading(false);
    };
    init();
  }, []);

  const { can } = usePermission(user);

  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/addresses`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } 
      });
      setAddresses(res.data.data || res.data);
    } catch (e) { console.error("Error fetching addresses:", e); }
  };

  const fetchStreets = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/streets`, { headers: { Authorization: `Bearer ${token}` } });
      setStreets((res.data.data || res.data).filter((s: any) => !s.deleted_at));
    } catch (e) { console.error("Error fetching streets:", e); }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data.data || res.data);
    } catch (e) { console.error("Error fetching users:", e); }
  };

  const openForm = (item: any = null) => {
    setEditingId(item?.id || null);
    setStreetId(item?.street_id?.toString() || '');
    setStreetName(item?.street?.name || 'Seleccionar Calle');
    setStreetNumber(item?.street_number || '');
    setResidentId(item?.user_id?.toString() || '');
    setResidentName(item?.user?.name || 'Asignar Residente');
    setType(item?.type || 'CASA');
    setStatus(item?.status || 'Habitada');
    setMonthsOverdue(item?.months_overdue?.toString() || '0');
    setComments(item?.comments || '');
    setViewState('FORM');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!streetId || !streetNumber || !residentId) return Alert.alert("Error", "Faltan campos obligatorios.");
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { 
        street_id: parseInt(streetId), 
        street_number: streetNumber, 
        user_id: parseInt(residentId), 
        type, 
        status: type === 'CASA' ? status : 'Deshabitada', 
        months_overdue: parseInt(monthsOverdue) || 0, 
        comments, 
        community: 'PRADOS DE LA HUERTA' 
      };
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      if (editingId) await axios.put(`${API_BASE}/addresses/${editingId}`, payload, config);
      else await axios.post(`${API_BASE}/addresses`, payload, config);
      setModalVisible(false);
      fetchAddresses();
    } catch (error: any) { Alert.alert("Fallo", error.response?.data?.message || "Error al guardar."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (deactivationReason.trim().length < 5) return Alert.alert("Error", "Motivo demasiado corto.");
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE}/addresses/${editingId}`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        data: { reason: deactivationReason }
      });
      setDeleteModalVisible(false);
      fetchAddresses();
    } catch (e: any) { Alert.alert("Error", "No se pudo eliminar."); }
    finally { setIsSaving(false); }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput style={styles.searchInput} placeholder="Buscar..." onChangeText={setSearch} />
        {can('Crear-predios') && (
          <TouchableOpacity style={styles.addButton} onPress={() => openForm()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={addresses.filter(a => a.street?.name?.toLowerCase().includes(search.toLowerCase()) || a.user?.name?.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.addressTitle}>{item.street?.name} #{item.street_number}</ThemedText>
              <ThemedText style={styles.residentName}>👤 {item.user?.name || 'Vacante'}</ThemedText>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, {backgroundColor: '#6c757d'}]}><ThemedText style={styles.badgeText}>{item.type}</ThemedText></View>
                {item.type === 'CASA' && (
                  <View style={[styles.badge, {backgroundColor: item.status === 'Habitada' ? '#007bff' : '#f0ad4e'}]}><ThemedText style={styles.badgeText}>{item.status}</ThemedText></View>
                )}
              </View>
            </View>
            
            <View style={styles.actionColumn}>
              {!item.deleted_at && (
                <View style={styles.mainActions}>
                  {can('Crear-pagos') && (
                    <TouchableOpacity onPress={() => router.push({ pathname: '/create-payment', params: { addressId: item.id } })} style={styles.iconCircle}>
                      <IconSymbol name="cash.fill" size={18} color="#28a745" />
                    </TouchableOpacity>
                  )}
                  {can('Ver-pagos') && (
                    <TouchableOpacity onPress={() => router.push({ pathname: '/payment-history', params: { addressId: item.id } })} style={styles.iconCircle}>
                      <IconSymbol name="road.fill" size={18} color="#f0ad4e" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <View style={styles.adminActions}>
                {can('Editar-predios') && !item.deleted_at && (
                  <TouchableOpacity onPress={() => openForm(item)}><IconSymbol name="pencil" size={18} color="#007AFF" /></TouchableOpacity>
                )}
                {can('Eliminar-predios') && !item.deleted_at && (
                  <TouchableOpacity onPress={() => { setEditingId(item.id); setDeactivationReason(''); setDeleteModalVisible(true); }}><IconSymbol name="trash" size={18} color="#ff4444" /></TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}
      />

      {/* FORM MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {viewState !== 'FORM' ? (
                <View style={{height: 400}}>
                   <FlatList 
                      data={viewState === 'STREET_PICKER' ? streets : viewState === 'USER_PICKER' ? users : viewState === 'TYPE_PICKER' ? [{id:'CASA', name:'CASA'}, {id:'TERRENO', name:'TERRENO'}] : [{id:'Habitada', name:'Habitada'}, {id:'Deshabitada', name:'Deshabitada'}]} 
                      renderItem={({item}) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => {
                           if(viewState==='STREET_PICKER') {setStreetId(item.id); setStreetName(item.name);}
                           if(viewState==='USER_PICKER') {setResidentId(item.id); setResidentName(item.name);}
                           if(viewState==='TYPE_PICKER') setType(item.id);
                           if(viewState==='STATUS_PICKER') setStatus(item.id);
                           setViewState('FORM');
                        }}><ThemedText>{item.name}</ThemedText></TouchableOpacity>
                   )} />
                </View>
              ) : (
                <View>
                  <ThemedText type="subtitle">Información del Predio</ThemedText>
                  <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('STREET_PICKER')}><ThemedText>{streetName}</ThemedText></TouchableOpacity>
                  <TextInput style={styles.input} value={streetNumber} onChangeText={setStreetNumber} placeholder="Número" keyboardType="numeric" />
                  <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('USER_PICKER')}><ThemedText>{residentName}</ThemedText></TouchableOpacity>
                  <View style={{flexDirection:'row', gap:10}}>
                    <TouchableOpacity style={[styles.pickerFake, {flex:1}]} onPress={() => setViewState('TYPE_PICKER')}><ThemedText>{type}</ThemedText></TouchableOpacity>
                    {type==='CASA' && <TouchableOpacity style={[styles.pickerFake, {flex:1}]} onPress={() => setViewState('STATUS_PICKER')}><ThemedText>{status}</ThemedText></TouchableOpacity>}
                  </View>
                  <TextInput style={styles.input} value={monthsOverdue} onChangeText={setMonthsOverdue} keyboardType="numeric" placeholder="Meses de retraso" />
                  <TextInput style={styles.input} value={comments} onChangeText={setComments} placeholder="Comentarios..." multiline />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText>Cerrar</ThemedText></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, {backgroundColor: isSaving ? '#ccc' : '#28a745'}]} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DELETION MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={{color:'#ff4444', fontWeight:'bold', fontSize:18}}>Dar de Baja Predio</ThemedText>
            <TextInput style={[styles.input, {height: 80, marginTop:15}]} placeholder="Motivo..." multiline value={deactivationReason} onChangeText={setDeactivationReason} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: isSaving ? '#666' : '#ff4444'}]} onPress={handleDelete} disabled={isSaving}>
                 {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{color:'white', fontWeight: 'bold'}}>Confirmar</ThemedText>}
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
  headerActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 12 },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 10 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', elevation: 2 },
  addressTitle: { fontWeight: 'bold', fontSize: 16 },
  residentName: { color: '#666', fontSize: 14, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 5, marginTop: 5 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  actionColumn: { justifyContent: 'space-between', alignItems: 'flex-end', minWidth: 80 },
  mainActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  adminActions: { flexDirection: 'row', gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '100%', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '90%' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8, fontSize: 16, marginBottom: 10 },
  pickerFake: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 10 },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 25, alignItems: 'center' },
  saveBtn: { padding: 10, borderRadius: 8, minWidth: 100, alignItems: 'center', justifyContent: 'center' }
});