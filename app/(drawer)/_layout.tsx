import { IconSymbol } from '@/components/ui/icon-symbol';
import usePermission from '@/hooks/usePermission';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';

/**
 * Custom Drawer content that handles permissions and sends user data to child routes.
 * Developer comments in English, UI in Spanish.
 */
function CustomDrawerContent(props: any) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  /**
   * Load user data from storage and sync with navigation state.
   */
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('userData');
        if (jsonValue != null) {
          const parsedUser = JSON.parse(jsonValue);
          setUser(parsedUser);
          
          // CRITICAL: We update the navigation parameters so child tabs have the data immediately
          props.navigation.setParams({ user: parsedUser });
        }
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
    <DrawerContentScrollView {...props}>
      {/* 1. Main navigation group (Dashboard) */}
      <DrawerItemList {...props} />

      {/* 2. Streets Section */}
      {can('Ver-calles') && (
        <DrawerItem
          label="Calles"
          labelStyle={{ color: '#333', fontWeight: '500' }}
          icon={({ color }) => <IconSymbol name="map.fill" size={22} color={color} />}
          onPress={() => router.push({ pathname: '/(tabs)/streets', params: { user: JSON.stringify(user) } })}
        />
      )}

      {/* 3. Fees Section (Cuotas) */}
      {can('Ver-cuotas') && (
        <DrawerItem
          label="Cuotas"
          labelStyle={{ color: '#333', fontWeight: '500' }}
          icon={({ color }) => <IconSymbol name="cash.fill" size={22} color={color} />}
          onPress={() => router.push({ pathname: '/(tabs)/fees', params: { user: JSON.stringify(user) } })}
        />
      )}
      
      {/* 4. Logout */}
      <DrawerItem
        label="Cerrar Sesión"
        labelStyle={{ color: '#ff4444', fontWeight: 'bold' }}
        icon={({ color }) => <IconSymbol name="rectangle.portrait.and.arrow.right" size={22} color="#ff4444" />}
        onPress={handleLogout}
      />
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
          drawerLabel: 'Panel Principal',
          title: 'Panel Principal',
          drawerIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} />,
        }}
      />
    </Drawer>
  );
}