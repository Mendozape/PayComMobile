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
  ScrollView,
  useColorScheme,
  Alert
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router'; 
import Toast from 'react-native-toast-message';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    comments: '',
    roleId: 0 
  });

  // ⚠️ Inline validation error state
  const [errors, setErrors] = useState<any>({});

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
    setErrors({});
    setEditingUser(user);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        password_confirmation: '',
        comments: user.comments || '',
        roleId: user.roles && user.roles.length > 0 ? user.roles[0].id : 0
      });
    } else {
      setFormData({
        name: '', email: '', phone: '', password: '', password_confirmation: '', comments: '', roleId: 0
      });
    }
    setModalVisible(true);
  };

  /**
   * Validation Logic
   */
  const validateForm = () => {
    let tempErrors: any = {};
    if (!formData.name.trim()) tempErrors.name = "El nombre es obligatorio.";
    if (!formData.email.trim()) tempErrors.email = "El correo es obligatorio.";
    if (!formData.roleId) tempErrors.roleId = "Debes seleccionar un rol.";
    
    if (!editingUser && !formData.password) {
      tempErrors.password = "La contraseña es obligatoria.";
    }
    
    if (formData.password && formData.password !== formData.password_confirmation) {
      tempErrors.password_confirmation = "Las contraseñas no coinciden.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  /**
   * Saves or Updates user data.
   */
  const handleSave = async () => {
    if (!validateForm()) return;

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
        roles: [formData.roleId],
        ...(formData.password ? { password: formData.password, password_confirmation: formData.password_confirmation } : {})
      };

      if (editingUser) {
        await axios.put(`${ENDPOINT}/${editingUser.id}`, payload, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Residente actualizado' });
      } else {
        await axios.post(ENDPOINT, payload, config);
        Toast.show({ type: 'success', text1: '¡Éxito!', text2: 'Residente creado' });
      }

      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al guardar.';
      setErrors({ server: msg });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Status change Alert
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
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const config = { headers: { Authorization: `Bearer ${token}` } };
              if (isInactive) {
                await axios.post(`${ENDPOINT}/restore/${user.id}`, {}, config);
              } else {
                await axios.delete(`${ENDPOINT}/${user.id}`, config);
              }
              fetchUsers();
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error' });
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerActions}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: isDark ? '#2c2c2e' : '#f2f2f2', color: isDark ? '#fff' : '#333' }]}
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
            <View style={[styles.userItem, { borderBottomColor: isDark ? '#333' : '#eee' }, item.deleted_at && styles.inactiveItem]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.userName}>{item.name}</ThemedText>
                <ThemedText style={[styles.userSub, { color: isDark ? '#8e8e93' : '#666' }]}>{item.email}</ThemedText>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: item.deleted_at ? '#ff4444' : '#28a745' }]}>
                    <ThemedText style={styles.badgeText}>{item.deleted_at ? 'Inactivo' : 'Activo'}</ThemedText>
                  </View>
                </View>
              </View>
              <View style={styles.actionRow}>
                {canEdit && !item.deleted_at && (
                  <TouchableOpacity onPress={() => openModal(item)}><IconSymbol name="pencil" size={22} color="#007AFF" /></TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => toggleStatus(item)}>
                    <IconSymbol name={item.deleted_at ? "arrow.counterclockwise" : "trash"} size={22} color={item.deleted_at ? '#28a745' : '#ff4444'} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            {/* ⚠️ KeyboardAvoidingView set to height or padding depends on platform */}
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={styles.keyboardView}
            >
              <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c1e' : 'white' }]}>
                {/* ⚠️ flex: 1 here allows the ScrollView to take available space and scroll properly */}
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  style={styles.scrollView}
                  contentContainerStyle={styles.modalBody}
                >
                  <ThemedText type="subtitle" style={{ marginBottom: 15 }}>{editingUser ? 'Editar Residente' : 'Nuevo Residente'}</ThemedText>
                  
                  {/* Name Field */}
                  <ThemedText style={[styles.labelSmall, errors.name && styles.errorLabel]}>Nombre Completo *</ThemedText>
                  <TextInput style={[styles.modalInput, errors.name && styles.inputError, { color: isDark ? '#fff' : '#333' }]} value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} />
                  {errors.name && <ThemedText style={styles.errorText}>{errors.name}</ThemedText>}

                  {/* Email Field */}
                  <ThemedText style={[styles.labelSmall, errors.email && styles.errorLabel]}>Correo Electrónico *</ThemedText>
                  <TextInput style={[styles.modalInput, errors.email && styles.inputError, { color: isDark ? '#fff' : '#333' }]} value={formData.email} onChangeText={(v) => setFormData({ ...formData, email: v })} keyboardType="email-address" autoCapitalize="none" />
                  {errors.email && <ThemedText style={styles.errorText}>{errors.email}</ThemedText>}

                  {/* Role Picker */}
                  <ThemedText style={[styles.labelSmall, errors.roleId && styles.errorLabel]}>Role *</ThemedText>
                  <View style={styles.rolePickerRow}>
                    {roles.map((r) => (
                      <TouchableOpacity key={r.id} style={[styles.roleChip, formData.roleId === r.id && styles.roleChipActive, errors.roleId && {borderColor: '#ff4444'}]} onPress={() => setFormData({ ...formData, roleId: r.id })}>
                        <ThemedText style={[styles.roleChipText, formData.roleId === r.id && { color: 'white' }]}>{r.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.roleId && <ThemedText style={styles.errorText}>{errors.roleId}</ThemedText>}

                  {/* Password Section */}
                  <View style={[styles.passwordSection, { backgroundColor: isDark ? '#2c2c2e' : '#fdfdfd', borderColor: errors.password || errors.password_confirmation ? '#ff4444' : (isDark ? '#444' : '#eee') }]}>
                    <ThemedText style={[styles.labelSmall, errors.password && styles.errorLabel]}>{editingUser ? 'Nueva Contraseña' : 'Contraseña *'}</ThemedText>
                    <TextInput style={[styles.modalInput, errors.password && styles.inputError, { color: isDark ? '#fff' : '#333' }]} value={formData.password} onChangeText={(v) => setFormData({ ...formData, password: v })} secureTextEntry />
                    {errors.password && <ThemedText style={styles.errorText}>{errors.password}</ThemedText>}

                    <ThemedText style={[styles.labelSmall, errors.password_confirmation && styles.errorLabel]}>Confirmar Contraseña *</ThemedText>
                    <TextInput style={[styles.modalInput, errors.password_confirmation && styles.inputError, { color: isDark ? '#fff' : '#333' }]} value={formData.password_confirmation} onChangeText={(v) => setFormData({ ...formData, password_confirmation: v })} secureTextEntry />
                    {errors.password_confirmation && <ThemedText style={styles.errorText}>{errors.password_confirmation}</ThemedText>}
                  </View>

                  {/* Server Error Message */}
                  {errors.server && <ThemedText style={styles.serverError}>{errors.server}</ThemedText>}
                </ScrollView>

                <View style={[styles.modalFooter, { backgroundColor: isDark ? '#1c1c1e' : '#f9f9f9', borderTopColor: isDark ? '#333' : '#eee' }]}>
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
  searchInput: { flex: 1, borderRadius: 10, padding: 12 },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 10, justifyContent: 'center' },
  userItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, alignItems: 'center' },
  inactiveItem: { opacity: 0.6 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userSub: { fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 20, marginLeft: 10 },
  badgeRow: { flexDirection: 'row', marginTop: 5 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // ⚠️ KEYBOARD VIEW FIX
  keyboardView: { width: '100%', justifyContent: 'center', alignItems: 'center', flex: 1 },

  // ⚠️ MODAL CONTENT FIX: max-height and flex: 1 to prevent shrinking
  modalContent: { borderRadius: 20, width: '100%', maxHeight: '90%', flexShrink: 1, overflow: 'hidden' },
  scrollView: { flexShrink: 1 },
  modalBody: { paddingHorizontal: 25, paddingTop: 25, paddingBottom: 20 },

  labelSmall: { fontSize: 11, color: '#888', fontWeight: 'bold', textTransform: 'uppercase' },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#28a745', marginBottom: 5, fontSize: 15, paddingVertical: 5 },
  passwordSection: { marginTop: 10, padding: 10, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1 },
  rolePickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#007AFF' },
  roleChipActive: { backgroundColor: '#007AFF' },
  roleChipText: { fontSize: 12, color: '#007AFF' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20, padding: 25, borderTopWidth: 1 },
  cancelBtn: { padding: 10 },
  cancelLabel: { color: '#666', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#28a745', minWidth: 100, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold' },
  inputError: { borderBottomColor: '#ff4444' },
  errorLabel: { color: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 11, marginBottom: 10, fontWeight: '500' },
  serverError: { color: '#ff4444', textAlign: 'center', marginTop: 15, fontWeight: 'bold' }
});