import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { openStoreUrl } from '../../services/versionEnforcement';

/**
 * Full-screen gate: user cannot access the app until they update from the store.
 */
export default function ForceUpdateScreen({ currentVersion, minVersion, storeUrl }) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-download-outline" size={72} color="#2E7D32" />
      <Text style={styles.title}>Actualización obligatoria</Text>
      <Text style={styles.message}>
        Hay una versión más reciente en la tienda ({minVersion || 'nueva'}). Tu versión instalada es{' '}
        {currentVersion}. Actualiza para continuar.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => openStoreUrl(storeUrl)}
        activeOpacity={0.85}
      >
        <Ionicons
          name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google-playstore'}
          size={22}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.buttonText}>Ir a la tienda</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>
        Después de actualizar, abre la app de nuevo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginTop: 24,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    marginTop: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 13,
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
});
