import { supabase } from '@/lib/supabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';

export interface AuditLog {
  id: number;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  entityName: string | null;
  changes: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const auditLogService = {
  // Получить все логи с фильтрацией
  async getAll(filters?: AuditLogFilters) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action && filters.action !== '') {
        query = query.eq('action', filters.action);
      }

      if (filters?.entityType && filters.entityType !== '') {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.search && filters.search !== '') {
        query = query.or(
          `entity_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,action.ilike.%${filters.search}%`
        );
      }

      // Пагинация
      if (filters?.page && filters?.limit) {
        const from = (filters.page - 1) * filters.limit;
        const to = from + filters.limit - 1;
        query = query.range(from, to);
      } else if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error, count } = await query;

      if (error) {
        // Проверяем, существует ли таблица
        if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
          const customError: any = new Error('Таблица audit_logs не существует. Выполните SQL-скрипт create_audit_logs_table.sql в Supabase Dashboard');
          customError.code = '42P01';
          throw customError;
        }
        
        // Проверяем ошибки аутентификации и доступа (401, 403)
        if (error.code === 'PGRST301' || error.status === 401 || error.status === 403) {
          const customError: any = new Error('Ошибка доступа к логам. Проверьте RLS политики. Выполните fix_audit_logs_rls.sql в Supabase Dashboard');
          customError.code = error.code || 'PGRST301';
          customError.isRLSError = true;
          throw customError;
        }

        const rlsError = handleRLSError(error);
        if (rlsError.isRLSError) {
          const customError: any = new Error(rlsError.message);
          customError.isRLSError = true;
          customError.requiresRelogin = rlsError.requiresRelogin;
          throw customError;
        }
        throw new Error(getErrorMessage(error));
      }

      return {
        data: (data || []).map(transformAuditLog),
        count: count || 0,
      };
    } catch (error: any) {
      console.error('Ошибка в auditLogService.getAll:', error);
      throw error;
    }
  },

  // Получить лог по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Лог не найден');
      }
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return transformAuditLog(data);
  },

  // Создать лог (вызывается из других сервисов)
  async create(logData: {
    userId?: string;
    userEmail?: string;
    action: string;
    entityType: string;
    entityId?: number;
    entityName?: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: logData.userId || null,
        user_email: logData.userEmail || null,
        action: logData.action,
        entity_type: logData.entityType,
        entity_id: logData.entityId || null,
        entity_name: logData.entityName || null,
        changes: logData.changes || null,
        ip_address: logData.ipAddress || null,
        user_agent: logData.userAgent || null,
      }])
      .select()
      .single();

    if (error) {
      // Не бросаем ошибку при логировании, чтобы не ломать основной функционал
      console.error('Ошибка создания лога:', error);
      return null;
    }

    return transformAuditLog(data);
  },

  // Получить статистику действий
  async getStats(startDate?: string, endDate?: string) {
    let query = supabase
      .from('audit_logs')
      .select('action, entity_type, created_at');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения статистики:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        actionsByEntity: {},
      };
    }

    const stats = {
      totalActions: data?.length || 0,
      actionsByType: {} as Record<string, number>,
      actionsByEntity: {} as Record<string, number>,
    };

    data?.forEach((log) => {
      stats.actionsByType[log.action] = (stats.actionsByType[log.action] || 0) + 1;
      stats.actionsByEntity[log.entity_type] = (stats.actionsByEntity[log.entity_type] || 0) + 1;
    });

    return stats;
  },
};

// Преобразование данных из Supabase формата
function transformAuditLog(log: any): AuditLog {
  return {
    id: log.id,
    userId: log.user_id,
    userEmail: log.user_email,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    entityName: log.entity_name,
    changes: log.changes,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    createdAt: log.created_at,
  };
}

