import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { disconnectEcho } from '@/services/echo'; 

/**
 * CustomDrawerContent Component
 * Renders the sidebar with user info and dynamic administrative links.
 */
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [userDataJson, photo] = await Promise.all([
          AsyncStorage.getItem('userData'),
          AsyncStorage.getItem('userProfilePhoto')
        ]);

        if (userDataJson) {
          const parsedUser = JSON.parse(userDataJson);
          setUser(parsedUser);
          props.navigation.setParams({ user: parsedUser });
        }

        if (photo) setUserPhoto(photo);
      } catch (e) {
        // Silent error to keep console clean
      }
    };

    loadUserData();
  }, []);

  // Use the hook to determine menu visibility
  const { can } = usePermission(user);

  /**
   * Safe logout process.
   * Clears Echo connection and local session data.
   */
  const handleLogout = async () => {
    try {
      disconnectEcho();
      await AsyncStorage.multiRemove([
        'isLoggedIn',
        'userToken',
        'userProfilePhoto',
        'userData'
      ]);
      router.replace('/');
    } catch (e) {
      console.error('Drawer: Logout error');
    }
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
          ) : (
            <IconSymbol name="person.circle.fill" size={50} color="#007bff" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.userName} numberOfLines={1}>
            {user?.name || 'User'}
          </ThemedText>
          <ThemedText style={styles.userRole}>
            {user?.role_name || 'Resident'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.divider} />
      
      <DrawerItemList {...props} />

      {/* Admin Menu Items */}
      {can('Ver-usuarios') && (
        <DrawerItem label="Residentes" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="person.2.fill" size={22} color={color} />}
          onPress={() => router.push('/residents')}
        />
      )}

      {can('Ver-roles') && (
        <DrawerItem label="Roles" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="lock.fill" size={22} color={color} />}
          onPress={() => router.push('/roles')}
        />
      )}

      {can('Ver-permisos') && (
        <DrawerItem label="Permisos" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="key.fill" size={22} color={color} />}
          onPress={() => router.push('/permissions')}
        />
      )}

      {can('Ver-calles') && (
        <DrawerItem label="Calles" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="map.fill" size={22} color={color} />}
          onPress={() => router.push('/streets')}
        />
      )}

      {can('Ver-cuotas') && (
        <DrawerItem label="Cuotas" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="cash.fill" size={22} color={color} />}
          onPress={() => router.push('/fees')}
        />
      )}

      {can('Ver-catalogo-gastos') && (
        <DrawerItem label="Categorías de Gastos" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="tags.fill" size={22} color={color} />}
          onPress={() => router.push('/expense-categories')}
        />
      )}

      {can('Ver-gastos') && (
        <DrawerItem label="Control de Gastos" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="creditcard.fill" size={22} color={color} />}
          onPress={() => router.push('/expenses')}
        />
      )}

      {can('Ver-predios') && (
        <DrawerItem label="Predios (Catálogo)" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="location.fill" size={22} color={color} />}
          onPress={() => router.push('/addresses')}
        />
      )}

      {can('Ver-estado-cuenta') && (
        <DrawerItem label="Estado de Cuenta" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="doc.text.fill" size={22} color={color} />}
          onPress={() => router.push('/statement')}
        />
      )}

      {can('Reportes') && (
        <DrawerItem label="Reportes de Sistema" labelStyle={styles.drawerLabel}
          icon={({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={color} />}
          onPress={() => router.push('/reports')}
        />
      )}

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <DrawerItem
          label="Cerrar Sesión"
          labelStyle={styles.logoutLabel}
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
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: '#007bff',
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: 'Inicio',
          drawerIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} />
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  userName: { fontWeight: 'bold', fontSize: 16 },
  userRole: { fontSize: 13, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  drawerLabel: { fontSize: 14, marginLeft: -10 },
  footer: { padding: 20, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  footerDivider: { height: 1, backgroundColor: '#eee', marginBottom: 10 },
  logoutLabel: { color: '#ff4444', fontWeight: 'bold' }
});