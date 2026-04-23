import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, TextInput, 
  ActivityIndicator, Platform, Modal, ScrollView, Alert,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view'; 
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

import { API_BASE } from '../../../src/api/axios'; 

export default function AddressesScreen() {
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<any[]>([]);
  const [filteredAddresses, setFilteredAddresses] = useState<any[]>([]);
  const [streets, setStreets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState<any>(null);

  // --- MODAL & FORM STATES ---
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null); // null = Modo Crear
  const [activePicker, setActivePicker] = useState<'none' | 'street' | 'type' | 'status'>('none');

  // Autocomplete de Usuarios
  const [userQuery, setUserQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const [formData, setFormData] = useState({
    street_id: '',
    street_label: 'Seleccionar...',
    street_number: '',
    type: '', 
    status: '',
    community: 'PRADOS DE LA HUERTA',
    user_id: null as number | null,
    months_overdue: '0',
    comments: '',
  });

  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [addressToDeactivate, setAddressToDeactivate] = useState<string | null>(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { can } = usePermission(user);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        setLoading(true);
        try {
          const data = await AsyncStorage.getItem('userData');
          if (data) setUser(JSON.parse(data));
          await Promise.all([fetchAddresses(), fetchStreets()]);
        } finally {
          setLoading(false);
        }
      };
      init();
    }, [])
  );

  // Lógica Autocomplete Usuarios
  useEffect(() => {
    if (!userQuery.trim() || formData.user_id) {
      setUserSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingUser(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        const res = await axios.get(`${API_BASE}/usuarios?search=${userQuery.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.data || res.data;
        setUserSuggestions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingUser(false);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [userQuery, formData.user_id]);

  const fetchAddresses = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/addresses?t=${Date.now()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setAddresses(Array.isArray(res.data.data) ? res.data.data : res.data);
    } catch (e) { console.error(e); }
  };

  const fetchStreets = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await axios.get(`${API_BASE}/streets`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = res.data.data || res.data;
      setStreets(data.filter((s: any) => !s.deleted_at));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const result = addresses.filter(addr => {
      const streetName = addr.street?.name || '';
      const combined = `${streetName} ${addr.street_number} ${addr.type} ${addr.status} ${addr.user?.name || ''}`.toLowerCase();
      return combined.includes(lowerSearch);
    });
    setFilteredAddresses(result);
  }, [search, addresses]);

  // --- ACTIONS ---
  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      street_id: '',
      street_label: 'Seleccionar...',
      street_number: '',
      type: 'CASA',
      status: 'Habitada',
      community: 'PRADOS DE LA HUERTA',
      user_id: null,
      months_overdue: '0',
      comments: '',
    });
    setUserQuery('');
    setActivePicker('none');
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      street_id: item.street_id?.toString() || '',
      street_label: item.street?.name || 'Seleccionar...',
      street_number: item.street_number.toString(),
      type: item.type || 'CASA',
      status: item.status || 'Habitada',
      community: 'PRADOS DE LA HUERTA',
      user_id: item.user_id || null,
      months_overdue: item.months_overdue?.toString() || '0',
      comments: item.comments || '',
    });
    setUserQuery(item.user?.name || '');
    setActivePicker('none');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const isStatusMissing = formData.type === 'CASA' && !formData.status;
    if (!formData.street_id || !formData.street_number || !formData.type || !formData.user_id || isStatusMissing) {
        Alert.alert("Atención", "Por favor, completa todos los campos obligatorios.");
        return;
    }
    
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        ...formData,
        months_overdue: parseInt(formData.months_overdue) || 0,
        status: formData.type === 'CASA' ? formData.status : 'Deshabitada'
      };

      if (editingItem) {
        await axios.put(`${API_BASE}/addresses/${editingItem.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE}/addresses`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setModalVisible(false);
      setTimeout(() => {
        Toast.show({ 
            type: 'success', 
            text1: editingItem ? 'Actualizado' : 'Registrado', 
            text2: `Predio ${editingItem ? 'actualizado' : 'creado'} correctamente`, 
            position: 'bottom' 
        });
        fetchAddresses();
      }, 200);
    } catch (e: any) {
      setModalVisible(false);
      const errorMsg = e.response?.data?.message || 'Fallo al procesar la solicitud.';
      setTimeout(() => {
        Toast.show({ type: 'error', text1: 'Error', text2: errorMsg, position: 'bottom' });
      }, 200);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePay = (id: string) => router.push(`/(drawer)/(tabs)/create-payment?addressId=${id}`);
  const handleHistory = (id: string) => router.push(`/(drawer)/(tabs)/payment-history?addressId=${id}`);

  const confirmDeactivation = (id: string) => {
    setAddressToDeactivate(id);
    setDeactivationReason('');
    setDeactivateModalVisible(true);
  };

  const handleDeactivation = async () => {
    if (!deactivationReason.trim()) return;
    setIsProcessing(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${API_BASE}/addresses/${addressToDeactivate}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });
      setDeactivateModalVisible(false);
      setTimeout(() => {
        Toast.show({ type: 'success', text1: 'Baja exitosa', position: 'bottom' });
        fetchAddresses();
      }, 150);
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput style={styles.searchInput} placeholder="Buscar..." placeholderTextColor="#888" onChangeText={setSearch} value={search} />
        </View>
        {can('Crear-predios') && (
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredAddresses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.card, item.deleted_at && { opacity: 0.5 }]}>
              <View style={styles.infoColumn}>
                <ThemedText style={styles.addressTitle}>{item.street?.name} #{item.street_number}</ThemedText>
                <View style={styles.tagRow}>
                   <View style={styles.typeBadge}><ThemedText style={styles.typeText}>{item.type}</ThemedText></View>
                   <View style={[styles.statusBadge, { backgroundColor: item.status === 'Habitada' ? '#e3f2fd' : '#fff3e0' }]}><ThemedText style={[styles.statusText, { color: item.status === 'Habitada' ? '#1976d2' : '#f57c00' }]}>{item.status}</ThemedText></View>
                </View>
                <ThemedText style={styles.residentName}>{item.user?.name || 'Vacante'}</ThemedText>
              </View>
              <View style={styles.actionColumn}>
                {!item.deleted_at && (
                  <View style={styles.mainButtons}>
                    <TouchableOpacity style={[styles.btn, styles.payBtn]} onPress={() => handlePay(item.id)}><ThemedText style={styles.btnText}>Pagar</ThemedText></TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.historyBtn]} onPress={() => handleHistory(item.id)}><ThemedText style={styles.btnText}>Historial</ThemedText></TouchableOpacity>
                  </View>
                )}
                <View style={styles.adminActions}>
                  {can('Editar-predios') && !item.deleted_at && (<TouchableOpacity style={styles.adminIconBtn} onPress={() => openEditModal(item)}><IconSymbol name="pencil" size={20} color="#007AFF" /></TouchableOpacity>)}
                  {can('Eliminar-predios') && !item.deleted_at && (<TouchableOpacity style={styles.adminIconBtn} onPress={() => confirmDeactivation(item.id)}><IconSymbol name="trash" size={20} color="#ff4444" /></TouchableOpacity>)}
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* --- MODAL UNIFICADO (CREAR/EDITAR) --- */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>{editingItem ? 'Editar Predio' : 'Nuevo Predio'}</ThemedText>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                
                {/* AUTOCOMPLETE USUARIO */}
                <ThemedText style={styles.fieldLabel}>USUARIO / RESIDENTE *</ThemedText>
                <View style={styles.autocompleteContainer}>
                    <TextInput 
                        style={styles.fieldInputStatic} 
                        placeholder="Escriba para buscar residente..."
                        placeholderTextColor="#aaa"
                        value={userQuery}
                        onChangeText={(v) => { setUserQuery(v); setFormData({...formData, user_id: null}); }}
                    />
                    {isSearchingUser && <ActivityIndicator size="small" style={styles.loaderInside} color="#28a745" />}
                    {userSuggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                            {userSuggestions.map(u => (
                                <TouchableOpacity key={u.id} style={styles.suggestionItem} onPress={() => { setFormData({...formData, user_id: u.id}); setUserQuery(u.name); setUserSuggestions([]); Keyboard.dismiss(); }}>
                                    <ThemedText style={{fontSize: 13, fontWeight: '500'}}>{u.name}</ThemedText>
                                    <ThemedText style={{fontSize: 11, color: '#888'}}>{u.email}</ThemedText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* CALLE (SELECTOR) */}
                <TouchableOpacity style={styles.fieldBox} onPress={() => setActivePicker('street')}>
                  <ThemedText style={styles.fieldLabel}>CALLE *</ThemedText>
                  <ThemedText numberOfLines={1} style={styles.fieldValue}>{formData.street_label}</ThemedText>
                </TouchableOpacity>

                <View style={styles.row}>
                  {/* NÚMERO */}
                  <View style={[styles.fieldBox, { flex: 0.45, marginRight: 10 }]}>
                    <ThemedText style={styles.fieldLabel}>NÚMERO *</ThemedText>
                    <TextInput style={styles.fieldInput} value={formData.street_number} onChangeText={(v) => setFormData({...formData, street_number: v})} keyboardType="numeric" />
                  </View>
                  {/* TIPO */}
                  <TouchableOpacity style={[styles.fieldBox, { flex: 0.55 }]} onPress={() => setActivePicker('type')}>
                    <ThemedText style={styles.fieldLabel}>TIPO *</ThemedText>
                    <ThemedText style={styles.fieldValue}>{formData.type}</ThemedText>
                  </TouchableOpacity>
                </View>

                {/* MESES ATRASADOS */}
                <View style={styles.fieldBox}>
                    <ThemedText style={styles.fieldLabel}>MESES ATRASADOS (HISTÓRICO)</ThemedText>
                    <TextInput style={styles.fieldInput} value={formData.months_overdue} onChangeText={(v) => setFormData({...formData, months_overdue: v.replace(/[^0-9]/g, '')})} keyboardType="numeric" maxLength={3} />
                </View>

                {/* ESTATUS (SOLO SI ES CASA) */}
                {formData.type === 'CASA' && (
                  <TouchableOpacity style={[styles.fieldBox, { borderColor: '#007AFF' }]} onPress={() => setActivePicker('status')}>
                    <ThemedText style={[styles.fieldLabel, { color: '#007AFF' }]}>ESTADO DE OCUPACIÓN *</ThemedText>
                    <ThemedText style={styles.fieldValue}>{formData.status}</ThemedText>
                  </TouchableOpacity>
                )}

                {/* COMENTARIOS */}
                <View style={[styles.fieldBox, { height: 70 }]}>
                    <ThemedText style={styles.fieldLabel}>COMENTARIOS ADICIONALES</ThemedText>
                    <TextInput style={styles.fieldInput} value={formData.comments} onChangeText={(v) => setFormData({...formData, comments: v})} multiline placeholder="Notas internas..." />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{color:'white', fontWeight:'bold'}}>{editingItem ? 'Guardar' : 'Crear'}</ThemedText>}
                </TouchableOpacity>
              </View>

              {/* OVERLAYS DE SELECTORES */}
              {activePicker !== 'none' && (
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerHeader}>
                    <ThemedText style={styles.pickerHeaderText}>Seleccionar</ThemedText>
                    <TouchableOpacity onPress={() => setActivePicker('none')}><Ionicons name="close-circle" size={24} color="#666" /></TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 220 }}>
                    {activePicker === 'street' && streets.map((s:any) => (
                      <TouchableOpacity key={s.id} style={styles.modalItem} onPress={() => { setFormData({...formData, street_id: s.id, street_label: s.name}); setActivePicker('none'); }}>
                        <ThemedText>{s.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                    {activePicker === 'type' && ['CASA', 'TERRENO'].map(t => (
                      <TouchableOpacity key={t} style={styles.modalItem} onPress={() => { setFormData({...formData, type: t}); setActivePicker('none'); }}>
                        <ThemedText>{t}</ThemedText>
                      </TouchableOpacity>
                    ))}
                    {activePicker === 'status' && ['Habitada', 'Deshabitada'].map(s => (
                      <TouchableOpacity key={s} style={styles.modalItem} onPress={() => { setFormData({...formData, status: s}); setActivePicker('none'); }}>
                        <ThemedText>{s}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL BAJA */}
      <Modal visible={deactivateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={[styles.modalTitle, {color: '#c62828'}]}>Confirmar Baja</ThemedText>
            <TextInput style={[styles.fieldBox, {height: 80, textAlignVertical:'top', padding:10}]} multiline placeholder="Motivo..." placeholderTextColor="#888" value={deactivationReason} onChangeText={setDeactivationReason} />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeactivateModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleDeactivation} disabled={isProcessing}><ThemedText style={{color:'white'}}>Confirmar</ThemedText></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  headerBar: { padding: 15, flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, height: 45, borderWidth: 1, borderColor: '#e0e0e0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
  addButton: { backgroundColor: '#28a745', height: 45, width: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15, paddingBottom: 30 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#efefef', elevation: 2 },
  infoColumn: { flex: 1 },
  addressTitle: { fontWeight: '700', fontSize: 16, color: '#1a1a1a', marginBottom: 5 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, color: '#666', fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  residentName: { color: '#007AFF', fontSize: 13, fontWeight: '500' },
  actionColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  mainButtons: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  btn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, minWidth: 65, alignItems: 'center' },
  payBtn: { backgroundColor: '#28a745' },
  historyBtn: { backgroundColor: '#6c757d' },
  btnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  adminActions: { flexDirection: 'row', gap: 15 },
  adminIconBtn: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  keyboardView: { width: '100%', alignItems: 'center' },
  modalContent: { width: '100%', backgroundColor: 'white', borderRadius: 25, padding: 20, position: 'relative', overflow: 'hidden' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  row: { flexDirection: 'row', width: '100%' },
  fieldBox: { height: 50, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 12, justifyContent: 'center', marginBottom: 12 },
  fieldLabel: { fontSize: 9, color: '#888', fontWeight: 'bold', marginBottom: 1 },
  fieldValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  fieldInput: { fontSize: 14, color: '#333', fontWeight: '600', padding: 0 },
  fieldInputStatic: { height: 45, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 12, fontSize: 14, color: '#333', marginBottom: 5 },
  autocompleteContainer: { position: 'relative', marginBottom: 12, zIndex: 100 },
  loaderInside: { position: 'absolute', right: 10, top: 12 },
  suggestionsBox: { position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#ccc', elevation: 10, zIndex: 2000, maxHeight: 180, overflow: 'hidden' },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerOverlay: { position: 'absolute', top: 50, left: 10, right: 10, bottom: 10, backgroundColor: 'white', borderRadius: 15, zIndex: 3000, padding: 15, borderWidth: 1, borderColor: '#eee', elevation: 15 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  pickerHeaderText: { fontWeight: 'bold', color: '#007AFF' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 5 },
  cancelBtn: { padding: 12, borderRadius: 10, backgroundColor: '#f0f0f0', flex: 1, alignItems: 'center' },
  saveBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' },
  confirmBtn: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' }
});