import React, { useState, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, TextInput, ActivityIndicator, RefreshControl, DeviceEventEmitter, useColorScheme } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';

// Corrected relative path to reach src/api/axios from app/(drawer)/(tabs)/chat/
import { API_BASE } from '../../../src/api/axios'; 

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

/**
 * ChatContactsScreen Component
 * Displays a list of available contacts and their unread message counts.
 * Supports Light and Dark modes.
 */
export default function ChatContactsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  
  const isFocusedRef = useRef(false);
  const fetchTimeoutRef = useRef(null);

  /**
   * Fetches contact list with unread message counts from the server.
   * Handles errors related to network or authentication.
   */
  const fetchContacts = async (silent = false) => {
    if (!silent) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // GET request using centralized dynamic URL
      const res = await axios.get(`${API_BASE}/chat/contacts`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json' 
        },
        timeout: 5000 // Added timeout to prevent infinite hang
      });

      const usersData = res.data.users?.data || res.data.users || [];
      setContacts(usersData);
      
    } catch (e) {
      // Diagnostic log for the Network Error
      console.error("Fetch Contacts Error:", e.message);
      console.error("Attempted URL:", `${API_BASE}/chat/contacts`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Screen focus effect to refresh data and handle real-time message events.
   */
  useFocusEffect(
    React.useCallback(() => {
      isFocusedRef.current = true;
      
      // Refresh contact list when screen comes into focus
      fetchContacts(false);
      
      // Listen for global 'new-message-received' events to update badges
      const msgListener = DeviceEventEmitter.addListener('new-message-received', (e) => {
        if (!isFocusedRef.current) return;
        
        // Debounce contact list refresh to avoid multiple API calls
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        
        fetchTimeoutRef.current = setTimeout(() => {
          fetchContacts(true);
        }, 1000);
      });

      // Clear badges when another screen signals that messages were read
      const readListener = DeviceEventEmitter.addListener('chat-messages-read', () => {
        if (isFocusedRef.current) fetchContacts(true);
      });

      return () => {
        isFocusedRef.current = false;
        msgListener.remove();
        readListener.remove();
        
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = null;
        }
      };
    }, [])
  );

  // Filter contacts based on search input
  const filtered = contacts.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ThemedView style={{ flex: 1 }}>
      {/* Search Input Section */}
      <View style={[styles.searchBox, { backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0' }]}>
        <IconSymbol name="magnifyingglass" size={20} color={isDark ? '#8e8e93' : '#666'} />
        <TextInput
          style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
          placeholder="Search contacts..."
          placeholderTextColor={isDark ? '#8e8e93' : '#999'}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#007bff" />
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
              tintColor="#007bff"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { borderBottomColor: isDark ? '#38383a' : '#eee' }]}
              onPress={() =>
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: item.id, name: item.name }
                })
              }
            >
              {/* Profile Avatar with First Letter */}
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {item.name?.charAt(0)}
                </ThemedText>
              </View>
              
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.name}>{item.name}</ThemedText>
                <ThemedText style={[styles.email, { color: isDark ? '#8e8e93' : '#888' }]}>
                  {item.email}
                </ThemedText>
              </View>
              
              {/* Unread Message Badge Indicator */}
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
    margin: 15, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    height: 45 
  },
  input: { 
    flex: 1, 
    marginLeft: 10, 
    fontSize: 16 
  },
  item: { 
    flexDirection: 'row', 
    padding: 15, 
    borderBottomWidth: 1, 
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
    fontWeight: 'bold' 
  },
  email: { 
    fontSize: 13 
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