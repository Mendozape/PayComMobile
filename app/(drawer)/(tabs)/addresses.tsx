import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, TextInput, 
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView, 
  Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

const API_BASE = 'http://192.168.1.16:8000/api';

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  // --- UI STATES ---
  const [modalVisible, setModalVisible] = useState(false);
  const [viewState, setViewState] = useState<'FORM' | 'STREET_PICKER' | 'USER_PICKER' | 'TYPE_PICKER' | 'STATUS_PICKER'>('FORM');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // --- FORM STATE ---
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
    } catch (e) { console.error("Fetch Error:", e); }
  };

  const fetchStreets = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/streets`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } 
      });
      setStreets((res.data.data || res.data).filter((s: any) => !s.deleted_at));
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/usuarios`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } 
      });
      setUsers(res.data.data || res.data);
    } catch (e) { console.error(e); }
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
    if (!streetId || !streetNumber || !residentId || (type === 'CASA' && !status)) {
      return Alert.alert("Error", "Faltan campos obligatorios.");
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { 
        street_id: streetId, 
        street_number: streetNumber, 
        user_id: residentId, 
        type, 
        status: type === 'CASA' ? status : 'Deshabitada', 
        months_overdue: parseInt(monthsOverdue) || 0,
        comments,
        community: 'PRADOS DE LA HUERTA' 
      };

      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

      if (editingId) {
        await axios.put(`${API_BASE}/addresses/${editingId}`, payload, config);
      } else {
        await axios.post(`${API_BASE}/addresses`, payload, config);
      }
      setModalVisible(false);
      fetchAddresses();
      Alert.alert("Éxito", "Predio guardado correctamente.");
    } catch (error: any) {
      Alert.alert("Fallo", error.response?.data?.message || "Error al guardar.");
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (deactivationReason.trim().length < 5) {
      return Alert.alert("Error", "Especifique un motivo válido.");
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE}/addresses/${editingId}`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        data: { reason: deactivationReason }
      });
      setDeleteModalVisible(false);
      fetchAddresses();
      Alert.alert("Éxito", "Predio eliminado.");
    } catch (e: any) {
      Alert.alert("Error", "No se pudo eliminar el predio.");
    } finally { setIsSaving(false); }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput style={styles.searchInput} placeholder="Buscar predio..." onChangeText={setSearch} />
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
              <ThemedText style={styles.residentName}>👤 {item.user?.name || 'Sin residente'}</ThemedText>
              {item.deleted_at && <ThemedText style={styles.deletedText}>ELIMINADO</ThemedText>}
            </View>
            <View style={styles.actionColumn}>
              {!item.deleted_at && (
                <>
                  {can('Editar-predios') && (
                    <TouchableOpacity onPress={() => openForm(item)}><IconSymbol name="pencil" size={20} color="#007bff" /></TouchableOpacity>
                  )}
                  {can('Eliminar-predios') && (
                    <TouchableOpacity onPress={() => { setEditingId(item.id); setDeactivationReason(''); setDeleteModalVisible(true); }}><IconSymbol name="trash" size={20} color="#ff4444" /></TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      />

      {/* FORM MODAL (SINGLE LAYER ARCHITECTURE) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              
              {/* VIEWS SWITCHER FOR PICKERS */}
              {viewState === 'STREET_PICKER' ? (
                <View style={{height: 400}}>
                    <ThemedText type="subtitle">Seleccionar Calle</ThemedText>
                    <FlatList data={streets} keyExtractor={(s)=>`st-${s.id}`} renderItem={({item}) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => { setStreetId(item.id); setStreetName(item.name); setViewState('FORM'); }}>
                            <ThemedText>{item.name}</ThemedText>
                        </TouchableOpacity>
                    )} />
                </View>
              ) : viewState === 'USER_PICKER' ? (
                <View style={{height: 400}}>
                    <ThemedText type="subtitle">Asignar Residente</ThemedText>
                    <FlatList data={users} keyExtractor={(u)=>`us-${u.id}`} renderItem={({item}) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => { setResidentId(item.id); setResidentName(item.name); setViewState('FORM'); }}>
                            <ThemedText>{item.name}</ThemedText>
                        </TouchableOpacity>
                    )} />
                </View>
              ) : viewState === 'TYPE_PICKER' ? (
                <View>
                    <ThemedText type="subtitle">Tipo de Predio</ThemedText>
                    {['CASA', 'TERRENO'].map(t => (
                        <TouchableOpacity key={t} style={styles.pickerItem} onPress={() => { setType(t); setViewState('FORM'); }}>
                            <ThemedText>{t}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
              ) : viewState === 'STATUS_PICKER' ? (
                <View>
                    <ThemedText type="subtitle">Estado de Ocupación</ThemedText>
                    {['Habitada', 'Deshabitada'].map(s => (
                        <TouchableOpacity key={s} style={styles.pickerItem} onPress={() => { setStatus(s); setViewState('FORM'); }}>
                            <ThemedText>{s}</ThemedText>
                        </TouchableOpacity>
                    ))}
                </View>
              ) : (
                /* MAIN FORM VIEW */
                <View>
                  <ThemedText type="subtitle">Datos del Predio</ThemedText>
                  
                  <ThemedText style={styles.label}>Calle *</ThemedText>
                  <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('STREET_PICKER')}>
                    <ThemedText>{streetName}</ThemedText>
                    <IconSymbol name="chevron.down" size={16} color="#888" />
                  </TouchableOpacity>

                  <ThemedText style={styles.label}>Número *</ThemedText>
                  <TextInput style={styles.input} value={streetNumber} onChangeText={setStreetNumber} placeholder="Número" keyboardType="numeric" />

                  <ThemedText style={styles.label}>Residente *</ThemedText>
                  <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('USER_PICKER')}>
                    <ThemedText>{residentName}</ThemedText>
                    <IconSymbol name="chevron.down" size={16} color="#888" />
                  </TouchableOpacity>

                  <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={{flex: 1}}>
                      <ThemedText style={styles.label}>Tipo *</ThemedText>
                      <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('TYPE_PICKER')}>
                        <ThemedText>{type}</ThemedText>
                      </TouchableOpacity>
                    </View>
                    {type === 'CASA' && (
                      <View style={{flex: 1}}>
                        <ThemedText style={styles.label}>Estado *</ThemedText>
                        <TouchableOpacity style={styles.pickerFake} onPress={() => setViewState('STATUS_PICKER')}>
                          <ThemedText>{status}</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <ThemedText style={styles.label}>Meses Atrasados *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={monthsOverdue} 
                    onChangeText={setMonthsOverdue} 
                    keyboardType="numeric"
                    placeholder="0"
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.deleteTitle}>¿Eliminar Predio?</ThemedText>
            <ThemedText style={{marginVertical: 10}}>Especifique el motivo de la baja:</ThemedText>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder="Motivo..." 
              multiline 
              value={deactivationReason}
              onChangeText={setDeactivationReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: '#ff4444'}]} onPress={handleDelete} disabled={isSaving}>
                 <ThemedText style={{color:'white', fontWeight: 'bold'}}>Eliminar</ThemedText>
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
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  addressTitle: { fontWeight: 'bold', fontSize: 16 },
  residentName: { color: '#666', fontSize: 14, marginTop: 4 },
  deletedText: { color: '#ff4444', fontWeight: 'bold', fontSize: 12, marginTop: 4 },
  actionColumn: { justifyContent: 'center', gap: 15, alignItems: 'flex-end' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '100%', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '90%' },
  label: { fontSize: 12, fontWeight: 'bold', marginTop: 10, color: '#444' },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8, fontSize: 16 },
  pickerFake: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 25 },
  saveBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  deleteTitle: { fontWeight:'bold', fontSize: 18, color: '#ff4444' }
});