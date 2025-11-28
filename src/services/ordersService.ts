import { supabase } from '@/lib/supabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { transformOrderFromSupabase } from '@/types/orderSupabase';

export interface OrderFormData {
  user_id?: number | string; // Может быть числом (BIGINT) или строкой (UUID)
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_telegram?: string;
  customer_whatsapp?: string;
  items: any[];
  subtotal: number;
  shipping_cost?: number;
  discount?: number;
  total_amount: number;
  status?: string;
  payment_method?: string;
  payment_status?: string;
  shipping_method?: string;
  tracking_number?: string;
  notes?: string;
}

export const ordersService = {

  // Получить все заказы
  async getAll(params?: {
    status?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
    userId?: string;
  }) {
    let query = supabase.from('orders').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.date) {
      const now = new Date();
      let startDate: Date;

      switch (params.date) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      if (params.date !== 'all') {
        query = query.gte('created_at', startDate.toISOString());
      }
    }

    if (params?.search) {
      query = query.or(
        `order_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,customer_email.ilike.%${params.search}%,customer_phone.ilike.%${params.search}%`
      );
    }

    if (params?.userId) {
      // userId может быть строкой (UUID) или числом
      // Пытаемся преобразовать в число, если возможно, иначе используем как строку
      const userIdNum = parseInt(params.userId);
      if (!isNaN(userIdNum) && userIdNum.toString() === params.userId) {
        // Это число
        query = query.eq('user_id', userIdNum);
      } else {
        // Это UUID или строка - используем как есть
        query = query.eq('user_id', params.userId);
      }
    }

    // Пагинация
    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      // Проверяем, существует ли таблица
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        throw new Error('Таблица orders не существует. Создайте её через SQL Editor в Supabase Dashboard.');
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

    return { data: data || [], count: count || 0 };
  },

  // Получить заказ по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Проверяем, существует ли таблица
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        throw new Error('Таблица orders не существует. Создайте её через SQL Editor в Supabase Dashboard.');
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

    return data;
  },

  // Создать заказ
  async create(orderData: OrderFormData) {
    // Собираем всю дополнительную информацию в notes на случай, если колонки отсутствуют
    const notesParts: string[] = [];
    
    // Создаем минимальный объект только с обязательными полями, которые точно должны быть
    const insertData: any = {
      customer_name: orderData.customer_name,
      items: orderData.items,
      subtotal: orderData.subtotal,
      shipping_cost: orderData.shipping_cost || 0,
      discount: orderData.discount || 0,
      total_amount: orderData.total_amount,
      status: orderData.status || 'pending',
      payment_status: orderData.payment_status || 'pending',
      history: [{
        status: orderData.status || 'pending',
        changed_by: 'system',
        timestamp: new Date().toISOString(),
      }],
    };

    // Добавляем user_id только если он передан (может быть undefined для неавторизованных пользователей)
    if (orderData.user_id !== undefined) {
      insertData.user_id = orderData.user_id;
    }

    // Собираем всю информацию для notes
    if (orderData.customer_email) notesParts.push(`Email: ${orderData.customer_email}`);
    if (orderData.customer_phone) notesParts.push(`Телефон: ${orderData.customer_phone}`);
    if (orderData.customer_address) notesParts.push(`Адрес: ${orderData.customer_address}`);
    if (orderData.customer_telegram) notesParts.push(`Telegram: ${orderData.customer_telegram}`);
    if (orderData.customer_whatsapp) notesParts.push(`WhatsApp: ${orderData.customer_whatsapp}`);
    if (orderData.payment_method) notesParts.push(`Способ оплаты: ${orderData.payment_method}`);
    if (orderData.shipping_method) notesParts.push(`Способ доставки: ${orderData.shipping_method}`);
    if (orderData.notes) notesParts.push(`Комментарий: ${orderData.notes}`);
    
    // Объединяем всё в notes
    if (notesParts.length > 0) {
      insertData.notes = notesParts.join('\n');
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      // Проверяем, существует ли таблица
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        throw new Error('Таблица orders не существует. Создайте её через SQL Editor в Supabase Dashboard (файл create_orders_table.sql).');
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

    // Отправляем уведомление в Telegram о новом заказе
    if (data) {
      import('./telegramService').then(({ telegramService }) => {
        telegramService.sendNotification({
          type: 'new_order',
          title: '🛒 Новый заказ',
          message: `Получен новый заказ от ${orderData.customer_name}`,
          data: {
            Номер_заказа: data.order_number || '-',
            Клиент: orderData.customer_name,
            Email: orderData.customer_email || '-',
            Телефон: orderData.customer_phone || '-',
            Сумма: `${orderData.total_amount.toFixed(2)} ₽`,
            Статус: orderData.status || 'pending',
            Способ_оплаты: orderData.payment_method || '-',
          },
          priority: 'high',
        }).catch(err => console.error('Ошибка отправки уведомления в Telegram:', err));
      }).catch(() => {}); // Игнорируем ошибки импорта
    }

    return data;
  },

  // Обновить статус заказа
  async updateStatus(
    id: number,
    status: string,
    comment?: string,
    changedBy?: string,
    trackingNumber?: string,
    deliveryServiceId?: number
  ) {
    // Сначала получаем текущий заказ
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('status, history')
      .eq('id', id)
      .single();

    if (fetchError) {
      // Проверяем, существует ли таблица
      if (fetchError.message.includes('does not exist') || fetchError.message.includes('relation')) {
        throw new Error('Таблица orders не существует. Создайте её через SQL Editor в Supabase Dashboard (файл create_orders_table.sql).');
      }
      throw new Error(fetchError.message);
    }

    // Добавляем новую запись в историю
    const history = currentOrder.history || [];
    const newHistoryEntry = {
      id: Date.now().toString(),
      status,
      previous_status: currentOrder.status,
      changed_by: changedBy || 'system',
      comment: comment || null,
      timestamp: new Date().toISOString(),
    };

    const updateData: any = {
      status,
      history: [...history, newHistoryEntry],
    };

    // Добавляем данные для отслеживания, если указаны
    if (trackingNumber !== undefined) {
      updateData.tracking_number = trackingNumber;
    }
    if (deliveryServiceId !== undefined) {
      updateData.delivery_service_id = deliveryServiceId;
    }
    if (status === 'shipped' || status === 'in_transit') {
      updateData.delivery_status = status;
      updateData.delivery_status_updated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Проверяем, существует ли таблица
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        throw new Error('Таблица orders не существует. Создайте её через SQL Editor в Supabase Dashboard (файл create_orders_table.sql).');
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

    // Отправляем уведомление об изменении статуса заказа
    if (data) {
      import('./telegramService').then(({ telegramService }) => {
        telegramService.sendNotification({
          type: 'new_order',
          title: '📦 Статус заказа изменен',
          message: `Статус заказа ${data.order_number} изменен на "${status}"`,
          data: {
            Номер_заказа: data.order_number || '-',
            Новый_статус: status,
            Комментарий: comment || '-',
          },
          priority: 'normal',
        }).catch(err => console.error('Ошибка отправки уведомления в Telegram:', err));
      }).catch(() => {}); // Игнорируем ошибки импорта
    }

    return data;
  },

  // Обновить заказ
  async update(id: number, orderData: Partial<OrderFormData & { payment_gateway_id?: number; payment_external_id?: string; payment_url?: string }>) {
    const updateData: any = {};

    if (orderData.customer_name !== undefined) updateData.customer_name = orderData.customer_name;
    if (orderData.customer_email !== undefined) updateData.customer_email = orderData.customer_email;
    if (orderData.customer_phone !== undefined) updateData.customer_phone = orderData.customer_phone;
    if (orderData.customer_address !== undefined) updateData.customer_address = orderData.customer_address;
    if (orderData.items !== undefined) updateData.items = orderData.items;
    if (orderData.subtotal !== undefined) updateData.subtotal = orderData.subtotal;
    if (orderData.shipping_cost !== undefined) updateData.shipping_cost = orderData.shipping_cost;
    if (orderData.discount !== undefined) updateData.discount = orderData.discount;
    if (orderData.total_amount !== undefined) updateData.total_amount = orderData.total_amount;
    if (orderData.payment_method !== undefined) updateData.payment_method = orderData.payment_method;
    if (orderData.payment_status !== undefined) updateData.payment_status = orderData.payment_status;
    if (orderData.shipping_method !== undefined) updateData.shipping_method = orderData.shipping_method;
    if (orderData.tracking_number !== undefined) updateData.tracking_number = orderData.tracking_number;
    if (orderData.notes !== undefined) updateData.notes = orderData.notes;
    if (orderData.payment_gateway_id !== undefined) updateData.payment_gateway_id = orderData.payment_gateway_id;
    if (orderData.payment_external_id !== undefined) updateData.payment_external_id = orderData.payment_external_id;
    if (orderData.payment_url !== undefined) updateData.payment_url = orderData.payment_url;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return data;
  },

  // Удалить заказ
  async delete(id: number) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return true;
  },
};

