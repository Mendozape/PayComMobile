import React, { useState, useCallback } from 'react';
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
  ScrollView,
  InteractionManager
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router'; 

// API base and endpoints
import { API_BASE } from '../../../src/api/axios'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';

interface Role {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  comments: string | null;
  deleted_at: string | null;
  roles?: Role[];
}

const ENDPOINT = `${API_BASE}/usuarios`;
const ROLES_ENDPOINT = `${API_BASE}/roles`;

export default function ResidentsScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    comments: '',
    role: ''
  });

  /**
   * Refreshes users and roles on focus
   */
  useFocusEffect(
    useCallback(() => {
      const initialize = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem('userData');
          if (jsonValue) setCurrentUser(JSON.parse(jsonValue));
          await Promise.all([fetchUsers(), fetchRoles()]);
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
  const canCreate = can('Crear-usuarios');
  const canEdit = can('Editar-usuarios');
  const canDelete = can('Eliminar-usuarios');

  /**
   * Fetch users from API
   */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      const data = response.data.data || response.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Users Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch roles from API
   */
  const fetchRoles = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const t = new Date().getTime();
      const response = await axios.get(`${ROLES_ENDPOINT}?t=${t}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setRoles(response.data);
    } catch (error) {
      console.error("Fetch Roles Error:", error);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (user: User | null = null) => {
    setEditingUser(user);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        password_confirmation: '',
        comments: user.comments || '',
        role: user.roles && user.roles.length > 0 ? user.roles[0].name : ''
      });
    } else {
      setFormData({
        name: '', email: '', phone: '', password: '', password_confirmation: '', comments: '', role: ''
      });
    }
    setModalVisible(true);
  };

  /**
   * Saves or Updates user data
   */
  const handleSave = async () => {
    if (!formData.name || !formData.email || (!editingUser && !formData.password) || !formData.role) {
      Alert.alert('Atención', 'Por favor completa los campos obligatorios (*)');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      };

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        comments: formData.comments,
        roles: [formData.role],
        ...(formData.password ? { password: formData.password, password_confirmation: formData.password_confirmation } : {})
      };

      if (editingUser) {
        await axios.put(`${ENDPOINT}/${editingUser.id}`, payload, config);
        Alert.alert('Éxito', 'Residente actualizado exitosamente.');
      } else {
        await axios.post(ENDPOINT, payload, config);
        Alert.alert('Éxito', 'Residente creado exitosamente.');
      }

      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al guardar el residente.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles Deactivation or Reactivation (Restore)
   */
  const toggleStatus = (user: User) => {
    const isInactive = !!user.deleted_at;

    Alert.alert(
      isInactive ? 'Confirmar Reactivación' : 'Confirmar Baja',
      `¿Deseas ${isInactive ? 'reactivar' : 'dar de baja'} a ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: isInactive ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };

              if (isInactive) {
                // Restore (POST) - Mirroring your Web logic
                await axios.post(`${ENDPOINT}/restore/${user.id}`, {}, config);
                Alert.alert('Éxito', 'Residente reactivado correctamente.');
              } else {
                // Deactivate (DELETE)
                await axios.delete(`${ENDPOINT}/${user.id}`, config);
                Alert.alert('Éxito', 'Residente dado de baja.');
              }
              fetchUsers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cambiar el estado del residente.');
            }
          }
        }
      ]
    );
  };

  if (!isReady) {
    return <ActivityIndicator size="large" color="#28a745" style={{ flex: 1 }} />;
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar residente..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
        {canCreate && (
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
            <IconSymbol name="person.badge.plus.fill" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.userItem, item.deleted_at && styles.inactiveItem]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.userName}>{item.name}</ThemedText>
                <ThemedText style={styles.userSub}>{item.email}</ThemedText>

                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: item.deleted_at ? '#ff4444' : '#28a745' }]}>
                    <ThemedText style={styles.badgeText}>
                      {item.deleted_at ? 'Inactivo' : 'Activo'}
                    </ThemedText>
                  </View>
                  {item.roles?.map((r, idx) => (
                    <View key={idx} style={[styles.badge, { backgroundColor: '#007AFF', marginLeft: 5 }]}>
                      <ThemedText style={styles.badgeText}>{r.name}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.actionRow}>
                {canEdit && !item.deleted_at && (
                  <TouchableOpacity onPress={() => openModal(item)}>
                    <IconSymbol name="pencil" size={22} color="#007AFF" />
                  </TouchableOpacity>
                )}

                {canDelete && (
                  <TouchableOpacity onPress={() => toggleStatus(item)}>
                    <IconSymbol
                      name={item.deleted_at ? "arrow.counterclockwise" : "trash"}
                      size={22}
                      color={item.deleted_at ? '#28a745' : '#ff4444'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* --- MODAL --- */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', alignItems: 'center' }}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
                    {editingUser ? 'Editar Residente' : 'Nuevo Residente'}
                  </ThemedText>
                  
                  <ThemedText style={styles.labelSmall}>Nombre Completo *</ThemedText>
                  <TextInput style={styles.modalInput} value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder="Juan Pérez" />

                  <ThemedText style={styles.labelSmall}>Correo Electrónico *</ThemedText>
                  <TextInput style={styles.modalInput} value={formData.email} onChangeText={(v) => setFormData({ ...formData, email: v })} keyboardType="email-address" autoCapitalize="none" placeholder="correo@ejemplo.com" />

                  <ThemedText style={styles.labelSmall}>Teléfono</ThemedText>
                  <TextInput style={styles.modalInput} value={formData.phone} onChangeText={(v) => setFormData({ ...formData, phone: v })} keyboardType="phone-pad" placeholder="10 dígitos" />

                  <ThemedText style={styles.labelSmall}>Role *</ThemedText>
                  <View style={styles.rolePickerRow}>
                    {roles.map((r) => (
                      <TouchableOpacity key={r.id} style={[styles.roleChip, formData.role === r.name && styles.roleChipActive]} onPress={() => setFormData({ ...formData, role: r.name })}>
                        <ThemedText style={[styles.roleChipText, formData.role === r.name && { color: 'white' }]}>{r.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <ThemedText style={styles.labelSmall}>Comentarios</ThemedText>
                  <TextInput style={[styles.modalInput, styles.textArea]} value={formData.comments} onChangeText={(v) => setFormData({ ...formData, comments: v })} multiline placeholder="Notas internas..." />

                  <View style={styles.passwordSection}>
                    <ThemedText style={styles.labelSmall}>{editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña *'}</ThemedText>
                    <TextInput style={styles.modalInput} value={formData.password} onChangeText={(v) => setFormData({ ...formData, password: v })} secureTextEntry placeholder="********" />
                    <ThemedText style={styles.labelSmall}>Confirmar Contraseña *</ThemedText>
                    <TextInput style={styles.modalInput} value={formData.password_confirmation} onChangeText={(v) => setFormData({ ...formData, password_confirmation: v })} secureTextEntry placeholder="********" />
                  </View>
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><ThemedText style={styles.cancelLabel}>Cancelar</ThemedText></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="white" /> : <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>}
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
  userItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  inactiveItem: { backgroundColor: '#fff5f5' },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userSub: { fontSize: 13, color: '#666' },
  actionRow: { flexDirection: 'row', gap: 20, marginLeft: 10 },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, width: '100%', maxHeight: '90%', overflow: 'hidden' },
  modalBody: { paddingHorizontal: 25, paddingTop: 25 },
  labelSmall: { fontSize: 11, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 20, fontSize: 15, paddingVertical: 5, color: '#333' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  passwordSection: { marginTop: 10, backgroundColor: '#fdfdfd', padding: 10, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#eee' },
  rolePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10, marginBottom: 20 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#007AFF' },
  roleChipActive: { backgroundColor: '#007AFF' },
  roleChipText: { fontSize: 12, color: '#007AFF' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, padding: 25, backgroundColor: '#f9f9f9', borderTopWidth: 1, borderTopColor: '#eee' },
  cancelBtn: { padding: 10 },
  cancelLabel: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 100, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});