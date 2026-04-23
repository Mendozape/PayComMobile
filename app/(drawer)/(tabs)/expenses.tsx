import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

import { API_BASE } from '../../../src/api/axios';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

const ENDPOINT = `${API_BASE}/expenses`;
const CAT_ENDPOINT = `${API_BASE}/expense_categories`;

/**
 * Safely parses backend date strings into a valid Date object.
 */
const parseDate = (dateString: string | null) => {
  if (!dateString) return new Date();
  try {
    const clean = dateString.split(' ')[0];
    const parsed = new Date(clean);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  } catch (e) {
    return new Date();
  }
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // UI Visibility States
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('Seleccionar Tipo');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  const [errors, setErrors] = useState<any>({});

  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setUser(JSON.parse(jsonValue));
          await Promise.all([fetchExpenses(), fetchCategories()]);
        } catch (e) {
          console.error("Initialization Error:", e);
        } finally {
          setIsReady(true);
        }
      };
      initialize();
    }, [])
  );

  const { can } = usePermission(user);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) { 
      console.error("Fetch Error:", e); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${CAT_ENDPOINT}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setCategories(data.filter((c: any) => !c.deleted_at));
    } catch (e) { 
      console.error("Fetch Categories Error:", e); 
    }
  };

  /**
   * Resets all form fields and UI triggers to ensure a clean state
   * regardless of previous interactions.
   */
  const openForm = (item: any = null) => {
    setErrors({});
    setIsSaving(false);
    
    // Explicitly reset UI triggers to prevent stuck pickers
    setShowDatePicker(false);
    setShowCategoryList(false);

    if (item) {
      // Edit Mode: Populate with DB data
      setEditingId(item.id);
      setCategoryId(item.expense_category_id?.toString() || '');
      setCategoryName(item.category?.name || 'Seleccionar Tipo');
      setAmount(item.amount?.toString() || '');
      setExpenseDate(parseDate(item.expense_date));
    } else {
      // Create Mode: Hard reset all fields
      setEditingId(null);
      setCategoryId('');
      setCategoryName('Seleccionar Tipo');
      setAmount('');
      setExpenseDate(new Date());
    }

    setModalVisible(true);
  };

  /**
   * Closes the main modal and ensures sub-pickers are also closed.
   */
  const closeForm = () => {
    setModalVisible(false);
    setShowDatePicker(false);
    setShowCategoryList(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // Hide picker immediately after selection or cancel
    setShowDatePicker(false);
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  const validate = () => {
    let _errors: any = {};
    if (!categoryId) _errors.category = "Selecciona un tipo de gestión.";
    if (!amount || isNaN(Number(amount))) _errors.amount = "Ingresa un valor válido.";
    setErrors(_errors);
    return Object.keys(_errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formattedDate = expenseDate.toISOString().split('T')[0];
      
      const payload = { 
        expense_category_id: categoryId, 
        amount, 
        expense_date: formattedDate 
      };

      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      if (editingId) {
        await axios.put(`${ENDPOINT}/${editingId}`, payload, config);
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Registro actualizado.' });
      } else {
        await axios.post(ENDPOINT, payload, config);
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Registro guardado.' });
      }

      closeForm();
      fetchExpenses();
    } catch (e: any) {
      setErrors({ server: e.response?.data?.message || "Error al guardar." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deactivationReason.trim().length < 10) {
      setErrors({ deleteReason: "Mínimo 10 caracteres." });
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${expenseToDelete.id}`, { 
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });

      setDeleteModalVisible(false);
      Toast.show({ type: 'success', text1: 'Eliminado', text2: 'Registro removido.' });
      fetchExpenses();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo remover.' });
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
          placeholder="Buscar por tipo..." 
          placeholderTextColor="#888"
          onChangeText={setSearch} 
        />
        {can('Crear-gastos') && (
          <TouchableOpacity style={styles.addButton} onPress={() => openForm()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={expenses.filter(e => e.category?.name?.toLowerCase().includes(search.toLowerCase()))}
          keyExtractor={(item) => `exp-${item.id}`}
          renderItem={({ item }) => (
            <View style={[styles.itemRow, item.deleted_at && { opacity: 0.5 }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemName}>{item.category?.name || 'N/A'}</ThemedText>
                <ThemedText style={styles.amountText}>Valor: ${parseFloat(item.amount).toFixed(2)}</ThemedText>
                <ThemedText style={styles.dateSubtext}>{item.expense_date.split(' ')[0]}</ThemedText>
              </View>

              <View style={styles.actionRow}>
                {!item.deleted_at && (
                  <>
                    {can('Editar-gastos') && (
                      <TouchableOpacity onPress={() => openForm(item)} style={styles.iconBtn}>
                        <IconSymbol name="pencil" size={22} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                    {can('Eliminar-gastos') && (
                      <TouchableOpacity 
                        onPress={() => { 
                          setExpenseToDelete(item); 
                          setDeactivationReason(''); 
                          setErrors({}); 
                          setDeleteModalVisible(true); 
                        }} 
                        style={styles.iconBtn}
                      >
                        <IconSymbol name="trash" size={22} color="#ff4444" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeForm}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.modalContent}>

              <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                {editingId ? 'Editar' : 'Nuevo'} Registro
              </ThemedText>

              {/* CATEGORY SELECTOR */}
              <ThemedText style={[styles.labelSmall, errors.category && styles.errorLabel]}>
                Tipo de Gestión *
              </ThemedText>
              <TouchableOpacity 
                style={[styles.pickerFake, errors.category && styles.inputError]} 
                onPress={() => { Keyboard.dismiss(); setShowCategoryList(true); }}
              >
                <ThemedText style={{ color: categoryId ? '#333' : '#aaa' }}>
                  {categoryName}
                </ThemedText>
                <IconSymbol name="chevron.down" size={16} color="#888" />
              </TouchableOpacity>

              {/* AMOUNT */}
              <ThemedText style={[styles.labelSmall, errors.amount && styles.errorLabel]}>
                Valor Unitario *
              </ThemedText>
              <TextInput
                style={[styles.modalInput, errors.amount && styles.inputError]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />

              {/* DATE PICKER TRIGGER */}
              <ThemedText style={styles.labelSmall}>Fecha del Registro *</ThemedText>
              <TouchableOpacity style={styles.pickerFake} onPress={() => setShowDatePicker(true)}>
                <ThemedText>
                  {expenseDate.toISOString().split('T')[0]}
                </ThemedText>
                <IconSymbol name="calendar" size={18} color="#007AFF" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={expenseDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}

              {/* MODAL ACTIONS */}
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={closeForm}>
                  <ThemedText>Cancelar</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>

        {/* INNER MODAL FOR CATEGORY SELECTION */}
        <Modal visible={showCategoryList} transparent animationType="fade" onRequestClose={() => setShowCategoryList(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '70%' }]}>
              <ThemedText type="subtitle" style={{ marginBottom: 15 }}>Seleccione Tipo</ThemedText>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.categoryItem}
                    onPress={() => {
                      setCategoryId(item.id.toString());
                      setCategoryName(item.name);
                      setShowCategoryList(false);
                    }}
                  >
                    <ThemedText>{item.name}</ThemedText>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity 
                style={[styles.saveBtn, { marginTop: 15, backgroundColor: '#666', width: '100%' }]} 
                onPress={() => setShowCategoryList(false)}
              >
                <ThemedText style={{ color: 'white' }}>Cerrar</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.deleteTitle}>Remover Registro</ThemedText>

            <TextInput 
              style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]} 
              value={deactivationReason} 
              onChangeText={setDeactivationReason}
              placeholder="Indique el motivo..." 
              placeholderTextColor="#aaa"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <ThemedText>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#ff4444' }]} 
                onPress={handleDelete}
                disabled={isSaving}
              >
                <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Remover</ThemedText>
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
  amountText: { color: '#28a745', fontWeight: 'bold', fontSize: 15 },
  dateSubtext: { fontSize: 12, color: '#888' },
  actionRow: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%' },
  labelSmall: { fontSize: 11, color: '#888', marginTop: 15, fontWeight: 'bold', textTransform: 'uppercase' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginVertical: 5, paddingVertical: 8, fontSize: 16, color: '#333' },
  pickerFake: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#28a745' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 25, marginTop: 25, alignItems: 'center' },
  saveBtn: { backgroundColor: '#28a745', paddingHorizontal: 20, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', minWidth: 110 },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  inputError: { borderBottomColor: '#ff4444' },
  errorLabel: { color: '#ff4444' },
  categoryItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }
});