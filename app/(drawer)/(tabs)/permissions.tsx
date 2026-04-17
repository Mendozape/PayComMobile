import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  View, 
  TextInput, 
  ActivityIndicator, 
  Modal,
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';

// Corrected relative path
import { API_BASE } from '../../../src/api/axios'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * 🛡️ TYPE DEFINITIONS
 */
interface Permission {
  id: number;
  name: string;
}

const ENDPOINT = `${API_BASE}/permisos`;

export default function PermissionsScreen() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [permToDelete, setPermToDelete] = useState<number | null>(null);

  // Form state
  const [permissionName, setPermissionName] = useState('');
  
  // ⚠️ NEW: Inline error state
  const [fieldError, setFieldError] = useState<string | null>(null);

  /**
   * 🛡️ FOCUS LOAD
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setCurrentUser(JSON.parse(jsonValue));
          await fetchPermissions();
        } catch (e) {
          console.error("Initialization Error:", e);
        } finally {
          setIsReady(true);
        }
      };
      initialize();
    }, [])
  );

  const { can } = usePermission(currentUser);
  const canCreate = can('Crear-permisos');
  const canEdit = can('Editar-permisos');
  const canDelete = can('Eliminar-permisos');

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Permissions Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPermissions = permissions.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (perm: Permission | null = null) => {
    setEditingPermission(perm);
    setPermissionName(perm ? perm.name : '');
    setFieldError(null); // Clear errors when opening
    setModalVisible(true);
  };

  /**
   * handleSave with Inline Validation
   */
  const handleSave = async () => {
    // ⚠️ Check validation inline
    if (!permissionName.trim()) {
      setFieldError("El nombre del permiso es obligatorio.");
      return;
    }

    setFieldError(null);
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      if (editingPermission) {
        await axios.put(`${ENDPOINT}/${editingPermission.id}`, { name: permissionName.trim() }, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Permiso actualizado exitosamente' });
      } else {
        await axios.post(ENDPOINT, { name: permissionName.trim() }, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Permiso creado exitosamente' });
      }
      
      setModalVisible(false);
      fetchPermissions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al guardar.";
      setFieldError(msg); // Show API error inline too
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!permToDelete) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ENDPOINT}/${permToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Eliminado' });
      fetchPermissions();
      setDeleteModalVisible(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Fallo al eliminar.' });
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar permiso..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
            <IconSymbol name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredPermissions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
              </View>
              <View style={styles.actionRow}>
                {canEdit && (
                  <TouchableOpacity onPress={() => openModal(item)}>
                    <IconSymbol name="pencil" size={22} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => { setPermToDelete(item.id); setDeleteModalVisible(true); }}>
                    <IconSymbol name="trash" size={22} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL: CREATE / EDIT */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.modalContent}>
                <View style={styles.modalBody}>
                    <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                        {editingPermission ? 'Editar' : 'Nuevo'} Permiso
                    </ThemedText>

                    <ThemedText style={[styles.labelSmall, fieldError ? {color: '#ff4444'} : {}]}>
                      Nombre del Permiso *
                    </ThemedText>
                    
                    <TextInput 
                      style={[styles.modalInput, fieldError ? styles.inputError : {}]}
                      value={permissionName}
                      onChangeText={(val) => {
                        setPermissionName(val);
                        if(fieldError) setFieldError(null);
                      }}
                      placeholder="Ej. Ver-reportes"
                      autoCapitalize="none"
                    />

                    {/* ⚠️ INLINE ERROR MESSAGE */}
                    {fieldError && (
                      <ThemedText style={styles.errorText}>{fieldError}</ThemedText>
                    )}
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                      <ThemedText style={styles.cancelLabel}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.confirmBox}>
                  <IconSymbol name="trash" size={40} color="#ff4444" />
                  <ThemedText style={styles.confirmTitle}>¿Eliminar Permiso?</ThemedText>
                  <ThemedText style={styles.confirmDesc}>Esta acción no se puede deshacer.</ThemedText>
                  <View style={styles.confirmActions}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                          <ThemedText>Cancelar</ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDelete}>
                          <ThemedText style={{ color: 'white', fontWeight: 'bold' }}>Eliminar</ThemedText>
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
  itemRow: { flexDirection: 'row', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, width: '100%', overflow: 'hidden' },
  modalBody: { padding: 25 },
  labelSmall: { fontSize: 11, color: '#888', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 5 },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 5, fontSize: 16, paddingVertical: 8, color: '#333' },
  inputError: { borderBottomColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 12, marginBottom: 15, fontWeight: '500' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, padding: 20, backgroundColor: '#f9f9f9', borderTopWidth: 1, borderTopColor: '#eee' },
  cancelBtn: { padding: 10 },
  cancelLabel: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 100, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  confirmBox: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', width: '80%' },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  confirmDesc: { color: '#666', textAlign: 'center', marginVertical: 10 },
  confirmActions: { flexDirection: 'row', gap: 20, marginTop: 10 },
  deleteConfirmBtn: { backgroundColor: '#ff4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }
});