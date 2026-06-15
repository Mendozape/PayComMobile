import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router'; // Added usePathname
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { disconnectEcho } from '@/services/echo';
import { unregisterPushTokenFromServer } from '@/services/pushNotifications'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Constants from 'expo-constants';
import * as Application from 'expo-application';

/**
 * CustomDrawerContent
 * Renders an optimized drawer menu with Active State feedback.
 */
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname(); // Get current route
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [user, setUser] = useState<any>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [configExpanded, setConfigExpanded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('userData').then(d => d && setUser(JSON.parse(d)));
    AsyncStorage.getItem('userProfilePhoto').then(p => p && setUserPhoto(p));
  }, []);

  const { can } = usePermission(user);

  const handleLogout = async () => {
    disconnectEcho();
    await unregisterPushTokenFromServer();
    await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
    router.replace('/');
  };

  /**
   * Helper to check if the route is active
   */
  const isActive = (route: string) => pathname.includes(route);

  const canSeeConfig = can('Ver-usuarios') || can('Ver-roles') || can('Ver-permisos');

  // Dynamic colors for feedback
  const activeBg = isDark ? 'rgba(0, 123, 255, 0.2)' : 'rgba(0, 123, 255, 0.1)';
  const activeColor = '#007bff';
  const dynamicTextColor = isDark ? '#ccc' : '#666';
  const dynamicDividerColor = isDark ? '#333' : '#eee';
  const dynamicSubMenuBg = isDark ? '#1a1a1a' : '#f9f9f9';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        
        {/* User Profile Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#222' : '#f0f0f0' }]}>
            {userPhoto ? (
              <Image source={{ uri: userPhoto }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <IconSymbol name="person.circle.fill" size={45} color={isDark ? "#555" : "#007bff"} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.uName} numberOfLines={1}>{user?.name || 'Usuario'}</ThemedText>
            <ThemedText style={[styles.uRole, { color: dynamicTextColor }]}>{user?.role_name || 'Residente'}</ThemedText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: dynamicDividerColor }]} />
        
        {/* Inicio */}
        <DrawerItem 
          label="Inicio" 
          focused={isActive('/home')}
          activeTintColor={activeColor}
          activeBackgroundColor={activeBg}
          style={styles.drawerItem}
          labelStyle={[styles.lbl, { color: isActive('/home') ? activeColor : (isDark ? '#fff' : '#333') }]} 
          icon={({ color }) => <IconSymbol name="house.fill" size={22} color={isActive('/home') ? activeColor : (isDark ? '#fff' : color)} />} 
          onPress={() => { props.navigation.closeDrawer(); router.replace('/(drawer)/(tabs)/home'); }} 
        />

        {/* --- SYSTEM CONFIGURATION --- */}
        {canSeeConfig && (
          <View>
            <TouchableOpacity 
              style={[styles.collapsibleHeader, configExpanded && { backgroundColor: dynamicSubMenuBg }]} 
              onPress={() => setConfigExpanded(!configExpanded)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconSymbol name="gearshape.fill" size={22} color={dynamicTextColor} />
                <ThemedText style={[styles.collapsibleLabel, { color: dynamicTextColor }]}>CONFIGURACIÓN</ThemedText>
              </View>
              <IconSymbol name={configExpanded ? "chevron.up" : "chevron.down"} size={16} color={dynamicTextColor} />
            </TouchableOpacity>

            {configExpanded && (
              <View style={[styles.subMenu, { backgroundColor: dynamicSubMenuBg }]}>
                {can('Ver-usuarios') && (
                  <DrawerItem 
                    label="Residentes" 
                    focused={isActive('/residents')}
                    activeTintColor={activeColor}
                    style={styles.drawerItem}
                    labelStyle={[styles.lbl, { color: isActive('/residents') ? activeColor : (isDark ? '#fff' : '#333') }]} 
                    icon={({ color }) => <IconSymbol name="person.2.fill" size={20} color={isActive('/residents') ? activeColor : (isDark ? '#fff' : color)} />} 
                    onPress={() => router.push('/residents')} 
                  />
                )}
                {can('Ver-roles') && (
                  <DrawerItem 
                    label="Roles" 
                    focused={isActive('/roles')}
                    activeTintColor={activeColor}
                    style={styles.drawerItem}
                    labelStyle={[styles.lbl, { color: isActive('/roles') ? activeColor : (isDark ? '#fff' : '#333') }]} 
                    icon={({ color }) => <IconSymbol name="lock.fill" size={20} color={isActive('/roles') ? activeColor : (isDark ? '#fff' : color)} />} 
                    onPress={() => router.push('/roles')} 
                  />
                )}
                {can('Ver-permisos') && (
                  <DrawerItem 
                    label="Permisos" 
                    focused={isActive('/permissions')}
                    activeTintColor={activeColor}
                    style={styles.drawerItem}
                    labelStyle={[styles.lbl, { color: isActive('/permissions') ? activeColor : (isDark ? '#fff' : '#333') }]} 
                    icon={({ color }) => <IconSymbol name="key.fill" size={20} color={isActive('/permissions') ? activeColor : (isDark ? '#fff' : color)} />} 
                    onPress={() => router.push('/permissions')} 
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* --- ADMINISTRATIVE CATALOGS --- */}
        
        {can('Ver-catalogo-gastos') && (
          <DrawerItem 
            label="Catálogo de salidas" 
            focused={isActive('/expense-categories')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/expense-categories') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="tags.fill" size={22} color={isActive('/expense-categories') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/expense-categories')} 
          />
        )}
        
        {can('Ver-gastos') && (
          <DrawerItem 
            label="Salidas" 
            focused={isActive('/expenses')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/expenses') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="banknote.fill" size={22} color={isActive('/expenses') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/expenses')} 
          />
        )}

        {can('Ver-cuotas') && (
          <DrawerItem 
            label="Catálogo de aportaciones" 
            focused={isActive('/fees')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/fees') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="building.2.fill" size={22} color={isActive('/fees') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/fees')} 
          />
        )}

        {can('Ver-calles') && (
          <DrawerItem 
            label="Catálogo de calles" 
            focused={isActive('/streets')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/streets') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="map.fill" size={22} color={isActive('/streets') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/streets')} 
          />
        )}
        
        {can('Ver-predios') && (
          <DrawerItem 
            label="Predios y aportaciones" 
            focused={isActive('/addresses')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/addresses') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="location.fill" size={22} color={isActive('/addresses') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/addresses')} 
          />
        )}
        
        {can('Reportes') && (
          <DrawerItem 
            label="Reportes" 
            focused={isActive('/reports')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/reports') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="chart.bar.fill" size={22} color={isActive('/reports') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/reports')} 
          />
        )}

        {can('Ver-estado-cuenta') && (
          <DrawerItem 
            label="Estatus global" 
            focused={isActive('/statement')}
            activeTintColor={activeColor}
            activeBackgroundColor={activeBg}
            style={styles.drawerItem}
            labelStyle={[styles.lbl, { color: isActive('/statement') ? activeColor : (isDark ? '#fff' : '#333') }]} 
            icon={({ color }) => <IconSymbol name="doc.text.fill" size={22} color={isActive('/statement') ? activeColor : (isDark ? '#fff' : color)} />} 
            onPress={() => router.push('/statement')} 
          />
        )}

        <View style={styles.versionContainer}>
          <ThemedText style={styles.versionText}>
            v{Constants.expoConfig?.version} (
            {__DEV__
              ? 'dev'
              : Application.nativeBuildVersion ||
                String(Constants.expoConfig?.android?.versionCode ?? '') ||
                '—'}
            )
          </ThemedText>
        </View>
      </DrawerContentScrollView>

      {/* Logout Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={[styles.fDiv, { backgroundColor: dynamicDividerColor }]} />
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
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uName: { fontWeight: 'bold', fontSize: 16 },
  uRole: { fontSize: 13 },
  divider: { height: 1, marginVertical: 5 },
  drawerItem: { marginVertical: 1, borderRadius: 8, marginHorizontal: 10 }, 
  lbl: { fontSize: 14, marginLeft: -5, fontWeight: '500' },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 5,
    marginHorizontal: 10,
    borderRadius: 8
  },
  collapsibleLabel: { fontSize: 11, fontWeight: 'bold', marginLeft: 15, letterSpacing: 1 },
  subMenu: { paddingLeft: 10, marginLeft: 25, marginBottom: 5, borderLeftWidth: 1, borderLeftColor: '#007bff' },
  footer: { paddingHorizontal: 15 },
  fDiv: { height: 1, marginBottom: 5 },
  lOut: { color: '#ff4444', fontWeight: 'bold', fontSize: 14 },
  versionContainer: { paddingLeft: 20, paddingVertical: 10 },
  versionText: { fontSize: 11, opacity: 0.5 }
});