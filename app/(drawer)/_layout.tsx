import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Image } from 'react-native';

/**
 * Custom Drawer content component.
 * Layout order: Home -> Streets -> Fees -> Cat. Expenses -> Control Expenses -> Addresses (Predios)
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
        console.error("Error loading user data for drawer:", e);
      }
    };
    loadUserData();
  }, []);

  const { can } = usePermission(user);

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['isLoggedIn', 'userToken', 'userProfilePhoto', 'userData']);
    router.replace('/');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      {/* --- 👤 USER PROFILE HEADER --- */}
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
            {user?.name || 'Usuario'}
          </ThemedText>
          <ThemedText style={styles.userRole}>
            {user?.role_name || 'Residente'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.divider} />

      <DrawerItemList {...props} />

      {/* --- 🛠️ ADMINISTRATION SECTION --- */}
      {(can('Ver-calles') || can('Ver-cuotas') || can('Ver-catalogo-gastos') || can('Ver-gastos') || can('Ver-predios')) && (
        <>
          <ThemedText style={styles.sectionTitle}>ADMINISTRACIÓN</ThemedText>

          {can('Ver-calles') && (
            <DrawerItem
              label="Calles"
              labelStyle={styles.drawerLabel}
              icon={({ color }) => <IconSymbol name="map.fill" size={22} color={color} />}
              onPress={() => router.push('/(tabs)/streets')}
            />
          )}

          {can('Ver-cuotas') && (
            <DrawerItem
              label="Cuotas"
              labelStyle={styles.drawerLabel}
              icon={({ color }) => <IconSymbol name="cash.fill" size={22} color={color} />}
              onPress={() => router.push('/(tabs)/fees')}
            />
          )}

          {can('Ver-catalogo-gastos') && (
            <DrawerItem
              label="Categorías de Gastos"
              labelStyle={styles.drawerLabel}
              icon={({ color }) => <IconSymbol name="tags.fill" size={22} color={color} />}
              onPress={() => router.push('/(tabs)/expense-categories')}
            />
          )}

          {can('Ver-gastos') && (
            <DrawerItem
              label="Control de Gastos"
              labelStyle={styles.drawerLabel}
              icon={({ color }) => <IconSymbol name="creditcard.fill" size={22} color={color} />}
              onPress={() => router.push('/(tabs)/expenses')}
            />
          )}

          {/* 📍 PREDIOS MOVED TO THE END */}
          {can('Ver-predios') && (
            <DrawerItem
              label="Predios (Catálogo)"
              labelStyle={styles.drawerLabel}
              icon={({ color }) => <IconSymbol name="location.fill" size={22} color={color} />}
              onPress={() => router.push('/(tabs)/addresses')}
            />
          )}
        </>
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
        drawerStyle: { width: 280 },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerLabel: 'Panel Principal',
          title: 'Panel Principal',
          drawerIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userRole: { fontSize: 12, color: '#888', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: '#eee', marginHorizontal: 15, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#aaa', marginLeft: 20, marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  drawerLabel: { color: '#333', fontWeight: '500' },
  footer: { marginBottom: 20 },
  footerDivider: { height: 1, backgroundColor: '#eee', marginHorizontal: 15, marginBottom: 10 },
  logoutLabel: { color: '#ff4444', fontWeight: 'bold' },
});