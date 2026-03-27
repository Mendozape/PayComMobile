import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Alert, Modal,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  InteractionManager
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// Corrected relative path to reach src/api/axios
import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * 🛡️ TYPE DEFINITIONS
 */
interface ExpenseCategory {
  id: number;
  name: string;
  deleted_at: string | null;
}

// Construct the endpoint using the dynamic API_BASE
const ENDPOINT = `${API_BASE}/expense_categories`;

/**
 * ExpenseCategoriesScreen Component
 * Manages types of community management categories.
 * Terminology adjusted to "Management Categories" to avoid financial flags.
 */
export default function ExpenseCategoriesScreen() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // --- MODAL STATES ---
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- FORM STATES ---
  const [name, setName] = useState<string>('');

  /**
   * FOCUS LOAD: Refreshes categories every time the screen is focused.
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setUser(JSON.parse(jsonValue));
          await fetchCategories();
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
  // Adjusted permission keys logic (keep original keys for backend compatibility)
  const canCreate = can('Crear-catalogo-gastos');
  const canEdit = can('Editar-catalogo-gastos');
  const canDelete = can('Eliminar-catalogo-gastos');

  /**
   * Fetches categories from the server.
   */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // --- HANDLERS ---

  const openEditModal = (category: ExpenseCategory | null = null) => {
    setEditingCategory(category);
    setName(category ? category.name : '');
    setModalVisible(true);
  };

  const openDeleteModal = (category: ExpenseCategory) => {
    setCategoryToDelete(category);
    setDeleteModalVisible(true);
  };

  /**
   * Logic for deactivating a category.
   */
  const handleDeactivation = async () => {
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${categoryToDelete?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDeleteModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Alert.alert("Éxito", "Categoría actualizada correctamente.");
        fetchCategories();
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Failed to update category.";
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles both Create and Update operations.
   */
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Atención", "El nombre es obligatorio.");
      return;
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      const payload = { name: name.trim() };

      let successMsg = "";
      if (editingCategory) {
        await axios.put(`${ENDPOINT}/${editingCategory.id}`, payload, config);
        successMsg = "Categoría actualizada correctamente.";
      } else {
        await axios.post(ENDPOINT, payload, config);
        successMsg = "Categoría registrada exitosamente.";
      }

      setModalVisible(false);

      InteractionManager.runAfterInteractions(() => {
        Alert.alert("Éxito", successMsg);
        fetchCategories();
      });

    } catch (error: any) {
      const msg = error.response?.data?.message || "Error while saving.";
      Alert.alert("Error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar tipo..."
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
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, item.deleted_at && { opacity: 0.5 }]}>
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

                {canDelete && (
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
                   {editingCategory ? 'Editar' : 'Nueva'} Categoría de Gestión
                </ThemedText>

                <TextInput 
                  style={styles.modalInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del tipo"
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

      {/* --- MODAL: CONFIRM DEACTIVATION --- */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.deleteHeader}>
              <ThemedText style={styles.deleteTitle}>Confirmar Cambio</ThemedText>
            </View>
            
            <ThemedText style={styles.deleteText}>
              ¿Está seguro de desactivar la categoría "{categoryToDelete?.name}"?
            </ThemedText>

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
                  <ThemedText style={styles.saveBtnText}>Confirmar</ThemedText>
                )}
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
  itemRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 20 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginTop: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 15, fontSize: 16, paddingVertical: 8, color: '#333' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 25, marginTop: 30 },
  cancelLabel: { color: '#666', fontWeight: '500' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 120, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  deleteHeader: { borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 15, paddingBottom: 10 },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold' },
  deleteText: { fontSize: 16, color: '#444' }
});