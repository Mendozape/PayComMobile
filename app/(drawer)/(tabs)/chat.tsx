// app/(drawer)/(tabs)/chat/contacts.tsx

import React, { useState, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ActivityIndicator, RefreshControl, DeviceEventEmitter } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ChatContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  const isFocusedRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetches contact list with unread message counts from server.
   */
  const fetchContacts = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await axios.get(`http://192.168.1.16:8000/api/chat/contacts`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json' 
        }
      });

      const usersData = res.data.users?.data || res.data.users || [];
      setContacts(usersData);
      
    } catch (e) {
      // Fetch failed silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      
      // Fetch fresh contact list when screen focuses
      fetchContacts(false);
      
      // Listen for new messages to update contact badges
      const msgListener = DeviceEventEmitter.addListener('new-message-received', (e) => {
        if (!isFocusedRef.current) return;
        
        const senderId = e?.message?.sender_id || e?.sender_id;
        
        // Clear any pending fetch timeout
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        
        // Debounce contact list refresh
        fetchTimeoutRef.current = setTimeout(() => {
          fetchContacts(true);
        }, 1000);
      });

      return () => {
        isFocusedRef.current = false;
        msgListener.remove();
        
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
      };
    }, [])
  );

  const filtered = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={styles.searchBox}>
        <IconSymbol name="magnifyingglass" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Buscar contactos..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => `contact-${item.id}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchContacts(false);
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: item.id, name: item.name }
                })
              }
            >
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {item.name?.charAt(0)}
                </ThemedText>
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                <ThemedText style={styles.email}>{item.email}</ThemedText>
              </View>
              
              {/* Unread message badge */}
              {Number(item.unread_count) > 0 && (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>
                    {item.unread_count}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 15,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 45
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000'
  },
  item: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000'
  },
  email: {
    fontSize: 13,
    color: '#888'
  },
  badge: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold'
  }
});