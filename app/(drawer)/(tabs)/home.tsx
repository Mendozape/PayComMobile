// HOME SCREEN - Main dashboard for the ComPay resident portal
import { StyleSheet, View } from 'react-native';

// Standard components with corrected paths for Expo
import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#1a1a1a', dark: '#000000' }}
      headerImage={
        <ThemedView style={styles.headerContent}>
            {/* Main brand title */}
            <ThemedText style={styles.headerTitle}>ComPay</ThemedText>
        </ThemedView>
      }>
      
      <ThemedView style={styles.welcomeContainer}>
        <ThemedView style={styles.titleRow}>
            {/* Resident greeting */}
            <ThemedText type="title">¡Hola Erasto!</ThemedText>
            <HelloWave />
        </ThemedView>
        <ThemedText style={styles.subtitle}>Bienvenido al portal de tu residencia</ThemedText>
      </ThemedView>

      <ThemedView style={styles.contentCard}>
        <ThemedText type="subtitle">Estado de Cuenta</ThemedText>
        <ThemedText style={styles.infoText}>
          Aquí podrás ver tus próximos pagos y adeudos registrados.
        </ThemedText>
        
        {/* Financial summary container with improved spacing to prevent text overlap */}
        <View style={styles.balanceContainer}>
            <ThemedText style={styles.balanceLabel}>Saldo Pendiente:</ThemedText>
            <ThemedText style={styles.balanceAmount}>$0.00</ThemedText>
        </View>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContent: { 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 40 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold', 
    letterSpacing: 1 
  },
  welcomeContainer: { 
    padding: 20, 
    gap: 4 
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  subtitle: { 
    fontSize: 16, 
    opacity: 0.7 
  },
  contentCard: { 
    margin: 20, 
    padding: 20, 
    borderRadius: 15, 
    backgroundColor: 'rgba(128, 128, 128, 0.1)', 
    gap: 12 
  },
  infoText: { 
    fontSize: 14, 
    lineHeight: 20 
  },
  balanceContainer: { 
    marginTop: 15, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    // Ensures enough space for the numbers at the bottom
    paddingBottom: 5 
  },
  balanceLabel: { 
    fontSize: 14, 
    fontWeight: '600',
    // Added margin to separate clearly from the number below
    marginBottom: 10 
  },
  balanceAmount: { 
    fontSize: 34, 
    fontWeight: 'bold', 
    color: '#4CAF50',
    // Increased lineHeight to prevent the font from being cut off vertically
    lineHeight: 40 
  }
});