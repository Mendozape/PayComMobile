import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { disconnectEcho } from '@/services/echo'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * CustomDrawerContent
 * Renders the drawer menu with user profile and navigation items.
 * UI labels are in Spanish.
 */
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    // Load session data from local storage
    AsyncStorage.getItem('userData').then(d => d && setUser(JSON.parse(d)));
    AsyncStorage.getItem('userProfilePhoto').then(p => p && setUserPhoto(p));
  }, []);

  const { can } = usePermission(user);

  /**
   * Clears session data and disconnects WebSocket.
   */
  const handleLogout = async () => {
    disconnectEcho();
    await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
    router.replace('/');
  };

  /**
   * Navigates to home tab and closes drawer.
   */
  const handleGoHome = () => {
    props.navigation.closeDrawer();
    router.replace('/(drawer)/(tabs)/home');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* User Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <IconSymbol name="person.circle.fill" size={50} color="#007bff" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.uName} numberOfLines={1}>
            {user?.name || 'Usuario'}
          </ThemedText>
          <ThemedText style={styles.uRole}>{user?.role_name || 'Residente'}</ThemedText>
        </View>
      </View>

      <View style={styles.divider} />
      
      {/* Navigation Menu Items */}
      <DrawerItem 
        label="Inicio" 
        labelStyle={styles.lbl} 
        icon={({ color }) => <IconSymbol name="house.fill" size={22} color={color} />} 
        onPress={handleGoHome} 
      />

      {can('Ver-usuarios') && (
        <DrawerItem 
          label="Residentes" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="person.2.fill" size={22} color={color} />} 
          onPress={() => router.push('/residents')} 
        />
      )}
      
      {can('Ver-roles') && (
        <DrawerItem 
          label="Roles" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="lock.fill" size={22} color={color} />} 
          onPress={() => router.push('/roles')} 
        />
      )}
      
      {can('Ver-permisos') && (
        <DrawerItem 
          label="Permisos" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="key.fill" size={22} color={color} />} 
          onPress={() => router.push('/permissions')} 
        />
      )}
      
      {can('Ver-calles') && (
        <DrawerItem 
          label="Calles" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="map.fill" size={22} color={color} />} 
          onPress={() => router.push('/streets')} 
        />
      )}
      
      {can('Ver-cuotas') && (
        <DrawerItem 
          label="Cuotas" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="cash.fill" size={22} color={color} />} 
          onPress={() => router.push('/fees')} 
        />
      )}
      
      {can('Ver-catalogo-gastos') && (
        <DrawerItem 
          label="Categorías" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="tags.fill" size={22} color={color} />} 
          onPress={() => router.push('/expense-categories')} 
        />
      )}
      
      {can('Ver-gastos') && (
        <DrawerItem 
          label="Gastos" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="creditcard.fill" size={22} color={color} />} 
          onPress={() => router.push('/expenses')} 
        />
      )}
      
      {can('Ver-predios') && (
        <DrawerItem 
          label="Predios" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="location.fill" size={22} color={color} />} 
          onPress={() => router.push('/addresses')} 
        />
      )}
      
      {can('Ver-estado-cuenta') && (
        <DrawerItem 
          label="Edo. Cuenta" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="doc.text.fill" size={22} color={color} />} 
          onPress={() => router.push('/statement')} 
        />
      )}
      
      {can('Reportes') && (
        <DrawerItem 
          label="Reportes" 
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={color} />} 
          onPress={() => router.push('/reports')} 
        />
      )}

      <View style={{ flex: 1 }} />

      {/* Logout Button (Footer) */}
      <View style={[styles.footer, { marginBottom: Math.max(insets.bottom, 40) }]}>
        <View style={styles.fDiv} />
        <DrawerItem 
          label="Cerrar Sesión" 
          labelStyle={styles.lOut} 
          icon={() => <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#ff4444" />} 
          onPress={handleLogout} 
        />
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer 
      drawerContent={(props) => <CustomDrawerContent {...props} />} 
      screenOptions={{ headerShown: false, drawerActiveTintColor: '#007bff' }}
    >
      <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uName: { fontWeight: 'bold', fontSize: 16 },
  uRole: { fontSize: 13, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  lbl: { fontSize: 14, marginLeft: -10 },
  footer: { paddingHorizontal: 20 },
  fDiv: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  lOut: { color: '#ff4444', fontWeight: 'bold' }
});