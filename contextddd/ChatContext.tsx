import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatContext = createContext<any>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const isChatActive = useRef(false);
  const activeChatId = useRef<number | null>(null);
  const processedMsgIds = useRef(new Set());
  
  // Bloqueo para evitar que la API pise al socket inmediatamente
  const apiLock = useRef<Record<number, number>>({});

  const totalUnread = Object.values(unreadMap).reduce((sum, val) => sum + val, 0);

  useEffect(() => {
    const loadPersisted = async () => {
      const saved = await AsyncStorage.getItem('chat_unread_map');
      if (saved) setUnreadMap(JSON.parse(saved));
    };
    loadPersisted();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('chat_unread_map', JSON.stringify(unreadMap));
  }, [unreadMap]);

  const updateMapFromAPI = (contacts: any[]) => {
    setUnreadMap(prev => {
      const newMap = { ...prev };
      const now = Date.now();

      contacts.forEach(c => {
        const id = Number(c.id);
        const serverCount = Number(c.unread_count || 0);

        if (isChatActive.current && Number(activeChatId.current) === id) {
          newMap[id] = 0;
        } else {
          // Si hubo un mensaje de socket hace menos de 5 segundos, ignoramos el 0 de la API
          const isLocked = apiLock.current[id] && (now - apiLock.current[id] < 5000);
          
          if (isLocked) {
            newMap[id] = Math.max(prev[id] || 0, serverCount);
          } else {
            newMap[id] = serverCount;
          }
        }
      });
      return newMap;
    });
  };

  useEffect(() => {
    const msgSub = DeviceEventEmitter.addListener('new-message-received', (e) => {
      const msg = e.message || e;
      const senderId = Number(msg.sender_id);
      const msgId = msg.id;

      if (msgId && processedMsgIds.current.has(msgId)) return;
      if (msgId) processedMsgIds.current.add(msgId);
      
      if (isChatActive.current && Number(activeChatId.current) === senderId) return;

      // Activamos el bloqueo para este sender
      apiLock.current[senderId] = Date.now();

      setUnreadMap(prev => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1
      }));
    });

    const readSub = DeviceEventEmitter.addListener('chat-messages-read', (data) => {
      const id = Number(data?.sender_id || activeChatId.current);
      if (id) {
        delete apiLock.current[id];
        setUnreadMap(prev => ({ ...prev, [id]: 0 }));
      }
    });

    const activeSub = DeviceEventEmitter.addListener('chat-active', (data) => {
      isChatActive.current = data.active;
      activeChatId.current = data.id ? Number(data.id) : null;
      if (data.active && data.id) {
        delete apiLock.current[Number(data.id)];
        setUnreadMap(prev => ({ ...prev, [Number(data.id)]: 0 }));
      }
    });

    return () => {
      msgSub.remove();
      readSub.remove();
      activeSub.remove();
    };
  }, []);

  return (
    <ChatContext.Provider value={{ unreadMap, totalUnread, updateMapFromAPI }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);