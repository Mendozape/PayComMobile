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

const ENDPOINT = 'http://192.168.1.16:8000/api/expenses';
const CAT_ENDPOINT = 'http://192.168.1.16:8000/api/expense_categories';

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
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('Seleccionar Categoría');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);
  const [deactivationReason, setDeactivationReason] = useState('');

  useEffect(() => {
    const initialize = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('userData');
        if (jsonValue) setUser(JSON.parse(jsonValue));
        await Promise.all([fetchExpenses(), fetchCategories()]);
      } catch (e) {
        console.error(e);
      } finally {
        setIsReady(true);
      }
    };
    initialize();
  }, []);

  const { can } = usePermission(user);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setExpenses(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(CAT_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setCategories(data.filter((c: any) => !c.deleted_at));
    } catch (e) { console.error(e); }
  };

  const openForm = (item: any = null) => {
    setEditingId(item?.id || null);
    setCategoryId(item?.expense_category_id?.toString() || '');
    setCategoryName(item?.category?.name || 'Seleccionar Categoría');
    setAmount(item?.amount?.toString() || '');
    setExpenseDate(item ? item.expense_date.split(' ')[0] : new Date().toISOString().split('T')[0]);
    setShowCategoryList(false);
    setModalVisible(true);
  };

  const openDelete = (item: any) => {
    setExpenseToDelete(item);
    setDeactivationReason('');
    setDeleteModalVisible(true);
  };

  const handleSave = async () => {
    if (!categoryId || !amount || !expenseDate) return Alert.alert("Error", "Faltan campos.");
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = { expense_category_id: categoryId, amount, expense_date: expenseDate };
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (editingId) await axios.put(`${ENDPOINT}/${editingId}`, payload, config);
      else await axios.post(ENDPOINT, payload, config);
      setModalVisible(false);
      fetchExpenses();
    } catch (e) {
      Alert.alert("Error", "Fallo al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deactivationReason.trim().length < 10) {
        return Alert.alert("Error", "El motivo debe tener al menos 10 caracteres.");
    }
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${expenseToDelete.id}`, { 
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: deactivationReason }
      });
      setDeleteModalVisible(false);
      fetchExpenses();
      Alert.alert("Éxito", "Gasto eliminado.");
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput style={styles.searchInput} placeholder="Buscar..." onChangeText={setSearch} />
        {can('Crear-gastos') && (
          <TouchableOpacity style={styles.addButton} onPress={() => openForm()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={expenses.filter(e => e.category?.name?.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={(item) => `exp-${item.id}`}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemName}>{item.category?.name || 'N/A'}</ThemedText>
              <ThemedText style={styles.amountText}>${parseFloat(item.amount).toFixed(2)}</ThemedText>
              {item.deleted_at && <ThemedText style={styles.deletedLabel}>Gasto Eliminado / Inactivo</ThemedText>}
            </View>
            <View style={styles.actionRow}>
              {!item.deleted_at ? (
                <>
                  {can('Editar-gastos') && (
                    <TouchableOpacity onPress={() => openForm(item)} style={styles.iconBtn}>
                      <IconSymbol name="pencil" size={22} color="#007AFF" />
                    </TouchableOpacity>
                  )}
                  {can('Eliminar-gastos') && (
                    <TouchableOpacity onPress={() => openDelete(item)} style={styles.iconBtn}>
                      <IconSymbol name="trash" size={22} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <IconSymbol name="trash" size={22} color="#ccc" />
              )}
            </View>
          </View>
        )}
      />

      {/* MODAL FORMULARIO UNIFICADO */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                {showCategoryList ? (
                  <View style={{ width: '100%', height: 350 }}>
                    <ThemedText type="subtitle" style={{ marginBottom: 15 }}>Categorías</ThemedText>
                    <FlatList 
                      data={categories}
                      keyExtractor={(item) => `cat-${item.id}`}
                      renderItem={({item}) => (
                        <TouchableOpacity style={styles.catItem} onPress={() => {
                          setCategoryId(item.id.toString());
                          setCategoryName(item.name);
                          setShowCategoryList(false);
                        }}>
                          <ThemedText>{item.name}</ThemedText>
                        </TouchableOpacity>
                      )}
                    />
                    <TouchableOpacity onPress={() => setShowCategoryList(false)} style={{ marginTop: 15 }}>
                      <ThemedText style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>VOLVER</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ width: '100%' }}>
                    <ThemedText type="subtitle" style={{ marginBottom: 15 }}>{editingId ? 'Editar' : 'Nuevo'} Gasto</ThemedText>
                    
                    <ThemedText style={styles.labelSmall}>Categoría *</ThemedText>
                    <TouchableOpacity style={styles.pickerFake} onPress={() => { Keyboard.dismiss(); setShowCategoryList(true); }}>
                      <ThemedText style={{ color: categoryId ? '#333' : '#aaa' }}>{categoryName}</ThemedText>
                      <IconSymbol name="chevron.down" size={16} color="#888" />
                    </TouchableOpacity>

                    <ThemedText style={styles.labelSmall}>Monto $ *</ThemedText>
                    <TextInput style={styles.modalInput} value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />

                    <ThemedText style={styles.labelSmall}>Fecha *</ThemedText>
                    <TextInput style={styles.modalInput} value={expenseDate} onChangeText={setExpenseDate} placeholder="AAAA-MM-DD" />

                    <View style={styles.modalButtons}>
                      <TouchableOpacity onPress={() => setModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                        {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Guardar</ThemedText>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MODAL ELIMINAR CON MOTIVO */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.modalContent}>
              <ThemedText style={styles.deleteTitle}>Confirmar Eliminación</ThemedText>
              <ThemedText style={{marginBottom: 10}}>¿Por qué desea eliminar este gasto?</ThemedText>
              
              <TextInput 
                style={[styles.modalInput, {height: 80, textAlignVertical: 'top'}]} 
                value={deactivationReason} 
                onChangeText={setDeactivationReason} 
                placeholder="Motivo (mín. 10 caracteres)" 
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setDeleteModalVisible(false)}><ThemedText>Cancelar</ThemedText></TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.saveBtn, { backgroundColor: '#ff4444' }]} 
                    onPress={handleDelete}
                    disabled={isSaving}
                >
                  {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Eliminar</ThemedText>}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
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
  itemRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  amountText: { color: '#28a745', fontWeight: 'bold' },
  deletedLabel: { color: '#ff4444', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%', elevation: 5 },
  labelSmall: { fontSize: 12, color: '#666', marginTop: 10 },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#007AFF', marginVertical: 5, padding: 8, fontSize: 16 },
  pickerFake: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#007AFF' },
  catItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 25, marginTop: 25, alignItems: 'center' },
  saveBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  deleteTitle: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }
});