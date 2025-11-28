import { supabase } from '@/lib/supabase';
import { ProductNotification, ProductNotificationFormData } from '@/types/productNotification';
import { telegramService } from './telegramService';

// Преобразование из Supabase формата
function transformFromSupabase(data: any): ProductNotification {
  return {
    id: data.id,
    userId: data.user_id,
    productId: data.product_id,
    email: data.email,
    telegramChatId: data.telegram_chat_id,
    isActive: data.is_active ?? true,
    notifiedAt: data.notified_at,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат
function transformToSupabase(data: Partial<ProductNotificationFormData>): any {
  const result: any = {};
  if ('productId' in data) result.product_id = data.productId;
  if ('email' in data) result.email = data.email;
  if ('telegramChatId' in data) result.telegram_chat_id = data.telegramChatId;
  return result;
}

export const productNotificationsService = {
  /**
   * Подписаться на уведомление о поступлении товара
   */
  async subscribe(
    data: ProductNotificationFormData,
    userId?: string
  ): Promise<ProductNotification> {
    const supabaseData = transformToSupabase(data);
    
    if (userId) {
      supabaseData.user_id = userId;
    }

    const { data: result, error } = await supabase
      .from('product_notifications')
      .upsert(supabaseData, {
        onConflict: userId ? 'user_id,product_id' : 'email,product_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка подписки на уведомление:', error);
      throw new Error(`Ошибка подписки: ${error.message}`);
    }

    return transformFromSupabase(result);
  },

  /**
   * Отписаться от уведомлений
   */
  async unsubscribe(productId: number, userId?: string, email?: string): Promise<void> {
    let query = supabase
      .from('product_notifications')
      .delete()
      .eq('product_id', productId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      throw new Error('Необходимо указать userId или email');
    }

    const { error } = await query;

    if (error) {
      console.error('Ошибка отписки от уведомления:', error);
      throw new Error(`Ошибка отписки: ${error.message}`);
    }
  },

  /**
   * Проверить, подписан ли пользователь
   */
  async isSubscribed(productId: number, userId?: string, email?: string): Promise<boolean> {
    let query = supabase
      .from('product_notifications')
      .select('id')
      .eq('product_id', productId)
      .eq('is_active', true);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      return false;
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка проверки подписки:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  },

  /**
   * Получить все подписки пользователя
   */
  async getUserSubscriptions(userId?: string, email?: string): Promise<ProductNotification[]> {
    let query = supabase
      .from('product_notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      return [];
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения подписок:', error);
      throw new Error(`Ошибка получения подписок: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Получить все подписки на товар (для отправки уведомлений)
   */
  async getProductSubscriptions(productId: number): Promise<ProductNotification[]> {
    const { data, error } = await supabase
      .from('product_notifications')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .is('notified_at', null); // Только те, кому еще не отправляли

    if (error) {
      console.error('Ошибка получения подписок на товар:', error);
      throw new Error(`Ошибка получения подписок: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Отправить уведомления о поступлении товара
   */
  async sendNotifications(productId: number, productName: string, productUrl: string): Promise<number> {
    const subscriptions = await this.getProductSubscriptions(productId);
    
    if (subscriptions.length === 0) {
      return 0;
    }

    let sentCount = 0;

    for (const subscription of subscriptions) {
      try {
        // Отправляем email уведомление (требует настройки email сервиса)
        // TODO: Интеграция с email сервисом
        
        // Отправляем Telegram уведомление, если указан chat_id
        if (subscription.telegramChatId) {
          await telegramService.sendNotification({
            type: 'new_question', // Используем существующий тип, можно добавить новый
            title: '✅ Товар снова в наличии!',
            message: `Товар "${productName}" снова доступен для заказа.`,
            data: {
              Товар: productName,
              Ссылка: productUrl,
            },
            priority: 'normal',
          });
        }

        // Помечаем как отправленное
        await supabase
          .from('product_notifications')
          .update({ notified_at: new Date().toISOString() })
          .eq('id', subscription.id);

        sentCount++;
      } catch (error) {
        console.error(`Ошибка отправки уведомления для подписки ${subscription.id}:`, error);
      }
    }

    return sentCount;
  },
};




