import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  InteractionManager
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

// Corrected relative path to reach src/api/axios
import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * 🛡️ TYPE DEFINITIONS
 */
interface Fee {
  id: number;
  name: string;
  amount_occupied: string;
  amount_empty: string;
  amount_land: string;
  description: string | null;
  deleted_at: string | null;
}

// Construct the endpoint using the dynamic API_BASE
const ENDPOINT = `${API_BASE}/fees`;

/**
 * FeesScreen Component
 * Manages the catalog of community contribution types.
 */
export default function FeesScreen() {
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // --- MODAL STATES ---
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- FORM STATES ---
  const [feeName, setFeeName] = useState<string>('');
  const [amountOccupied, setAmountOccupied] = useState<string>('');
  const [amountEmpty, setAmountEmpty] = useState<string>('');
  const [amountLand, setAmountLand] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [deactivationReason, setDeactivationReason] = useState<string>(''); 

  /**
   * FOCUS LOAD: Refreshes catalog every time the screen is focused.
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setUser(JSON.parse(jsonValue));
          await fetchFees();
        } catch (e) {
          console.error("Initialization Error:", e);
        } finally {
          setIsReady(true);
        }
      };
      initialize();

      return () => {
        // Optional cleanup
      };
    }, [])
  );

  const { can } = usePermission(user);
  // Keep original permission keys for backend compatibility
  const canCreate = can('Crear-cuotas');
  const canEdit = can('Editar-cuotas');
  const canDeactivate = can('Eliminar-cuotas');

  /**
   * Data fetching logic.
   */
  const fetchFees = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setFees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFees = fees.filter((f) => 
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // --- HANDLERS ---

  const openEditModal = (fee: Fee | null = null) => {
    setEditingFee(fee);
    setFeeName(fee ? fee.name : '');
    setAmountOccupied(fee ? fee.amount_occupied.toString() : '');
    setAmountEmpty(fee ? fee.amount_empty.toString() : '');
    setAmountLand(fee ? fee.amount_land.toString() : '');
    setDescription(fee?.description || '');
    setModalVisible(true);
  };

  const openDeleteModal = (fee: Fee) => {
    setFeeToDelete(fee);
    setDeactivationReason('');
    setDeleteModalVisible(true);
  };

  /**
   * Logic for deactivating a concept.
   */
  const handleDeactivation = async () => {
    if (!deactivationReason.trim()) {
      Toast.show({ type: 'info', text1: 'Atención', text2: 'Debes especificar un motivo.' });
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${feeToDelete?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });

      setDeleteModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Estado actualizado correctamente.' });
        fetchFees();
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al actualizar estado.";
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles Save and Update operations.
   */
  const handleSave = async () => {
    if (!feeName.trim() || !amountOccupied || !amountEmpty || !amountLand) {
      Toast.show({ type: 'info', text1: 'Atención', text2: 'Por favor completa los campos obligatorios.' });
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      const payload = {
        name: feeName,
        amount_occupied: amountOccupied,
        amount_empty: amountEmpty,
        amount_land: amountLand,
        description: description
      };

      let successMsg = "";
      if (editingFee) {
        await axios.put(`${ENDPOINT}/${editingFee.id}`, payload, config);
        successMsg = "Información actualizada correctamente.";
      } else {
        await axios.post(ENDPOINT, payload, config);
        successMsg = "Concepto registrado exitosamente.";
      }

      setModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Toast.show({ type: 'success', text1: 'Éxito', text2: successMsg });
        fetchFees();
      });

    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al guardar el registro.";
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar concepto..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.addButton} onPress={() => openEditModal()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredFees}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, item.deleted_at && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                <View style={[styles.badge, { backgroundColor: item.deleted_at ? '#ff4444' : '#28a745' }]}>
                  <ThemedText style={styles.badgeText}>{item.deleted_at ? 'Inactivo' : 'Activo'}</ThemedText>
                </View>
              </View>
              
              <View style={styles.actionRow}>
                {canEdit && (
                  <TouchableOpacity onPress={() => openEditModal(item)} disabled={!!item.deleted_at}>
                    <IconSymbol name="pencil" size={22} color={item.deleted_at ? "#ccc" : "#007AFF"} />
                  </TouchableOpacity>
                )}

                {canDeactivate && (
                  <TouchableOpacity onPress={() => openDeleteModal(item)} disabled={!!item.deleted_at}>
                    <IconSymbol name="trash" size={22} color={item.deleted_at ? "#ccc" : "#ff4444"} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* --- MODAL: CREATE / EDIT --- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.modalContent}>
                <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                    {editingFee ? 'Editar Concepto' : 'Nuevo Concepto'}
                </ThemedText>

                <TextInput 
                  style={styles.modalInput}
                  value={feeName}
                  onChangeText={setFeeName}
                  placeholder="Nombre del concepto"
                  placeholderTextColor="#aaa"
                />

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 5}}>
                        <ThemedText style={styles.labelSmall}>Tipo A $</ThemedText>
                        <TextInput 
                            style={styles.modalInputSmall}
                            value={amountOccupied}
                            onChangeText={setAmountOccupied}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                    <View style={{flex: 1, marginHorizontal: 5}}>
                        <ThemedText style={styles.labelSmall}>Tipo B $</ThemedText>
                        <TextInput 
                            style={styles.modalInputSmall}
                            value={amountEmpty}
                            onChangeText={setAmountEmpty}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                    <View style={{flex: 1, marginLeft: 5}}>
                        <ThemedText style={styles.labelSmall}>Tipo C $</ThemedText>
                        <TextInput 
                            style={styles.modalInputSmall}
                            value={amountLand}
                            onChangeText={setAmountLand}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                </View>

                <TextInput 
                  style={[styles.modalInput, { marginTop: 15 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descripción informativa..."
                  placeholderTextColor="#aaa"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} disabled={isSaving}>
                    <ThemedText style={styles.cancelLabel}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL: DEACTIVATION --- */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.modalContent}>
                <View style={styles.deleteHeader}>
                  <ThemedText style={styles.deleteTitle}>Confirmar Cambio</ThemedText>
                </View>
                
                <ThemedText style={styles.deleteText}>
                  ¿Desea desactivar el concepto "{feeToDelete?.name}"?
                </ThemedText>

                <View style={{ marginTop: 15 }}>
                  <ThemedText style={styles.labelSmall}>Justificación *</ThemedText>
                  <TextInput 
                    style={[styles.modalInput, { borderBottomColor: '#ff4444' }]}
                    value={deactivationReason}
                    onChangeText={setDeactivationReason}
                    placeholder="Escriba el motivo del cambio..."
                    placeholderTextColor="#aaa"
                    multiline
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setDeleteModalVisible(false)} disabled={isSaving}>
                    <ThemedText style={styles.cancelLabel}>Regresar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: '#ff4444' }, isSaving && { opacity: 0.7 }]} 
                    onPress={handleDeactivation}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <ThemedText style={styles.saveBtnText}>Confirmar</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 12, color: '#333' },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 10, justifyContent: 'center' },
  itemRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginTop: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#007AFF', marginBottom: 15, fontSize: 16, paddingVertical: 8, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  labelSmall: { fontSize: 12, color: '#666' },
  modalInputSmall: { borderBottomWidth: 1, borderBottomColor: '#007AFF', fontSize: 16, paddingVertical: 5, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 25, marginTop: 30 },
  cancelLabel: { color: '#666', fontWeight: '500' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 120, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  deleteHeader: { borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 15, paddingBottom: 10 },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold' },
  deleteText: { fontSize: 14, color: '#444' }
});