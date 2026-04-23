import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  ScrollView, useColorScheme
} from 'react-native';

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * Category type definition
 */
interface ExpenseCategory {
  id: number;
  name: string;
  deleted_at: string | null;
}

const ENDPOINT = `${API_BASE}/expense_categories`;

export default function ExpenseCategoriesScreen() {

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Current selected items
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<any>({});

  /**
   * Load categories on screen focus
   */
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setUser(JSON.parse(jsonValue));

          await fetchCategories();
        } catch (e) {
          console.error(e);
        } finally {
          setIsReady(true);
        }
      };
      init();
    }, [])
  );

  const { can } = usePermission(user);

  const canCreate = can('Crear-catalogo-gastos');
  const canEdit = can('Editar-catalogo-gastos');
  const canDelete = can('Eliminar-catalogo-gastos');

  /**
   * Fetch categories from API
   */
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');

      const res = await axios.get(ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCategories(res.data.data || res.data);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  /**
   * Open create/edit modal
   */
  const openModal = (cat: ExpenseCategory | null = null) => {
    setErrors({});
    setEditingCategory(cat);
    setName(cat ? cat.name : '');
    setModalVisible(true);
  };

  /**
   * Validate form
   */
  const validate = () => {
    let e: any = {};

    if (!name.trim()) {
      e.name = "El nombre es obligatorio.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /**
   * Create or update category
   */
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { name: name.trim() };

      if (editingCategory) {
        await axios.put(`${ENDPOINT}/${editingCategory.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        Toast.show({
          type: 'success',
          text1: 'Éxito',
          text2: 'Categoría actualizada'
        });

      } else {
        await axios.post(ENDPOINT, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        Toast.show({
          type: 'success',
          text1: 'Éxito',
          text2: 'Categoría creada'
        });
      }

      setModalVisible(false);
      fetchCategories();

    } catch (e: any) {
      setErrors({ server: "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Delete (soft delete)
   */
  const handleDelete = async () => {

    // Safety check
    if (categoryToDelete?.deleted_at) {
      Toast.show({
        type: 'info',
        text1: 'Ya está desactivada'
      });
      return;
    }

    setIsSaving(true);

    try {
      const token = await AsyncStorage.getItem('userToken');

      await axios.delete(`${ENDPOINT}/${categoryToDelete?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDeleteModalVisible(false);

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Categoría desactivada'
      });

      fetchCategories();

    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No se pudo eliminar'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TextInput
          style={[
            styles.search,
            { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f2', color: isDark ? '#fff' : '#333' }
          ]}
          placeholder="Buscar..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />

        {canCreate && (
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
            <IconSymbol name="plus" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.item, item.deleted_at && { opacity: 0.5 }]}>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>

                {/* Status indicator */}
                {item.deleted_at && (
                  <ThemedText style={styles.inactiveText}>
                    Inactiva
                  </ThemedText>
                )}
              </View>

              <View style={styles.actions}>
                
                {canEdit && (
                  <TouchableOpacity
                    disabled={!!item.deleted_at}
                    onPress={() => openModal(item)}
                  >
                    <IconSymbol
                      name="pencil"
                      size={20}
                      color={item.deleted_at ? '#ccc' : '#007AFF'}
                    />
                  </TouchableOpacity>
                )}

                {canDelete && (
                  <TouchableOpacity
                    disabled={!!item.deleted_at}
                    onPress={() => {
                      if (item.deleted_at) return;
                      setCategoryToDelete(item);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <IconSymbol
                      name="trash"
                      size={20}
                      color={item.deleted_at ? '#ccc' : '#ff4444'}
                    />
                  </TouchableOpacity>
                )}

              </View>

            </View>
          )}
        />
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior="padding" style={styles.centerBox}>
              
              <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>

                <ScrollView>
                  <ThemedText style={styles.title}>
                    {editingCategory ? 'Editar' : 'Nueva'} Categoría
                  </ThemedText>

                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Nombre"
                  />

                  {errors.name && (
                    <ThemedText style={styles.error}>{errors.name}</ThemedText>
                  )}

                  {errors.server && (
                    <ThemedText style={styles.error}>{errors.server}</ThemedText>
                  )}
                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <ThemedText>Cancelar</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    {isSaving ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <ThemedText style={{ color: 'white' }}>Guardar</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.centerBox}>
            
            <View style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>

              <ThemedText style={styles.deleteTitle}>
                Confirmar
              </ThemedText>

              <ThemedText style={styles.deleteText}>
                ¿Deseas desactivar "{categoryToDelete?.name}"?
              </ThemedText>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <ThemedText>Cancelar</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                >
                  {isSaving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={{ color: 'white' }}>Eliminar</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

            </View>

          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  search: { flex: 1, padding: 10, borderRadius: 10 },
  addBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 10 },

  item: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1 },
  name: { fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 15 },

  inactiveText: { color: '#ff4444', fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  centerBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },

  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20
  },

  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

  input: { borderBottomWidth: 1, paddingVertical: 10 },
  inputError: { borderBottomColor: '#ff4444' },
  error: { color: '#ff4444', marginTop: 5 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
    marginTop: 20
  },

  cancelBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e5e5e5'
  },

  saveBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },

  deleteBtn: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },

  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },

  deleteText: {
    marginBottom: 20,
    fontSize: 14
  }
});