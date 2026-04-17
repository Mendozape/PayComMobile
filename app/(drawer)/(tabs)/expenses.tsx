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
import DateTimePicker from '@react-native-community/datetimepicker';

// Corrected relative path to reach src/api/axios from app/(drawer)/
import { API_BASE } from '../../../src/api/axios';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

const ENDPOINT = `${API_BASE}/expenses`;
const CAT_ENDPOINT = `${API_BASE}/expense_categories`;

/**
 * ExpensesScreen Component
 * Manages community management records with a Date Picker for entry.
 */
export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('Seleccionar Tipo');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  // ⚠️ Inline validation error state
  const [errors, setErrors] = useState<any>({});

  /**
   * FOCUS LOAD: Refreshes records and categories every time the screen is focused.
   */
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
    } catch (e) { console.error("Fetch Error:", e); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${CAT_ENDPOINT}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setCategories(data.filter((c: any) => !c.deleted_at));
    } catch (e) { console.error("Fetch Categories Error:", e); }
  };

  const openForm = (item: any = null) => {
    setErrors({});
    setEditingId(item?.id || null);
    setCategoryId(item?.expense_category_id?.toString() || '');
    setCategoryName(item?.category?.name || 'Seleccionar Tipo');
    setAmount(item?.amount?.toString() || '');
    // Parsing date from string to object for the Picker
    setExpenseDate(item ? new Date(item.expense_date.replace(/-/g, '\/')) : new Date());
    setShowCategoryList(false);
    setModalVisible(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
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
      // Format date to YYYY-MM-DD for backend
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

      setModalVisible(false);
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
                      <TouchableOpacity onPress={() => { setExpenseToDelete(item); setDeactivationReason(''); setErrors({}); setDeleteModalVisible(true); }} style={styles.iconBtn}>
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

      {/* MODAL: CREATE / EDIT */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
            <View style={styles.modalContent}>
              {showCategoryList ? (
                <View style={{ width: '100%', height: 350 }}>
                  <ThemedText type="subtitle" style={{ marginBottom: 15 }}>Seleccionar Tipo</ThemedText>
                  <FlatList 
                    data={categories}
                    keyExtractor={(item) => `cat-${item.id}`}
                    renderItem={({item}) => (
                      <TouchableOpacity style={styles.catItem} onPress={() => {
                        setCategoryId(item.id.toString());
                        setCategoryName(item.name);
                        setShowCategoryList(false);
                        if(errors.category) setErrors({...errors, category: null});
                      }}>
                        <ThemedText>{item.name}</ThemedText>
                      </TouchableOpacity>
                    )}
                  />
                  <TouchableOpacity onPress={() => setShowCategoryList(false)} style={{ marginTop: 15 }}>
                    <ThemedText style={{ color: '#007AFF', textAlign: 'center', fontWeight: 'bold' }}>CERRAR</ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <ThemedText type="subtitle" style={{ marginBottom: 15 }}>{editingId ? 'Editar' : 'Nuevo'} Registro</ThemedText>
                  
                  <ThemedText style={[styles.labelSmall, errors.category && styles.errorLabel]}>Tipo de Gestión *</ThemedText>
                  <TouchableOpacity style={[styles.pickerFake, errors.category && styles.inputError]} onPress={() => { Keyboard.dismiss(); setShowCategoryList(true); }}>
                    <ThemedText style={{ color: categoryId ? (errors.category ? '#ff4444' : '#333') : '#aaa' }}>{categoryName}</ThemedText>
                    <IconSymbol name="chevron.down" size={16} color={errors.category ? '#ff4444' : "#888"} />
                  </TouchableOpacity>
                  {errors.category && <ThemedText style={styles.errorText}>{errors.category}</ThemedText>}

                  <ThemedText style={[styles.labelSmall, errors.amount && styles.errorLabel]}>Valor Unitario *</ThemedText>
                  <TextInput style={[styles.modalInput, errors.amount && styles.inputError]} value={amount} onChangeText={(v) => {setAmount(v); if(errors.amount) setErrors({...errors, amount: null});}} placeholder="0.00" keyboardType="numeric" placeholderTextColor="#aaa" />
                  {errors.amount && <ThemedText style={styles.errorText}>{errors.amount}</ThemedText>}

                  <ThemedText style={styles.labelSmall}>Fecha del Registro *</ThemedText>
                  <TouchableOpacity style={styles.pickerFake} onPress={() => setShowDatePicker(true)}>
                    <ThemedText style={{ color: '#333' }}>{expenseDate.toISOString().split('T')[0]}</ThemedText>
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

                  {errors.server && <ThemedText style={styles.serverError}>{errors.server}</ThemedText>}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, { opacity: isSaving ? 0.6 : 1 }]} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL: DELETE */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.deleteTitle}>Remover Registro</ThemedText>
              <ThemedText style={styles.labelSmall}>Justificación de remoción *</ThemedText>
              <TextInput 
                style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}, errors.deleteReason && styles.inputError]} 
                value={deactivationReason} 
                onChangeText={(v) => {setDeactivationReason(v); if(errors.deleteReason) setErrors({...errors, deleteReason: null});}} 
                placeholder="Indique el motivo..." 
                placeholderTextColor="#aaa"
                multiline
              />
              {errors.deleteReason && <ThemedText style={styles.errorText}>{errors.deleteReason}</ThemedText>}

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ff4444' }]} onPress={handleDelete} disabled={isSaving}>
                  {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Remover</ThemedText>}
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
  catItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 25, marginTop: 25, alignItems: 'center' },
  saveBtn: { backgroundColor: '#28a745', paddingHorizontal: 20, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center', minWidth: 110 },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  // Inline error styles
  inputError: { borderBottomColor: '#ff4444' },
  errorLabel: { color: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 12, marginTop: 4 },
  serverError: { color: '#ff4444', textAlign: 'center', fontWeight: 'bold', marginTop: 10 }
});