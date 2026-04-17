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
  Keyboard,
  ScrollView 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router'; 
import Toast from 'react-native-toast-message';

// Corrected relative path to reach src/api/axios from app/(drawer)/
import { API_BASE } from '../../../src/api/axios'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

/**
 * 🛡️ INTERFACES
 */
interface Permission {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
  permissions?: Permission[];
}

// Dynamic endpoints constructed from API_BASE
const ROLES_ENDPOINT = `${API_BASE}/roles`;
const PERMS_ENDPOINT = `${API_BASE}/permisos`;

export default function RolesScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    selectedPermissions: [] as number[]
  });

  // ⚠️ Inline validation error state
  const [errors, setErrors] = useState<any>({});

  /**
   * 🛡️ FOCUS LOAD: Re-fetches roles and permissions every time the screen is focused.
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setCurrentUser(JSON.parse(jsonValue));
          // Concurrent fetch from dynamic endpoints with cache busting
          await Promise.all([fetchRoles(), fetchPermissions()]);
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
  const canCreate = can('Crear-roles');
  const canEdit = can('Editar-roles');
  const canDelete = can('Eliminar-roles');

  /**
   * Fetches roles list from dynamic endpoint.
   */
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ROLES_ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setRoles(response.data.data || response.data);
    } catch (error) {
      console.error("Fetch Roles Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches all available permissions to populate the checklist.
   */
  const fetchPermissions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${PERMS_ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setAllPermissions(response.data);
    } catch (error) {
      console.error("Fetch Perms Error:", error);
    }
  };

  const filteredRoles = roles.filter((r) => 
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (role: Role | null = null) => {
    setErrors({});
    setEditingRole(role);
    if (role) {
      setFormData({
        name: role.name,
        selectedPermissions: role.permissions?.map(p => p.id) || []
      });
    } else {
      setFormData({ name: '', selectedPermissions: [] });
    }
    setModalVisible(true);
  };

  const togglePermission = (id: number) => {
    setFormData(prev => ({
      ...prev,
      selectedPermissions: prev.selectedPermissions.includes(id)
        ? prev.selectedPermissions.filter(p => p !== id)
        : [...prev.selectedPermissions, id]
    }));
    // Clear permission error if at least one is selected
    if (errors.permissions) setErrors({ ...errors, permissions: null });
  };

  /**
   * Validation Logic
   */
  const validate = () => {
    let _errors: any = {};
    if (!formData.name.trim()) _errors.name = "El nombre del role es obligatorio.";
    if (formData.selectedPermissions.length === 0) _errors.permissions = "Debes seleccionar al menos un permiso.";
    setErrors(_errors);
    return Object.keys(_errors).length === 0;
  };

  /**
   * Logic for Save/Update operations via dynamic API base.
   */
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      const payload = {
        name: formData.name.trim(),
        permission: formData.selectedPermissions
      };

      if (editingRole) {
        await axios.put(`${ROLES_ENDPOINT}/${editingRole.id}`, payload, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Role actualizado correctamente.' });
      } else {
        await axios.post(ROLES_ENDPOINT, payload, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Role creado correctamente.' });
      }
      
      setModalVisible(false);
      fetchRoles();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Fallo al guardar el role.";
      setErrors({ server: msg });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Permanent role deletion using dynamic endpoint.
   */
  const confirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ROLES_ENDPOINT}/${roleToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Eliminado', text2: 'El role ha sido borrado.' });
      fetchRoles();
      setDeleteModalVisible(false);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar el role.' });
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar role..."
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
          data={filteredRoles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.roleItem}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.roleName}>{item.name}</ThemedText>
                <ThemedText style={styles.roleSub}>
                    {item.permissions?.length || 0} permisos asignados
                </ThemedText>
              </View>
              
              <View style={styles.actionRow}>
                {canEdit && (
                  <TouchableOpacity onPress={() => openModal(item)}>
                    <IconSymbol name="pencil" size={22} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => { setRoleToDelete(item.id); setDeleteModalVisible(true); }}>
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
                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                    <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                        {editingRole ? 'Editar' : 'Nuevo'} Role del Sistema
                    </ThemedText>

                    <ThemedText style={[styles.labelSmall, errors.name && styles.errorLabel]}>Nombre del Role *</ThemedText>
                    <TextInput 
                      style={[styles.modalInput, errors.name && styles.inputError]}
                      value={formData.name}
                      onChangeText={(v) => {
                        setFormData({...formData, name: v});
                        if (errors.name) setErrors({...errors, name: null});
                      }}
                      placeholder="Ej. Administrador"
                    />
                    {errors.name && <ThemedText style={styles.errorText}>{errors.name}</ThemedText>}

                    <ThemedText style={[styles.labelSmall, errors.permissions && styles.errorLabel, {marginTop: 10}]}>Permisos del Role *</ThemedText>
                    <View style={styles.permissionsGrid}>
                        {allPermissions.map((p) => (
                            <TouchableOpacity 
                                key={p.id} 
                                style={[
                                    styles.permChip, 
                                    formData.selectedPermissions.includes(p.id) && styles.permChipActive,
                                    errors.permissions && { borderColor: '#ff4444' }
                                ]}
                                onPress={() => togglePermission(p.id)}
                            >
                                <ThemedText style={[styles.permChipText, formData.selectedPermissions.includes(p.id) && { color: 'white' }]}>
                                    {p.name}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors.permissions && <ThemedText style={styles.errorText}>{errors.permissions}</ThemedText>}
                    
                    {errors.server && <ThemedText style={styles.serverError}>{errors.server}</ThemedText>}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                      <ThemedText style={styles.cancelLabel}>Cancelar</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                      {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.confirmBox}>
                  <IconSymbol name="trash" size={40} color="#ff4444" />
                  <ThemedText style={styles.confirmTitle}>¿Eliminar Role?</ThemedText>
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
  roleItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  roleName: { fontSize: 16, fontWeight: 'bold' },
  roleSub: { fontSize: 13, color: '#666' },
  actionRow: { flexDirection: 'row', gap: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, width: '100%', maxHeight: '80%', overflow: 'hidden' },
  modalBody: { paddingHorizontal: 25, paddingTop: 25 },
  labelSmall: { fontSize: 11, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 5, fontSize: 15, paddingVertical: 5, color: '#333' },
  permissionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 },
  permChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  permChipActive: { backgroundColor: '#28a745', borderColor: '#28a745' },
  permChipText: { fontSize: 12, color: '#666' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, padding: 25, backgroundColor: '#f9f9f9' },
  cancelBtn: { padding: 10 },
  cancelLabel: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 100, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  confirmBox: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', width: '80%' },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 15 },
  confirmDesc: { color: '#666', textAlign: 'center', marginVertical: 10 },
  confirmActions: { flexDirection: 'row', gap: 20, marginTop: 10 },
  deleteConfirmBtn: { backgroundColor: '#ff4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  // ⚠️ ERROR STYLES
  inputError: { borderBottomColor: '#ff4444' },
  errorLabel: { color: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 11, marginBottom: 15, fontWeight: '500' },
  serverError: { color: '#ff4444', textAlign: 'center', marginTop: 10, fontWeight: 'bold' }
});