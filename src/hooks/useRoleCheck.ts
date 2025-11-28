import { useAuth, User } from '@/hooks/useAuth';
import { Role } from '@/lib/roles';

/**
 * Хук для проверки ролей пользователя
 */
export const useRoleCheck = () => {
  const { user, supabaseUser } = useAuth();

  /**
   * Получает роль пользователя из всех доступных источников
   */
  const getUserRole = (): Role | string | null => {
    if (!user && !supabaseUser) return null;
    
    // Приоритет: user.role -> user_metadata -> app_metadata
    if (user?.role) return user.role;
    if (supabaseUser?.user_metadata?.role) return supabaseUser.user_metadata.role;
    if (supabaseUser?.app_metadata?.role) return supabaseUser.app_metadata.role;
    
    return null;
  };

  /**
   * Проверяет, имеет ли пользователь указанную роль
   */
  const hasRole = (requiredRole: Role | string): boolean => {
    const userRole = getUserRole();
    return userRole === requiredRole;
  };

  /**
   * Проверяет, имеет ли пользователь одну из указанных ролей
   */
  const hasAnyRole = (requiredRoles: (Role | string)[]): boolean => {
    const userRole = getUserRole();
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
  };

  /**
   * Проверяет, имеет ли пользователь права администратора (admin, manager)
   */
  const isAdmin = (): boolean => {
    return hasAnyRole(['admin', 'manager']);
  };

  /**
   * Проверяет, имеет ли пользователь права контент-менеджера
   */
  const canManageContent = (): boolean => {
    return hasAnyRole(['admin', 'manager', 'content']);
  };

  /**
   * Проверяет, может ли пользователь управлять заказами
   */
  const canManageOrders = (): boolean => {
    return hasAnyRole(['admin', 'manager']);
  };

  /**
   * Получает текущую роль пользователя
   */
  const getCurrentRole = (): Role | string | null => {
    return getUserRole();
  };

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    canManageContent,
    canManageOrders,
    getCurrentRole,
    user,
    isAuthenticated: !!user && !!supabaseUser,
  };
};

/**
 * Утилита для проверки роли (для использования вне компонентов)
 * ВАЖНО: Используйте хук useRoleCheck внутри компонентов React
 */
export const requireRole = (user: User | null, requiredRole: string): boolean => {
  if (!user) return false;
  
  const userRole = user.role;
  return userRole === requiredRole;
};

