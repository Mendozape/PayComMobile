import React, { useState, useEffect, useRef } from 'react';
import { 
  DeviceEventEmitter, 
  StyleSheet, 
  View, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getEcho, initEcho } from '@/services/echo';

const API_BASE = 'http://192.168.1.16:8000/api/chat';

/**
 * ChatDetailScreen Component
 * Manages 1-on-1 conversations with real-time support.
 */
export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);

  const getChannelName = (id1: number, id2: number) => {
    const ids = [Number(id1), Number(id2)].sort((a, b) => a - b);
    return `chat.${ids.join('.')}`;
  };

  useEffect(() => {
    // Crucial: Set chat as active globally to reset badges
    DeviceEventEmitter.emit('chat-active', true);
    
    return () => {
      DeviceEventEmitter.emit('chat-active', false);
    };
  }, []);

  useEffect(() => {
    let retryInterval: any;

    const start = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        const parsedUser = userData ? JSON.parse(userData) : null;
        if (!parsedUser || !id) return;
        setCurrentUser(parsedUser);

        await fetchMessages();

        const channelName = getChannelName(parsedUser.id, Number(id));
        
        retryInterval = setInterval(async () => {
          let echo = getEcho();
          if (!echo) echo = await initEcho();

          if (echo && echo.connector.pusher.connection.state === 'connected') {
            clearInterval(retryInterval);
            console.log(`📡 [CHAT] Subscribing to: ${channelName}`);
            
            channelRef.current = echo.private(channelName);

            // Incoming messages
            channelRef.current.listen('.MessageSent', (e: any) => {
              if (Number(e.message.sender_id) === Number(id)) {
                // Acknowledge read status immediately
                markAsReadLocally();
                setMessages(prev => [e.message, ...prev]);
                setIsOtherTyping(false); 
              }
            });

            // Remote read receipts
            channelRef.current.listen('.MessageRead', (e: any) => {
              if (Number(e.reader_id) === Number(id)) {
                setMessages(prev => prev.map(m => ({
                  ...m,
                  read_at: m.read_at || new Date().toISOString()
                })));
              }
            });

            // Typing indicators
            channelRef.current.listen('.UserTyping', (e: any) => {
              if (Number(e.sender_id) === Number(id)) {
                setIsOtherTyping(true);
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
              }
            });
          }
        }, 500);

      } catch (e) {
        console.error('❌ [CHAT] Initialization error:', e);
      } finally {
        setLoading(false);
      }
    };

    start();

    return () => {
      if (retryInterval) clearInterval(retryInterval);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (channelRef.current) {
        channelRef.current.stopListening('.MessageSent');
        channelRef.current.stopListening('.MessageRead');
        channelRef.current.stopListening('.UserTyping');
        channelRef.current = null;
      }
    };
  }, [id]);

  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_BASE}/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data.messages.reverse());
      await markAsReadLocally();
    } catch (e) {
      console.error('Fetch history error:', e);
    }
  };

  const markAsReadLocally = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await axios.post(`${API_BASE}/mark-as-read`, { sender_id: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Notify Layout to refresh global counts
      DeviceEventEmitter.emit('chat-messages-read');
    } catch (e) {}
  };

  const handleTyping = (text: string) => {
    setMessage(text);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      AsyncStorage.getItem('userToken').then(token => {
        axios.post(`${API_BASE}/typing`, { receiver_id: id }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      });
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage('');

    const tempMsg = { 
      id: Date.now(), 
      sender_id: currentUser?.id, 
      receiver_id: Number(id), 
      content, 
      created_at: new Date().toISOString(), 
      read_at: null 
    };
    setMessages(prev => [tempMsg, ...prev]);

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${API_BASE}/send`, { receiver_id: id, content }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? response.data.message : m));
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      Alert.alert("Error", "No se pudo enviar el mensaje.");
    }
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} color="#28a745" />;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: name as string || 'Chat', headerShown: true }} />
      <FlatList
        data={messages}
        inverted
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isMe = Number(item.sender_id) === Number(currentUser?.id);
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <ThemedText style={styles.text}>{item.content}</ThemedText>
              <View style={styles.statusRow}>
                <ThemedText style={styles.time}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </ThemedText>
                {isMe && (
                  <ThemedText style={[styles.check, item.read_at && { color: '#34B7F1' }]}>
                    {item.read_at ? ' ✓✓' : ' ✓'}
                  </ThemedText>
                )}
              </View>
            </View>
          );
        }}
      />
      {isOtherTyping && (
        <View style={styles.typingContainer}>
          <ThemedText style={styles.typingText}>{name} está escribiendo...</ThemedText>
        </View>
      )}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputArea, { paddingBottom: Platform.OS === 'ios' ? 35 : 15 }]}>
          <TextInput 
            style={styles.input} 
            value={message} 
            onChangeText={handleTyping} 
            placeholder="Escribe un mensaje..." 
            multiline 
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={!message.trim()}>
            <IconSymbol name="paperplane.fill" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: { padding: 12, borderRadius: 15, marginVertical: 4, marginHorizontal: 15, maxWidth: '80%' },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#dcf8c6', borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
  text: { fontSize: 15, color: '#000' },
  statusRow: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 2 },
  time: { fontSize: 10, color: '#666' },
  check: { fontSize: 12, marginLeft: 3, fontWeight: 'bold' },
  typingContainer: { paddingHorizontal: 20, paddingVertical: 5 },
  typingText: { fontSize: 12, color: '#888', fontStyle: 'italic' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, minHeight: 40, color: '#000', paddingTop: 8, fontSize: 16 },
  sendBtn: { backgroundColor: '#28a745', width: 40, height: 40, borderRadius: 20, marginLeft: 10, justifyContent: 'center', alignItems: 'center' }
});