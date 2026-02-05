import React, { useState, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const CONTACTS_ENDPOINT = 'http://192.168.1.16:8000/api/chat/contacts';

export default function ChatContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  /**
   * Pure fetch from server.
   */
  const fetchContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await axios.get(CONTACTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      });
      setContacts(response.data.users.data || response.data.users || []);
    } catch (e) { 
      console.error("❌ [LIST] Fetch error"); 
    } finally { 
      setRefreshing(false);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchContacts();

      // Listener for real-time updates from TabLayout
      const messageSub = DeviceEventEmitter.addListener('new-message-received', fetchContacts);
      const readSub = DeviceEventEmitter.addListener('chat-messages-read', fetchContacts);

      return () => {
        messageSub.remove();
        readSub.remove();
      };
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchContacts();
  }, []);

  const handleSelectContact = (contact: any) => {
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread_count: 0 } : c));
    router.push({ pathname: "/chat/[id]", params: { id: contact.id, name: contact.name } });
  };

  const filteredContacts = React.useMemo(() => {
    return contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [contacts, search]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchBox}>
        <IconSymbol name="magnifyingglass" size={18} color="#888" />
        <TextInput style={styles.input} placeholder="Buscar contacto..." value={search} onChangeText={setSearch} placeholderTextColor="#888" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#28a745" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handleSelectContact(item)}>
              <View style={styles.avatar}><ThemedText style={styles.avatarText}>{item.name.charAt(0)}</ThemedText></View>
              <View style={styles.info}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                <ThemedText style={styles.sub} numberOfLines={1}>{item.email}</ThemedText>
              </View>
              {Number(item.unread_count) > 0 && (
                <View style={styles.badge}><ThemedText style={styles.badgeText}>{item.unread_count}</ThemedText></View>
              )}
              <IconSymbol name="chevron.right" size={16} color="#ccc" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', margin: 15, paddingHorizontal: 12, borderRadius: 10, height: 45 },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: '#000' },
  item: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007bff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  sub: { fontSize: 13, color: '#888' },
  badge: { backgroundColor: '#ff4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});