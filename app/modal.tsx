import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// This is a template for modal screens (useful for pop-ups or quick details)
export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Este es un modal</ThemedText>
      
      {/* Note: This link currently points to '/', which is your Login. 
          In a real scenario, you would point this to a specific screen or just use a back button.
      */}
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Volver a la pantalla principal</ThemedText>
      </Link>
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
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});