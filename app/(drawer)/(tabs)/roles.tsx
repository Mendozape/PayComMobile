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
  Keyboard,
  ScrollView 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const ROLES_ENDPOINT = 'http://192.168.1.16:8000/api/roles';
const PERMS_ENDPOINT = 'http://192.168.1.16:8000/api/permisos';

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

  useEffect(() => {
    const initialize = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('userData');
        if (jsonValue) setCurrentUser(JSON.parse(jsonValue));
        await Promise.all([fetchRoles(), fetchPermissions()]);
      } catch (e) {
        console.error("Initialization Error:", e);
      } finally {
        setIsReady(true);
      }
    };
    initialize();
  }, []);

  const { can } = usePermission(currentUser);
  const canCreate = can('Crear-roles');
  const canEdit = can('Editar-roles');
  const canDelete = can('Eliminar-roles');

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ROLES_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setRoles(response.data.data || response.data);
    } catch (error) {
      console.error("Fetch Roles Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(PERMS_ENDPOINT, {
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
  };

  const handleSave = async () => {
    if (!formData.name.trim() || formData.selectedPermissions.length === 0) {
      Alert.alert("Error", "Nombre y al menos un permiso son obligatorios.");
      return;
    }

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
        Alert.alert("Éxito", "Role actualizado correctamente.");
      } else {
        await axios.post(ROLES_ENDPOINT, payload, config);
        Alert.alert("Éxito", "Role creado correctamente.");
      }
      
      setModalVisible(false);
      fetchRoles();
    } catch (error: any) {
      Alert.alert("Error", "Fallo al guardar el rol.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.delete(`${ROLES_ENDPOINT}/${roleToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRoles();
      setDeleteModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar el rol.");
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      {/* HEADER ACTIONS */}
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

      {/* ROLES LIST */}
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

                    <ThemedText style={styles.labelSmall}>Nombre del Role *</ThemedText>
                    <TextInput 
                      style={styles.modalInput}
                      value={formData.name}
                      onChangeText={(v) => setFormData({...formData, name: v})}
                      placeholder="Ej. Administrador"
                    />

                    <ThemedText style={styles.labelSmall}>Permisos del Role</ThemedText>
                    <View style={styles.permissionsGrid}>
                        {allPermissions.map((p) => (
                            <TouchableOpacity 
                                key={p.id} 
                                style={[styles.permChip, formData.selectedPermissions.includes(p.id) && styles.permChipActive]}
                                onPress={() => togglePermission(p.id)}
                            >
                                <ThemedText style={[styles.permChipText, formData.selectedPermissions.includes(p.id) && { color: 'white' }]}>
                                    {p.name}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
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
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 20, fontSize: 15, paddingVertical: 5 },
  permissionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 30 },
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
  deleteConfirmBtn: { backgroundColor: '#ff4444', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }
});