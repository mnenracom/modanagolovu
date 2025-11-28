import { auditLogService } from '@/services/auditLogService';
import { supabase } from '@/lib/supabase';

/**
 * Утилита для логирования действий пользователей
 */
export const auditLogger = {
  /**
   * Логирует действие пользователя
   */
  async log(
    action: string,
    entityType: string,
    options?: {
      entityId?: number;
      entityName?: string;
      changes?: {
        old?: any;
        new?: any;
      };
      userId?: string;
      userEmail?: string;
    }
  ) {
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      // Получаем IP адрес и User-Agent (если доступны)
      const ipAddress = await this.getIpAddress();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

      // Логируем действие
      await auditLogService.create({
        userId: options?.userId || user?.id,
        userEmail: options?.userEmail || user?.email || undefined,
        action,
        entityType,
        entityId: options?.entityId,
        entityName: options?.entityName,
        changes: options?.changes ? {
          old_values: options.changes.old,
          new_values: options.changes.new,
        } : undefined,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Не бросаем ошибку, чтобы не ломать основной функционал
      console.error('Ошибка логирования действия:', error);
    }
  },

  /**
   * Получает IP адрес (если доступен через заголовки)
   */
  async getIpAddress(): Promise<string | undefined> {
    // В браузере IP адрес недоступен напрямую
    // Можно использовать внешний сервис или получать на бэкенде
    // Для простоты возвращаем undefined
    return undefined;
  },

  /**
   * Вспомогательные методы для типичных действий
   */
  async logCreate(entityType: string, entityId: number, entityName: string, changes?: any) {
    await this.log('create', entityType, {
      entityId,
      entityName,
      changes: changes ? { new: changes } : undefined,
    });
  },

  async logUpdate(entityType: string, entityId: number, entityName: string, oldValues: any, newValues: any) {
    await this.log('update', entityType, {
      entityId,
      entityName,
      changes: {
        old: oldValues,
        new: newValues,
      },
    });
  },

  async logDelete(entityType: string, entityId: number, entityName: string) {
    await this.log('delete', entityType, {
      entityId,
      entityName,
    });
  },

  async logLogin(userEmail: string) {
    await this.log('login', 'user', {
      userEmail,
    });
  },

  async logLogout(userEmail: string) {
    await this.log('logout', 'user', {
      userEmail,
    });
  },
};




