// app/(drawer)/(tabs)/chat/[id].tsx

import React, { useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter, StyleSheet, View, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getEcho, initEcho } from '@/services/echo';

export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  const currentUserRef = useRef(null);
  const lastTypingSent = useRef(0);
  const typingTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const echoSetupDone = useRef(false);

  /**
   * Fetches messages and marks them as read on focus.
   * Critical: This ensures messages are always marked as read when user enters chat.
   */
  useFocusEffect(
    React.useCallback(() => {
      DeviceEventEmitter.emit('chat-active', true);
      
      // Fetch fresh messages every time screen focuses
      fetchMessages();
      
      return () => {
        DeviceEventEmitter.emit('chat-active', false);
      };
    }, [id])
  );

  useEffect(() => {
    let msgSub: any;

    const setup = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) currentUserRef.current = JSON.parse(userData);

      // Set up Echo channel only once to avoid duplicate listeners
      if (!echoSetupDone.current) {
        const echo = getEcho() || await initEcho();
        if (echo && currentUserRef.current) {
          const chatChannel = `chat.${[Number(currentUserRef.current.id), Number(id)].sort((a, b) => a - b).join('.')}`;

          channelRef.current = echo.private(chatChannel);

          // Listen for typing indicator
          channelRef.current
            .listen('.UserTyping', (e: any) => {
              if (Number(e.sender_id) === Number(id)) {
                setIsOtherTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
              }
            })
            // Listen for message read receipts
            .listen('.MessageRead', (e: any) => {
              if (Number(e.reader_id) === Number(id)) {
                setMessages(prev =>
                  prev.map(m => ({
                    ...m,
                    read_at: m.read_at || new Date().toISOString()
                  }))
                );
              }
            });
          
          echoSetupDone.current = true;
        }

        // Listen for new incoming messages
        msgSub = DeviceEventEmitter.addListener('new-message-received', (e: any) => {
          const senderId = e.message?.sender_id || e.sender_id;

          if (Number(senderId) === Number(id)) {
            setMessages(prev => {
              // Prevent duplicates
              if (prev.find(m => m.id === e.message.id)) return prev;
              return [e.message, ...prev];
            });
          }
        });
      }
    };

    setup();

    return () => {
      if (msgSub) msgSub.remove();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      const echo = getEcho();
      if (echo && channelRef.current) {
        echo.leave(channelRef.current.name);
        channelRef.current = null;
        echoSetupDone.current = false;
      }
    };
  }, [id]);

  /**
   * Handles text input changes and sends typing indicator.
   */
  const handleTextChange = (text: string) => {
    setMessage(text);

    const now = Date.now();
    // Throttle typing indicator to every 2.5 seconds
    if (now - lastTypingSent.current > 2500 && text.length > 0) {
      lastTypingSent.current = now;

      AsyncStorage.getItem('userToken').then(token => {
        axios.post('http://192.168.1.16:8000/api/chat/typing', 
          { receiver_id: id }, 
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      });
    }
  };

  /**
   * Fetches message history and automatically marks messages as read.
   * The backend endpoint handles the read status update.
   */
  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // This endpoint fetches messages AND marks them as read
      const res = await axios.get(`http://192.168.1.16:8000/api/chat/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(res.data.messages.reverse());
      setLoading(false);
      
    } catch (e) {
      setLoading(false);
    }
  };

  /**
   * Sends a new message to the chat.
   */
  const handleSend = async () => {
    if (!message.trim()) return;

    const content = message.trim();
    setMessage('');

    const token = await AsyncStorage.getItem('userToken');

    try {
      const res = await axios.post('http://192.168.1.16:8000/api/chat/send', 
        { receiver_id: id, content }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(prev => [res.data.message, ...prev]);
    } catch (e) {
      // Send failed silently
    }
  };

  if (loading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 10 }}>Cargando mensajes...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: String(name) }} />

        <FlatList
          inverted
          data={messages}
          keyExtractor={m => m.id.toString()}
          renderItem={({ item: m }) => {
            const isMe = Number(m.sender_id) === Number(currentUserRef.current?.id);
            return (
              <View style={[styles.msgWrap, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
                  <ThemedText>{m.content}</ThemedText>
                </View>
                <View style={styles.status}>
                  <ThemedText style={styles.time}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </ThemedText>
                  {/* Read receipt (single/double check) */}
                  {isMe && <ThemedText style={styles.check}>{m.read_at ? ' ✓✓' : ' ✓'}</ThemedText>}
                </View>
              </View>
            );
          }}
        />

        {/* Typing indicator */}
        {isOtherTyping && (
          <ThemedText style={styles.typingIndicator}>
            {name} está escribiendo...
          </ThemedText>
        )}

        {/* Message input area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={message}
            onChangeText={handleTextChange}
            multiline
          />
          <TouchableOpacity style={styles.send} onPress={handleSend}>
            <IconSymbol name="paperplane.fill" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  msgWrap: { width: '100%', paddingHorizontal: 12, marginVertical: 2 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, maxWidth: '85%' },
  myBubble: { backgroundColor: '#dcf8c6', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  status: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 11, color: '#6c757d' },
  check: { fontSize: 13, marginLeft: 4, fontWeight: 'bold', color: '#6c757d' },
  typingIndicator: { padding: 10, fontSize: 12, fontStyle: 'italic', color: '#666' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#dee2e6' },
  input: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 22, paddingHorizontal: 16, minHeight: 40, maxHeight: 100, fontSize: 16 },
  send: { backgroundColor: '#28a745', width: 44, height: 44, borderRadius: 22, marginLeft: 10, justifyContent: 'center', alignItems: 'center' }
});