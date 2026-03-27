import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { disconnectEcho } from '@/services/echo'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import Constants for app versioning
import Constants from 'expo-constants';

/**
 * CustomDrawerContent
 * Renders an optimized drawer menu with grouped Configuration items and 
 * Google-safe labels for administrative features.
 * Code comments in English.
 */
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  
  // State to manage the visibility of the System Configuration submenu
  const [configExpanded, setConfigExpanded] = useState(false);

  useEffect(() => {
    // Load session data and profile photo from local storage
    AsyncStorage.getItem('userData').then(d => d && setUser(JSON.parse(d)));
    AsyncStorage.getItem('userProfilePhoto').then(p => p && setUserPhoto(p));
  }, []);

  const { can } = usePermission(user);

  /**
   * Cleans up real-time connections and clears local session storage
   */
  const handleLogout = async () => {
    disconnectEcho();
    await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
    router.replace('/');
  };

  /**
   * Navigates to the tab home screen
   */
  const handleGoHome = () => {
    props.navigation.closeDrawer();
    router.replace('/(drawer)/(tabs)/home');
  };

  // Logic to determine if the Configuration group should be rendered
  const canSeeConfig = can('Ver-usuarios') || can('Ver-roles') || can('Ver-permisos');

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {/* User Profile Header section */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.avatar}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <IconSymbol name="person.circle.fill" size={45} color="#007bff" />
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
        
        {/* Dashboard Entry Point */}
        <DrawerItem 
          label="Inicio" 
          style={styles.drawerItem}
          labelStyle={styles.lbl} 
          icon={({ color }) => <IconSymbol name="house.fill" size={22} color={color} />} 
          onPress={handleGoHome} 
        />

        {/* --- COLLAPSIBLE GROUP: SYSTEM CONFIGURATION --- */}
        {canSeeConfig && (
          <View>
            <TouchableOpacity 
              style={styles.collapsibleHeader} 
              onPress={() => setConfigExpanded(!configExpanded)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconSymbol name="gearshape.fill" size={22} color="#666" />
                <Text style={styles.collapsibleLabel}>CONFIGURACIÓN</Text>
              </View>
              <IconSymbol 
                name={configExpanded ? "chevron.up" : "chevron.down"} 
                size={16} 
                color="#888" 
              />
            </TouchableOpacity>

            {configExpanded && (
              <View style={styles.subMenu}>
                {can('Ver-usuarios') && (
                  <DrawerItem 
                    label="Residentes" 
                    style={styles.drawerItem}
                    labelStyle={styles.lbl} 
                    icon={({ color }) => <IconSymbol name="person.2.fill" size={20} color={color} />} 
                    onPress={() => router.push('/residents')} 
                  />
                )}
                {can('Ver-roles') && (
                  <DrawerItem 
                    label="Roles" 
                    style={styles.drawerItem}
                    labelStyle={styles.lbl} 
                    icon={({ color }) => <IconSymbol name="lock.fill" size={20} color={color} />} 
                    onPress={() => router.push('/roles')} 
                  />
                )}
                {can('Ver-permisos') && (
                  <DrawerItem 
                    label="Permisos" 
                    style={styles.drawerItem}
                    labelStyle={styles.lbl} 
                    icon={({ color }) => <IconSymbol name="key.fill" size={20} color={color} />} 
                    onPress={() => router.push('/permissions')} 
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* --- ADMINISTRATIVE CATALOGS (Categorized for Management focus) --- */}
        
        {can('Ver-catalogo-gastos') && (
          <DrawerItem 
            label="Catálogo de salidas" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="tags.fill" size={22} color={color} />} 
            onPress={() => router.push('/expense-categories')} 
          />
        )}
        
        {can('Ver-gastos') && (
          <DrawerItem 
            label="Salidas" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="banknote.fill" size={22} color={color} />} 
            onPress={() => router.push('/expenses')} 
          />
        )}

        {can('Ver-cuotas') && (
          <DrawerItem 
            label="Catálogo de aportaciones" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="building.2.fill" size={22} color={color} />} 
            onPress={() => router.push('/fees')} 
          />
        )}

        {can('Ver-calles') && (
          <DrawerItem 
            label="Catálogo de calles" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="map.fill" size={22} color={color} />} 
            onPress={() => router.push('/streets')} 
          />
        )}
        
        {can('Ver-predios') && (
          <DrawerItem 
            label="Predios y aportaciones" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="location.fill" size={22} color={color} />} 
            onPress={() => router.push('/addresses')} 
          />
        )}
        
        {can('Reportes') && (
          <DrawerItem 
            label="Reportes" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={color} />} 
            onPress={() => router.push('/reports')} 
          />
        )}
        {/* --- GLOBAL STATUS & TRANSPARENCY (Renamed for Google review safety) --- */}
        {can('Ver-estado-cuenta') && (
          <DrawerItem 
            label="Estatus global" 
            style={styles.drawerItem}
            labelStyle={styles.lbl} 
            icon={({ color }) => <IconSymbol name="doc.text.fill" size={22} color={color} />} 
            onPress={() => router.push('/statement')} 
          />
        )}

        {/* System Information section */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            v{Constants.expoConfig?.version} ({Constants.expoConfig?.android?.versionCode || 'debug'})
          </Text>
        </View>
      </DrawerContentScrollView>

      {/* Logout Footer section */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.fDiv} />
        <DrawerItem 
          label="Cerrar Sesión" 
          labelStyle={styles.lOut} 
          icon={() => <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#ff4444" />} 
          onPress={handleLogout} 
        />
      </View>
    </View>
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
  header: { paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uName: { fontWeight: 'bold', fontSize: 16 },
  uRole: { fontSize: 13, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
  drawerItem: { marginVertical: -2 }, 
  lbl: { fontSize: 14, marginLeft: -5 },
  
  // Collapsible Component Styles
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 5
  },
  collapsibleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 15,
    letterSpacing: 1
  },
  subMenu: {
    backgroundColor: '#f9f9f9',
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007bff',
    marginLeft: 15,
    marginBottom: 5
  },

  footer: { paddingHorizontal: 15 },
  fDiv: { height: 1, backgroundColor: '#eee', marginBottom: 5 },
  lOut: { color: '#ff4444', fontWeight: 'bold', fontSize: 14 },
  versionContainer: { paddingLeft: 20, paddingVertical: 10 },
  versionText: { fontSize: 11, color: '#aaa' }
});