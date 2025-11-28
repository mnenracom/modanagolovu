// Роли и права доступа
export enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CONTENT = 'content',
  USER = 'user',
}

export interface RolePermissions {
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageClients: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

export const rolePermissions: Record<Role, RolePermissions> = {
  [Role.ADMIN]: {
    canManageProducts: true,
    canManageOrders: true,
    canManageClients: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  [Role.MANAGER]: {
    canManageProducts: true,
    canManageOrders: true,
    canManageClients: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canManageSettings: false,
  },
  [Role.CONTENT]: {
    canManageProducts: true,
    canManageOrders: false,
    canManageClients: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
  [Role.USER]: {
    canManageProducts: false,
    canManageOrders: false,
    canManageClients: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
};

export const hasPermission = (role: string, permission: keyof RolePermissions): boolean => {
  const userRole = role as Role;
  return rolePermissions[userRole]?.[permission] ?? false;
};

export const requireRole = (userRole: string, allowedRoles: Role[]): boolean => {
  return allowedRoles.includes(userRole as Role);
};










