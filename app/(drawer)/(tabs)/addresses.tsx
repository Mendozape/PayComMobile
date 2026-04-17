import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, TextInput, 
  ActivityIndicator, Modal, KeyboardAvoidingView, 
  Platform, InteractionManager 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view'; 
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

// Corrected relative path to reach src/api/axios from app/(drawer)/
import { API_BASE } from '../../../src/api/axios'; 

/**
 * AddressesScreen Component
 * Manages the housing units (addresses) within the community.
 */
export default function AddressesScreen() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  // Modal and view states
  const [modalVisible, setModalVisible] = useState(false);
  const [viewState, setViewState] = useState<'FORM' | 'STREET_PICKER' | 'USER_PICKER' | 'TYPE_PICKER' | 'STATUS_PICKER'>('FORM');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Form states
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

  // ⚠️ Inline validation error state
  const [errors, setErrors] = useState<any>({});

  /**
   * 🛡️ FOCUS LOAD: Re-fetches all data every time the user navigates to this screen.
   */
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        try {
          const data = await AsyncStorage.getItem('userData');
          if (data) setUser(JSON.parse(data));
          await Promise.all([fetchAddresses(), fetchStreets(), fetchUsers()]);
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load data.' });
        } finally {
          setLoading(false);
        }
      };
      init();
    }, [])
  );

  const { can } = usePermission(user);

  /**
   * API Fetching logic
   */
  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const res = await axios.get(`${API_BASE}/addresses?t=${t}`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } 
      });
      setAddresses(res.data.data || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStreets = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/streets`, { headers: { Authorization: `Bearer ${token}` } });
      setStreets((res.data.data || res.data).filter((s: any) => !s.deleted_at));
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/usuarios`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data.data || res.data);
    } catch (e) { console.error(e); }
  };

  const openForm = (item: any = null) => {
    setErrors({});
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

  /**
   * Validation logic
   */
  const validate = () => {
    let _errors: any = {};
    if (!streetId) _errors.street = "Debes seleccionar una calle.";
    if (!streetNumber.trim()) _errors.number = "El número exterior es obligatorio.";
    if (!residentId) _errors.resident = "Debes asignar un residente.";
    setErrors(_errors);
    return Object.keys(_errors).length === 0;
  };

  /**
   * Save or Update address information
   */
  const handleSave = async () => {
    if (!validate()) return;
    
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
      
      if (editingId) {
        await axios.put(`${API_BASE}/addresses/${editingId}`, payload, config);
        Toast.show({ type: 'success', text1: 'Actualizado correctamente' });
      } else {
        await axios.post(`${API_BASE}/addresses`, payload, config);
        Toast.show({ type: 'success', text1: 'Registrado correctamente' });
      }

      setModalVisible(false);
      fetchAddresses();
    } catch (error: any) { 
        setErrors({ server: error.response?.data?.message || "Fallo al procesar." });
    } finally { setIsSaving(false); }
  };

  /**
   * Logic for soft deleting (deactivating)
   */
  const handleDelete = async () => {
    if (deactivationReason.trim().length < 5) {
      setErrors({ delete: "Motivo inválido (mín. 5 caracteres)." });
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE}/addresses/${editingId}`, { 
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        data: { reason: deactivationReason }
      });
      setDeleteModalVisible(false);
      Toast.show({ type: 'success', text1: 'Baja confirmada' });
      fetchAddresses();
    } catch (e: any) { 
        setErrors({ delete: e.response?.data?.message || "Error al dar de baja." });
    } finally { setIsSaving(false); }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput style={styles.searchInput} placeholder="Buscar predio..." placeholderTextColor="#888" onChangeText={setSearch} />
        {can('Crear-predios') && (
          <TouchableOpacity style={styles.addButton} onPress={() => openForm()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={addresses.filter(a => a.street?.name?.toLowerCase().includes(search.toLowerCase()) || a.user?.name?.toLowerCase().includes(search.toLowerCase()))}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, item.deleted_at && { opacity: 0.6 }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.addressTitle}>{item.street?.name} #{item.street_number}</ThemedText>
                <ThemedText style={styles.residentName}>👤 {item.user?.name || 'Vacante'}</ThemedText>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, {backgroundColor: '#6c757d'}]}><ThemedText style={styles.badgeText}>{item.type}</ThemedText></View>
                  {item.type === 'CASA' && (
                    <View style={[styles.badge, {backgroundColor: item.status === 'Habitada' ? '#007bff' : '#f0ad4e'}]}><ThemedText style={styles.badgeText}>{item.status}</ThemedText></View>
                  )}
                  {item.deleted_at && <View style={[styles.badge, {backgroundColor: '#ff4444'}]}><ThemedText style={styles.badgeText}>Inactivo</ThemedText></View>}
                </View>
              </View>
              
              <View style={styles.actionColumn}>
                <View style={styles.adminActions}>
                  {can('Editar-predios') && !item.deleted_at && (
                    <TouchableOpacity onPress={() => openForm(item)}><IconSymbol name="pencil" size={18} color="#007AFF" /></TouchableOpacity>
                  )}
                  {can('Eliminar-predios') && !item.deleted_at && (
                    <TouchableOpacity onPress={() => { setEditingId(item.id); setDeactivationReason(''); setErrors({}); setDeleteModalVisible(true); }}><IconSymbol name="trash" size={18} color="#ff4444" /></TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Main Form Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {viewState !== 'FORM' ? (
                <View style={{height: 400}}>
                    <ThemedText style={styles.modalLabelTitle}>Selecciona una opción</ThemedText>
                    <FlatList 
                      data={viewState === 'STREET_PICKER' ? streets : viewState === 'USER_PICKER' ? users : viewState === 'TYPE_PICKER' ? [{id:'CASA', name:'CASA'}, {id:'TERRENO', name:'TERRENO'}] : [{id:'Habitada', name:'Habitada'}, {id:'Deshabitada', name:'Deshabitada'}]} 
                      renderItem={({item}) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => {
                           if(viewState==='STREET_PICKER') {setStreetId(item.id); setStreetName(item.name);}
                           if(viewState==='USER_PICKER') {setResidentId(item.id); setResidentName(item.name);}
                           if(viewState==='TYPE_PICKER') setType(item.id);
                           if(viewState==='STATUS_PICKER') setStatus(item.id);
                           setViewState('FORM');
                           setErrors({...errors, [viewState === 'STREET_PICKER' ? 'street' : 'resident']: null});
                        }}><ThemedText>{item.name}</ThemedText></TouchableOpacity>
                    )} />
                </View>
              ) : (
                <View>
                  <ThemedText type="subtitle">Información del Predio</ThemedText>
                  
                  <TouchableOpacity style={[styles.pickerFake, errors.street && styles.inputError]} onPress={() => setViewState('STREET_PICKER')}>
                    <ThemedText style={errors.street ? {color: '#ff4444'} : {}}>{streetName}</ThemedText>
                  </TouchableOpacity>
                  {errors.street && <ThemedText style={styles.errorText}>{errors.street}</ThemedText>}

                  <TextInput style={[styles.input, errors.number && styles.inputError]} value={streetNumber} onChangeText={(v) => {setStreetNumber(v); if(errors.number) setErrors({...errors, number:null});}} placeholder="Número exterior" keyboardType="numeric" placeholderTextColor="#888" />
                  {errors.number && <ThemedText style={styles.errorText}>{errors.number}</ThemedText>}

                  <TouchableOpacity style={[styles.pickerFake, errors.resident && styles.inputError]} onPress={() => setViewState('USER_PICKER')}>
                    <ThemedText style={errors.resident ? {color: '#ff4444'} : {}}>{residentName}</ThemedText>
                  </TouchableOpacity>
                  {errors.resident && <ThemedText style={styles.errorText}>{errors.resident}</ThemedText>}

                  <View style={{flexDirection:'row', gap:10}}>
                    <TouchableOpacity style={[styles.pickerFake, {flex:1}]} onPress={() => setViewState('TYPE_PICKER')}><ThemedText>{type}</ThemedText></TouchableOpacity>
                    {type==='CASA' && <TouchableOpacity style={[styles.pickerFake, {flex:1}]} onPress={() => setViewState('STATUS_PICKER')}><ThemedText>{status}</ThemedText></TouchableOpacity>}
                  </View>

                  <TextInput style={styles.input} value={monthsOverdue} onChangeText={setMonthsOverdue} keyboardType="numeric" placeholder="Meses de retraso inicial" placeholderTextColor="#888" />
                  
                  {errors.server && <ThemedText style={styles.serverError}>{errors.server}</ThemedText>}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
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

      {/* Delete Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={{color:'#ff4444', fontWeight:'bold', fontSize:18}}>Dar de Baja</ThemedText>
            <TextInput style={[styles.input, {height: 80, marginTop:15}, errors.delete && styles.inputError]} placeholder="Motivo de la baja..." multiline value={deactivationReason} onChangeText={setDeactivationReason} placeholderTextColor="#888" />
            {errors.delete && <ThemedText style={styles.errorText}>{errors.delete}</ThemedText>}
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><ThemedText>Regresar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, {backgroundColor: isSaving ? '#666' : '#ff4444'}]} onPress={handleDelete} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{color:'white', fontWeight: 'bold'}}>Dar de Baja</ThemedText>}
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
  searchInput: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 12, color: '#333' },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 10, justifyContent: 'center' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', elevation: 2 },
  addressTitle: { fontWeight: 'bold', fontSize: 16 },
  residentName: { color: '#666', fontSize: 14, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 5, marginTop: 5 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  actionColumn: { justifyContent: 'center', alignItems: 'flex-end', minWidth: 40 },
  adminActions: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '100%', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '90%' },
  modalLabelTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  input: { borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 8, fontSize: 16, marginBottom: 5, color: '#333' },
  pickerFake: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 5 },
  pickerItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 25 },
  saveBtn: { padding: 10, borderRadius: 8, minWidth: 110, alignItems: 'center' },
  inputError: { borderBottomColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 12, marginBottom: 10 },
  serverError: { color: '#ff4444', textAlign: 'center', fontWeight: 'bold', marginVertical: 10 }
});