import { Link, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * ModalScreen Component
 * A basic template for modal overlays. 
 * Ideal for displaying quick info, help text, or simple detail views.
 */
export default function ModalScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Información</ThemedText>
      
      <ThemedText style={styles.description}>
        Este es un espacio para detalles rápidos o notificaciones del sistema.
      </ThemedText>

      {/* CRITICAL: Changed link logic. 
        Using router.back() or dismissing the modal is safer than href="/",
        which could re-trigger the Root Index gatekeeper.
      */}
      <TouchableOpacity onPress={() => router.back()} style={styles.link}>
        <ThemedText type="link">Cerrar este mensaje</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  description: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  link: {
    marginTop: 20,
    paddingVertical: 15,
  },
});