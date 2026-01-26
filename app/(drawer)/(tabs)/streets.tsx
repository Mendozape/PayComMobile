// app/(tabs)/streets.tsx
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, FlatList, TouchableOpacity, View, 
  TextInput, ActivityIndicator, Alert, Modal 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * 🛡️ TYPE DEFINITIONS
 * Matching your Laravel Street model structure
 */
interface Street {
  id: number;
  name: string;
  deleted_at: string | null;
}

const ENDPOINT = 'http://192.168.1.16:8000/api/streets';

export default function StreetsScreen() {
  // Use the interface for state safety
  const [streets, setStreets] = useState<Street[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingStreet, setEditingStreet] = useState<Street | null>(null);
  const [streetName, setStreetName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  /**
   * Fetch data from Laravel API
   */
  const fetchStreets = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(ENDPOINT, {
        headers: { 
            Authorization: `Bearer ${token}`, 
            Accept: 'application/json' 
        }
      });
      // Handle Laravel resource wrapper or direct array
      const data = response.data.data || response.data;
      setStreets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Streets Error:", error);
      Alert.alert("Connection Error", "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreets();
  }, []);

  const filteredStreets = streets.filter((s) => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (street: Street | null = null) => {
    setEditingStreet(street);
    setStreetName(street ? street.name : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!streetName.trim()) return;
    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const config = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
      
      if (editingStreet) {
        await axios.put(`${ENDPOINT}/${editingStreet.id}`, { name: streetName }, config);
      } else {
        await axios.post(ENDPOINT, { name: streetName }, config);
      }
      
      setModalVisible(false);
      fetchStreets();
    } catch (error) {
      Alert.alert("Error", "Failed to save the record.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerActions}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search street..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <IconSymbol name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredStreets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.streetItem}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.streetName}>{item.name}</ThemedText>
                <View style={[styles.badge, { backgroundColor: item.deleted_at ? '#ff4444' : '#28a745' }]}>
                  <ThemedText style={styles.badgeText}>{item.deleted_at ? 'Inactive' : 'Active'}</ThemedText>
                </View>
              </View>
              
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openModal(item)} disabled={!!item.deleted_at}>
                  <IconSymbol name="pencil" size={22} color={item.deleted_at ? "#ccc" : "#007AFF"} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL SECTION */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle">{editingStreet ? 'Edit' : 'New'} Street</ThemedText>
            <TextInput 
              style={styles.modalInput}
              value={streetName}
              onChangeText={setStreetName}
              placeholder="Enter name"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.cancelLabel}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <ThemedText style={styles.saveBtnText}>{isSaving ? '...' : 'Save'}</ThemedText>
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
  searchInput: { flex: 1, backgroundColor: '#f2f2f2', borderRadius: 10, padding: 12 },
  addButton: { backgroundColor: '#28a745', padding: 12, borderRadius: 10 },
  streetItem: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  streetName: { fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 15 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginTop: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalInput: { borderBottomWidth: 1, borderBottomColor: '#007AFF', marginVertical: 20, fontSize: 18 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  cancelLabel: { color: '#666' },
  saveBtn: { backgroundColor: '#28a745', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold' }
});