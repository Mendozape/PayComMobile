import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  InteractionManager
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Corrected relative path to reach src/api/axios from app/(drawer)/
import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * 🛡️ TYPE DEFINITIONS
 */
interface Street {
  id: number;
  name: string;
  deleted_at: string | null;
}

// Construct the endpoint using the dynamic API_BASE
const ENDPOINT = `${API_BASE}/streets`;

export default function StreetsScreen() {
  const [streets, setStreets] = useState<Street[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // --- MODAL STATES ---
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  
  const [editingStreet, setEditingStreet] = useState<Street | null>(null);
  const [streetToDelete, setStreetToDelete] = useState<Street | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- FORM STATES ---
  const [streetName, setStreetName] = useState<string>('');
  const [deactivationReason, setDeactivationReason] = useState<string>('');

  /**
   * 🛡️ INITIAL LOAD: Load profile and street data on mount
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('userData');
        if (jsonValue) setUser(JSON.parse(jsonValue));
        await fetchStreets();
      } catch (e) {
        console.error("Initialization Error:", e);
      } finally {
        setIsReady(true);
      }
    };
    initialize();
  }, []);

  const { can } = usePermission(user);
  const canCreate = can('Crear-calles');
  const canEdit = can('Editar-calles');
  const canDeactivate = can('Eliminar-calles');

  /**
   * Fetches the street catalog from the dynamic API_BASE
   */
  const fetchStreets = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setStreets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Client-side search filtering
   */
  const filteredStreets = streets.filter((s) => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // --- HANDLERS ---

  const openEditModal = (street: Street | null = null) => {
    setEditingStreet(street);
    setStreetName(street ? street.name : '');
    setModalVisible(true);
  };

  const openDeleteModal = (street: Street) => {
    setStreetToDelete(street);
    setDeactivationReason('');
    setDeleteModalVisible(true);
  };

  /**
   * Logic for soft delete with a required reason
   */
  const handleDeactivation = async () => {
    if (!deactivationReason.trim()) {
      Alert.alert("Atención", "Debes especificar un motivo de la baja.");
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${streetToDelete?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });
      
      setDeleteModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Alert.alert("Éxito", "Calle dada de baja correctamente.");
        fetchStreets();
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al procesar la baja.";
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Logic for Create (POST) / Update (PUT)
   */
  const handleSave = async () => {
    if (!streetName.trim()) {
        Alert.alert("Atención", "El nombre de la calle es obligatorio.");
        return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      let successMsg = "";
      if (editingStreet) {
        // Dynamic PUT request
        await axios.put(`${ENDPOINT}/${editingStreet.id}`, { name: streetName }, config);
        successMsg = "Calle actualizada correctamente.";
      } else {
        // Dynamic POST request
        await axios.post(ENDPOINT, { name: streetName }, config);
        successMsg = "Calle creada exitosamente.";
      }

      setModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Alert.alert("Éxito", successMsg);
        fetchStreets();
      });

    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Error al guardar la calle.");
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
          placeholder="Buscar calle..."
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
          data={filteredStreets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.streetItem, item.deleted_at && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.streetName}>{item.name}</ThemedText>
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
                <ThemedText type="subtitle">{editingStreet ? 'Editar' : 'Nueva'} Calle</ThemedText>
                <TextInput 
                  style={styles.modalInput}
                  value={streetName}
                  onChangeText={setStreetName}
                  placeholder="Nombre de la calle"
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
                    {isSaving ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* --- MODAL: DEACTIVATION (Soft Delete) --- */}
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
                <ThemedText style={styles.deleteText}>¿Deseas dar de baja la calle {streetToDelete?.name}?</ThemedText>
                <View style={{ marginTop: 15 }}>
                  <ThemedText style={styles.labelSmall}>Motivo de la Baja *</ThemedText>
                  <TextInput 
                    style={[styles.modalInput, { borderBottomColor: '#ff4444' }]}
                    value={deactivationReason}
                    onChangeText={setDeactivationReason}
                    placeholder="Escriba el motivo detallado..."
                    placeholderTextColor="#aaa"
                    multiline
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
                    {isSaving ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.saveBtnText}>Confirmar Baja</ThemedText>}
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
  streetItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  streetName: { fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginTop: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#007AFF', marginVertical: 15, fontSize: 16, paddingVertical: 8, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 25, marginTop: 20 },
  cancelLabel: { color: '#666', fontWeight: '500' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 110, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  labelSmall: { fontSize: 12, color: '#666' },
  deleteHeader: { borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 15, paddingBottom: 10 },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold' },
  deleteText: { fontSize: 14, color: '#444' }
});