import { supabase } from '@/lib/supabase';

export const dashboardService = {
  // Получить статистику для дашборда
  async getStats() {
    try {
      // Статистика товаров
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Статистика заказов (проверяем наличие таблицы)
      let totalOrders = 0;
      try {
        const { count, error: ordersError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true });

        if (ordersError) {
          // Если таблицы нет, просто используем 0
          if (ordersError.message.includes('does not exist') || ordersError.message.includes('relation')) {
            console.warn('Таблица orders не существует, используем 0');
            totalOrders = 0;
          } else {
            throw ordersError;
          }
        } else {
          totalOrders = count || 0;
        }
      } catch (error: any) {
        // Если таблицы нет, продолжаем с 0
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('Таблица orders не существует, используем 0');
          totalOrders = 0;
        } else {
          throw error;
        }
      }

      // Статистика пользователей
      const { count: totalUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Выручка (сумма всех оплаченных заказов)
      let revenue = 0;
      try {
        const { data: revenueData, error: revenueError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('payment_status', 'paid');

        if (revenueError) {
          // Если таблицы нет, используем 0
          if (revenueError.message.includes('does not exist') || revenueError.message.includes('relation')) {
            console.warn('Таблица orders не существует, используем 0 для выручки');
            revenue = 0;
          } else {
            throw revenueError;
          }
        } else {
          revenue = revenueData?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0;
        }
      } catch (error: any) {
        // Если таблицы нет, продолжаем с 0
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('Таблица orders не существует, используем 0 для выручки');
          revenue = 0;
        } else {
          throw error;
        }
      }

      return {
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        revenue: Math.round(revenue),
      };
    } catch (error: any) {
      console.error('Ошибка получения статистики:', error);
      throw new Error(error.message || 'Ошибка получения статистики');
    }
  },
};

