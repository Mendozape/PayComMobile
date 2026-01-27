import { useMemo } from 'react';

const usePermission = (user: any) => {
  const permissions = useMemo(() => {
    if (!user) return [];

    const allPermissions: string[] = [];

    // 1. Extraer permisos directos (si existen)
    if (user.permissions && Array.isArray(user.permissions)) {
      user.permissions.forEach((p: any) => {
        allPermissions.push(typeof p === 'object' ? p.name : p);
      });
    }

    // 2. Extraer permisos de los ROLES (Estructura Spatie que vimos en tu api.php)
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach((role: any) => {
        if (role.permissions && Array.isArray(role.permissions)) {
          role.permissions.forEach((p: any) => {
            allPermissions.push(typeof p === 'object' ? p.name : p);
          });
        }
      });
    }

    // Eliminar duplicados
    const uniquePermissions = [...new Set(allPermissions)];
    console.log("🛡️ Permisos Finales en App:", uniquePermissions);
    
    return uniquePermissions;
  }, [user]);

  const can = (requiredPermission: string | string[]): boolean => {
    if (!user) return false;
    if (typeof requiredPermission === 'string') {
      return permissions.includes(requiredPermission);
    }
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(p => permissions.includes(p));
    }
    return false;
  };

  return { can, user };
};

export default usePermission;