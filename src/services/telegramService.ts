import { supabase } from '@/lib/supabase';
import { TelegramSettings, TelegramChat, TelegramNotification } from '@/types/telegram';

// Преобразование из Supabase формата
function transformSettingsFromSupabase(data: any): TelegramSettings {
  return {
    id: data.id,
    botToken: data.bot_token,
    botName: data.bot_name,
    isActive: data.is_active ?? true,
    notifyLowPrice: data.notify_low_price ?? true,
    notifyNewOrder: data.notify_new_order ?? true,
    notifyNewReview: data.notify_new_review ?? true,
    notifyNewQuestion: data.notify_new_question ?? true,
    notifyMarketplaceSync: data.notify_marketplace_sync ?? false,
    notifyErrors: data.notify_errors ?? true,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformChatFromSupabase(data: any): TelegramChat {
  return {
    id: data.id,
    chatId: data.chat_id,
    chatType: data.chat_type,
    chatTitle: data.chat_title,
    username: data.username,
    isActive: data.is_active ?? true,
    notifyLowPrice: data.notify_low_price ?? true,
    notifyNewOrder: data.notify_new_order ?? true,
    notifyNewReview: data.notify_new_review ?? true,
    notifyNewQuestion: data.notify_new_question ?? true,
    notifyMarketplaceSync: data.notify_marketplace_sync ?? false,
    notifyErrors: data.notify_errors ?? true,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат
function transformSettingsToSupabase(data: Partial<TelegramSettings>): any {
  const result: any = {};
  if ('botToken' in data) result.bot_token = data.botToken;
  if ('botName' in data) result.bot_name = data.botName;
  if ('isActive' in data) result.is_active = data.isActive;
  if ('notifyLowPrice' in data) result.notify_low_price = data.notifyLowPrice;
  if ('notifyNewOrder' in data) result.notify_new_order = data.notifyNewOrder;
  if ('notifyNewReview' in data) result.notify_new_review = data.notifyNewReview;
  if ('notifyNewQuestion' in data) result.notify_new_question = data.notifyNewQuestion;
  if ('notifyMarketplaceSync' in data) result.notify_marketplace_sync = data.notifyMarketplaceSync;
  if ('notifyErrors' in data) result.notify_errors = data.notifyErrors;
  if ('metadata' in data) result.metadata = data.metadata || {};
  return result;
}

function transformChatToSupabase(data: Partial<TelegramChat>): any {
  const result: any = {};
  if ('chatId' in data) result.chat_id = data.chatId;
  if ('chatType' in data) result.chat_type = data.chatType;
  if ('chatTitle' in data) result.chat_title = data.chatTitle;
  if ('username' in data) result.username = data.username;
  if ('isActive' in data) result.is_active = data.isActive;
  if ('notifyLowPrice' in data) result.notify_low_price = data.notifyLowPrice;
  if ('notifyNewOrder' in data) result.notify_new_order = data.notifyNewOrder;
  if ('notifyNewReview' in data) result.notify_new_review = data.notifyNewReview;
  if ('notifyNewQuestion' in data) result.notify_new_question = data.notifyNewQuestion;
  if ('notifyMarketplaceSync' in data) result.notify_marketplace_sync = data.notifyMarketplaceSync;
  if ('notifyErrors' in data) result.notify_errors = data.notifyErrors;
  if ('metadata' in data) result.metadata = data.metadata || {};
  return result;
}

/**
 * Отправка сообщения в Telegram через Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.ok) {
      const errorMessage = data.description || `HTTP ${response.status}`;
      console.error('Ошибка отправки сообщения в Telegram:', {
        error: errorMessage,
        errorCode: data.error_code,
        chatId,
        response: data,
      });
      
      // Бросаем ошибку с детальной информацией
      throw new Error(errorMessage);
    }

    return true;
  } catch (error: any) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
    throw error; // Пробрасываем ошибку дальше
  }
}

/**
 * Форматирование сообщения для Telegram
 */
function formatNotification(notification: TelegramNotification): string {
  const emojiMap: Record<string, string> = {
    low_price: '💰',
    new_order: '🛒',
    new_review: '⭐',
    new_question: '❓',
    marketplace_sync: '🔄',
    error: '⚠️',
  };

  const emoji = emojiMap[notification.type] || '📢';
  const priorityEmoji = notification.priority === 'high' ? '🔴' : notification.priority === 'low' ? '🟢' : '🟡';

  let message = `${emoji} ${priorityEmoji} <b>${notification.title}</b>\n\n`;
  message += `${notification.message}\n`;

  if (notification.data) {
    message += '\n';
    for (const [key, value] of Object.entries(notification.data)) {
      if (value !== null && value !== undefined) {
        message += `<b>${key}:</b> ${value}\n`;
      }
    }
  }

  return message;
}

export const telegramService = {
  /**
   * Получить настройки Telegram
   */
  async getSettings(): Promise<TelegramSettings | null> {
    const { data, error } = await supabase
      .from('telegram_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Настройки не найдены
      }
      console.error('Ошибка получения настроек Telegram:', error);
      throw new Error(`Ошибка получения настроек: ${error.message}`);
    }

    return data ? transformSettingsFromSupabase(data) : null;
  },

  /**
   * Сохранить настройки Telegram
   */
  async saveSettings(settings: Partial<TelegramSettings>): Promise<TelegramSettings> {
    const existing = await this.getSettings();
    const supabaseData = transformSettingsToSupabase(settings);

    if (existing) {
      // Обновляем существующие настройки
      const { data, error } = await supabase
        .from('telegram_settings')
        .update(supabaseData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления настроек Telegram:', error);
        throw new Error(`Ошибка обновления настроек: ${error.message}`);
      }

      return transformSettingsFromSupabase(data);
    } else {
      // Создаем новые настройки
      const { data, error } = await supabase
        .from('telegram_settings')
        .insert(supabaseData)
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания настроек Telegram:', error);
        throw new Error(`Ошибка создания настроек: ${error.message}`);
      }

      return transformSettingsFromSupabase(data);
    }
  },

  /**
   * Получить все активные чаты
   */
  async getActiveChats(): Promise<TelegramChat[]> {
    const { data, error } = await supabase
      .from('telegram_chats')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения чатов Telegram:', error);
      throw new Error(`Ошибка получения чатов: ${error.message}`);
    }

    return (data || []).map(transformChatFromSupabase);
  },

  /**
   * Добавить чат
   */
  async addChat(chat: Partial<TelegramChat>): Promise<TelegramChat> {
    const supabaseData = transformChatToSupabase(chat);

    const { data, error } = await supabase
      .from('telegram_chats')
      .upsert(supabaseData, {
        onConflict: 'chat_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка добавления чата Telegram:', error);
      throw new Error(`Ошибка добавления чата: ${error.message}`);
    }

    return transformChatFromSupabase(data);
  },

  /**
   * Удалить чат
   */
  async removeChat(chatId: number): Promise<void> {
    const { error } = await supabase
      .from('telegram_chats')
      .delete()
      .eq('chat_id', chatId);

    if (error) {
      console.error('Ошибка удаления чата Telegram:', error);
      throw new Error(`Ошибка удаления чата: ${error.message}`);
    }
  },

  /**
   * Обновить чат
   */
  async updateChat(id: number, chat: Partial<TelegramChat>): Promise<TelegramChat> {
    const supabaseData = transformChatToSupabase(chat);

    const { data, error } = await supabase
      .from('telegram_chats')
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления чата Telegram:', error);
      throw new Error(`Ошибка обновления чата: ${error.message}`);
    }

    return transformChatFromSupabase(data);
  },

  /**
   * Отправить уведомление
   */
  async sendNotification(notification: TelegramNotification): Promise<boolean> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.isActive) {
        console.log('Telegram уведомления отключены или не настроены');
        return false;
      }

      // Проверяем, включен ли этот тип уведомлений
      const typeMap: Record<string, keyof TelegramSettings> = {
        'low_price': 'notifyLowPrice',
        'new_order': 'notifyNewOrder',
        'new_review': 'notifyNewReview',
        'new_question': 'notifyNewQuestion',
        'marketplace_sync': 'notifyMarketplaceSync',
        'error': 'notifyErrors',
      };
      
      const notificationKey = typeMap[notification.type];
      if (!notificationKey || !settings[notificationKey]) {
        console.log(`Уведомления типа ${notification.type} отключены`);
        return false;
      }

      const chats = await this.getActiveChats();
      if (chats.length === 0) {
        console.log('Нет активных чатов для отправки уведомлений');
        return false;
      }

      const message = formatNotification(notification);
      let successCount = 0;
      const errors: string[] = [];

      // Отправляем в каждый активный чат, если для него включен этот тип уведомлений
      const chatTypeMap: Record<string, keyof TelegramChat> = {
        'low_price': 'notifyLowPrice',
        'new_order': 'notifyNewOrder',
        'new_review': 'notifyNewReview',
        'new_question': 'notifyNewQuestion',
        'marketplace_sync': 'notifyMarketplaceSync',
        'error': 'notifyErrors',
      };
      
      const chatNotificationKey = chatTypeMap[notification.type];
      
      for (const chat of chats) {
        if (!chatNotificationKey || !chat[chatNotificationKey]) {
          continue;
        }
        
        try {
          const sent = await sendTelegramMessage(settings.botToken, chat.chatId, message);
          if (sent) {
            successCount++;
          } else {
            errors.push(`Не удалось отправить в чат ${chat.chatId}`);
          }
        } catch (error: any) {
          errors.push(`Ошибка отправки в чат ${chat.chatId}: ${error.message}`);
          console.error(`Ошибка отправки в чат ${chat.chatId}:`, error);
        }
      }

      if (errors.length > 0) {
        console.error('Ошибки отправки уведомлений:', errors);
      }

      if (successCount === 0 && errors.length > 0) {
        throw new Error(`Не удалось отправить уведомление: ${errors.join('; ')}`);
      }

      return successCount > 0;
    } catch (error: any) {
      console.error('Ошибка отправки уведомления в Telegram:', error);
      // Пробрасываем ошибку дальше для детального сообщения
      throw error;
    }
  },

  /**
   * Проверить токен бота (получить информацию о боте)
   */
  async verifyBotToken(botToken: string): Promise<{ valid: boolean; botInfo?: any }> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getMe`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {
        return {
          valid: true,
          botInfo: data.result,
        };
      }

      return { valid: false };
    } catch (error) {
      console.error('Ошибка проверки токена бота:', error);
      return { valid: false };
    }
  },

  /**
   * Получить обновления от бота (для получения chat_id)
   */
  async getUpdates(botToken: string): Promise<{ updates: any[]; error?: string }> {
    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok && data.result) {
        return { updates: data.result };
      }

      return { updates: [], error: data.description || 'Ошибка получения обновлений' };
    } catch (error: any) {
      console.error('Ошибка получения обновлений:', error);
      return { updates: [], error: error.message || 'Ошибка получения обновлений' };
    }
  },

  /**
   * Добавить чат вручную по chat_id
   */
  async addChatManually(botToken: string, chatId: number): Promise<{ success: boolean; chatInfo?: any; error?: string }> {
    try {
      // Проверяем, что чат существует, отправляя тестовое сообщение
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Проверка подключения...',
        }),
      });

      const data = await response.json();

      if (data.ok && data.result) {
        const chat = data.result.chat;
        
        // Добавляем чат в базу
        await this.addChat({
          chatId: chat.id,
          chatType: chat.type === 'private' ? 'private' : chat.type === 'group' ? 'group' : chat.type === 'supergroup' ? 'supergroup' : 'channel',
          chatTitle: chat.title || chat.first_name || `Chat ${chat.id}`,
          username: chat.username,
          isActive: true,
        });

        return { success: true, chatInfo: chat };
      }

      return { success: false, error: data.description || 'Ошибка отправки сообщения' };
    } catch (error: any) {
      console.error('Ошибка добавления чата:', error);
      return { success: false, error: error.message || 'Ошибка добавления чата' };
    }
  },
};

