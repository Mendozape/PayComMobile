import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  View, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Modal,
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard
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
interface Permission {
  id: number;
  name: string;
}

const ENDPOINT = 'http://192.168.1.16:8000/api/permisos';

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

  useEffect(() => {
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
  }, []);

  const { can } = usePermission(currentUser);
  const canCreate = can('Crear-permisos');
  const canEdit = can('Editar-permisos');
  const canDelete = can('Eliminar-permisos');

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ENDPOINT, {
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
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!permissionName.trim()) {
      Alert.alert("Error", "El nombre del permiso es obligatorio.");
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      if (editingPermission) {
        await axios.put(`${ENDPOINT}/${editingPermission.id}`, { name: permissionName.trim() }, config);
        Alert.alert("Éxito", "Permiso actualizado correctamente.");
      } else {
        await axios.post(ENDPOINT, { name: permissionName.trim() }, config);
        Alert.alert("Éxito", "Permiso creado correctamente.");
      }
      
      setModalVisible(false);
      fetchPermissions();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Fallo al guardar el permiso.";
      Alert.alert("Error", msg);
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
      fetchPermissions();
      setDeleteModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar el permiso.");
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      {/* HEADER ACTIONS */}
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

      {/* PERMISSIONS LIST */}
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

                    <ThemedText style={styles.labelSmall}>Nombre del Permiso *</ThemedText>
                    <TextInput 
                      style={styles.modalInput}
                      value={permissionName}
                      onChangeText={setPermissionName}
                      placeholder="Ej. Ver-reportes"
                      autoCapitalize="none"
                    />
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

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.confirmBox}>
                  <IconSymbol name="trash" size={40} color="#ff4444" />
                  <ThemedText style={styles.confirmTitle}>¿Eliminar Permiso?</ThemedText>
                  <ThemedText style={styles.confirmDesc}>Esta acción eliminará el permiso del sistema permanentemente.</ThemedText>
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
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 20, fontSize: 16, paddingVertical: 8, color: '#333' },
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