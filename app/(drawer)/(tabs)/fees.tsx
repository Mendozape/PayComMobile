import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const ENDPOINT = 'http://192.168.1.16:8000/api/fees';

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
   * 🛡️ INITIAL LOAD
   */
  useEffect(() => {
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
  }, []);

  const { can } = usePermission(user);
  const canCreate = can('Crear-cuotas');
  const canEdit = can('Editar-cuotas');
  const canDeactivate = can('Eliminar-cuotas');

  const fetchFees = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ENDPOINT, {
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

  const handleDeactivation = async () => {
    if (!deactivationReason.trim()) {
      Alert.alert("Error", "Debes especificar un motivo de la baja.");
      return;
    }

    setIsSaving(true); // Bloquea botones y activa relojito
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${feeToDelete?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });

      setDeleteModalVisible(false);
      Alert.alert("Éxito", "Tarifa dada de baja exitosamente.");
      fetchFees();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Fallo al dar de baja la tarifa.";
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false); // Libera botones
    }
  };

  const handleSave = async () => {
    if (!feeName.trim() || !amountOccupied || !amountEmpty || !amountLand) {
      Alert.alert("Error", "Faltan datos obligatorios.");
      return;
    }
    setIsSaving(true); // Bloquea botones y activa relojito
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

      if (editingFee) {
        await axios.put(`${ENDPOINT}/${editingFee.id}`, payload, config);
      } else {
        await axios.post(ENDPOINT, payload, config);
      }
      setModalVisible(false);
      fetchFees();
    } catch (error) {
      Alert.alert("Error", "Error al guardar la cuota.");
    } finally {
      setIsSaving(false); // Libera botones
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar cuota..."
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
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                <View style={[styles.badge, { backgroundColor: item.deleted_at ? '#ff4444' : '#28a745' }]}>
                  <ThemedText style={styles.badgeText}>{item.deleted_at ? 'Inactiva' : 'Activa'}</ThemedText>
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
                    {editingFee ? 'Editar' : 'Nueva'} Cuota
                </ThemedText>

                <TextInput 
                  style={styles.modalInput}
                  value={feeName}
                  onChangeText={setFeeName}
                  placeholder="Nombre"
                  placeholderTextColor="#aaa"
                />

                <View style={styles.row}>
                    <View style={{flex: 1, marginRight: 5}}>
                        <ThemedText style={styles.labelSmall}>Habitada $</ThemedText>
                        <TextInput 
                            style={styles.modalInputSmall}
                            value={amountOccupied}
                            onChangeText={setAmountOccupied}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                    <View style={{flex: 1, marginHorizontal: 5}}>
                        <ThemedText style={styles.labelSmall}>Vacía $</ThemedText>
                        <TextInput 
                            style={styles.modalInputSmall}
                            value={amountEmpty}
                            onChangeText={setAmountEmpty}
                            keyboardType="numeric"
                            placeholder="0.00"
                        />
                    </View>
                    <View style={{flex: 1, marginLeft: 5}}>
                        <ThemedText style={styles.labelSmall}>Terreno $</ThemedText>
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
                  placeholder="Descripción"
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

      {/* --- MODAL: DEACTIVATION (REASON) --- */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <View style={styles.modalContent}>
                <View style={styles.deleteHeader}>
                  <ThemedText style={styles.deleteTitle}>Confirmar Baja</ThemedText>
                </View>
                
                <ThemedText style={styles.deleteText}>
                  ¿Está seguro de dar de baja la cuota {feeToDelete?.name}?
                </ThemedText>

                <View style={{ marginTop: 15 }}>
                  <ThemedText style={styles.labelSmall}>Motivo de la Baja *</ThemedText>
                  <TextInput 
                    style={[styles.modalInput, { borderBottomColor: '#ff4444' }]}
                    value={deactivationReason}
                    onChangeText={setDeactivationReason}
                    placeholder="Ej: Ya no es vigente..."
                    multiline
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setDeleteModalVisible(false)} disabled={isSaving}>
                    <ThemedText style={styles.cancelLabel}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: '#ff4444' }, isSaving && { opacity: 0.7 }]} 
                    onPress={handleDeactivation}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <ThemedText style={styles.saveBtnText}>Confirmar Baja</ThemedText>
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