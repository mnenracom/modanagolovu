import { supabase } from '@/lib/supabase';

/**
 * Интерфейс для точки выдачи Почты России
 */
export interface PostOffice {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  workingHours?: string;
  distance?: number; // Расстояние в метрах
  type?: 'post_office' | 'postamat' | 'terminal';
}

/**
 * Интерфейс для расчета стоимости доставки
 */
export interface DeliveryCalculation {
  cost: number;
  deliveryTime: string; // Срок доставки в днях
  type: 'standard' | 'express' | 'first_class';
  description?: string;
}

/**
 * Интерфейс для данных адреса
 */
export interface AddressData {
  city: string;
  region?: string;
  postalCode?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Сервис для работы с API Почты России
 */
export const russianPostService = {
  /**
   * Получить API ключ, токен и секрет из настроек
   */
  async getApiCredentials(): Promise<{ apiKey: string | null; apiToken: string | null; apiSecret: string | null }> {
    try {
      // Получаем API ключ, токен и секрет из настроек доставки (delivery_services)
      const { data, error } = await supabase
        .from('delivery_services')
        .select('api_key, api_secret, settings')
        .eq('code', 'russian_post')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn('API ключ Почты России не найден в настройках');
        return { apiKey: null, apiToken: null, apiSecret: null };
      }

      // 1. AccessToken (Токен приложения) - для заголовка Authorization: AccessToken <token>
      // Хранится в api_key или settings.api_token
      const accessToken = data.api_key || 
                         data.settings?.api_token || 
                         data.settings?.access_token || 
                         data.settings?.authorization_token ||
                         data.settings?.api_key ||
                         null;

      // 2. Basic Auth Secret (base64(login:password)) - для заголовка X-User-Authorization: Basic <base64>
      // Хранится в api_secret или settings.api_secret
      // ВАЖНО: убираем префикс "Basic " если он есть
      let basicAuthSecret = data.api_secret || 
                           data.settings?.api_secret || 
                           data.settings?.user_auth || 
                           data.settings?.base64_auth ||
                           null;
      
      // Убираем префикс "Basic " если он присутствует (пользователь мог сохранить с префиксом)
      if (basicAuthSecret && basicAuthSecret.startsWith('Basic ')) {
        basicAuthSecret = basicAuthSecret.substring(6).trim();
      }

      // Возвращаем:
      return {
        apiKey: accessToken,        // AccessToken (основной ключ для Authorization)
        apiToken: accessToken,      // Дублируем для надежности
        apiSecret: basicAuthSecret  // Base64(login:password) для X-User-Authorization
      };

      return { apiKey, apiToken, apiSecret };
    } catch (error) {
      console.error('Ошибка получения API ключа Почты России:', error);
      return { apiKey: null, apiToken: null, apiSecret: null };
    }
  },

  /**
   * Поиск точек выдачи по адресу
   * Использует ТОЛЬКО Edge Function (без прямых запросов с клиента)
   */
  async searchPostOffices(address: AddressData): Promise<PostOffice[]> {
    try {
      const { apiKey, apiToken, apiSecret } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      // Используем ТОЛЬКО Edge Function
      // Согласно документации API Почты России:
      // - apiToken - это токен авторизации приложения (AccessToken)
      // - apiSecret - это base64(login:password) для X-User-Authorization (обязателен!)
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'search_post_offices',
          apiToken: apiToken || apiKey, // Токен авторизации приложения (обязателен)
          apiKey: apiKey, // Для обратной совместимости
          apiSecret: apiSecret, // Base64(login:password) для X-User-Authorization (обязателен!)
          address: {
            city: address.city,
            region: address.region,
            postalCode: address.postalCode,
            latitude: address.latitude,
            longitude: address.longitude,
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Ошибка поиска отделений через Edge Function');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Не получены данные об отделениях');
      }

      if (!data.postOffices || !Array.isArray(data.postOffices) || data.postOffices.length === 0) {
        return [];
      }

      // Преобразуем данные в формат PostOffice
      return data.postOffices.map((office: any) => ({
        id: office.id || office.code || `${office.latitude}_${office.longitude}`,
        name: office.name || office.fullName || 'Отделение Почты России',
        address: office.address || office.fullAddress || '',
        latitude: office.latitude || office.lat || 0,
        longitude: office.longitude || office.lon || office.lng || 0,
        workingHours: office.workingHours || office.schedule || '',
        distance: office.distance,
        type: office.type || 'post_office',
      }));
    } catch (error: any) {
      console.error('Ошибка поиска точек выдачи:', error);
      throw new Error(error.message || 'Не удалось найти точки выдачи');
    }
  },

  /**
   * Рассчитать стоимость доставки
   */
  async calculateDelivery(
    from: AddressData,
    to: AddressData,
    weight: number, // Вес в граммах
    declaredValue?: number // Объявленная стоимость
  ): Promise<DeliveryCalculation> {
    try {
      const { apiKey, apiToken, apiSecret } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      // Вызываем Edge Function для расчета стоимости
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'calculate_delivery',
          apiKey,
          apiToken: apiToken || apiKey, // Токен авторизации приложения
          apiSecret: apiSecret, // Base64(login:password) для X-User-Authorization (обязателен!)
          from: {
            city: from.city,
            postalCode: from.postalCode,
          },
          to: {
            city: to.city,
            postalCode: to.postalCode,
          },
          weight,
          declaredValue,
        },
      });

      if (error) {
        throw new Error(error.message || 'Ошибка расчета стоимости доставки');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Не получены данные о стоимости доставки');
      }

      // Проверяем, что получили реальные данные (не fallback)
      if (data.cost === undefined || data.cost === null) {
        throw new Error('API не вернул стоимость доставки');
      }

      // Убеждаемся, что стоимость - это число (Edge Function уже конвертирует из копеек в рубли)
      // Округляем до целого числа для отображения
      let cost = 0;
      if (typeof data.cost === 'number') {
        cost = Math.round(data.cost);
      } else if (typeof data.cost === 'string') {
        cost = Math.round(parseFloat(data.cost) || 0);
      } else {
        cost = parseInt(String(data.cost || 0), 10);
      }
      
      // Убеждаемся, что стоимость положительная
      if (cost < 0) {
        cost = 0;
      }
      
      // Форматируем срок доставки - максимально надежное извлечение
      let deliveryTime = '5-7';
      
      // Приоритет 1: min-days и max-days (kebab-case из API)
      if (data['min-days'] !== undefined && data['max-days'] !== undefined) {
        const min = Number(data['min-days']) || 5;
        const max = Number(data['max-days']) || 7;
        deliveryTime = `${min}-${max}`;
      }
      // Приоритет 2: minDays и maxDays (camelCase)
      else if (data.minDays !== undefined && data.maxDays !== undefined) {
        const min = Number(data.minDays) || 5;
        const max = Number(data.maxDays) || 7;
        deliveryTime = `${min}-${max}`;
      }
      // Приоритет 3: deliveryTime как строка
      else if (data.deliveryTime) {
        if (typeof data.deliveryTime === 'string') {
          // Очищаем от лишних слов и символов
          deliveryTime = data.deliveryTime
            .replace(/дней?|дн\.?|days?/gi, '')
            .replace(/[^\d-]/g, '')
            .trim() || '5-7';
        } else if (typeof data.deliveryTime === 'object') {
          // Если это объект с min и max
          const min = Number(data.deliveryTime.min) || 5;
          const max = Number(data.deliveryTime.max) || 7;
          deliveryTime = `${min}-${max}`;
        }
      }
      // Приоритет 4: days (число или строка)
      else if (data.days !== undefined) {
        if (typeof data.days === 'number') {
          deliveryTime = String(data.days);
        } else if (typeof data.days === 'string') {
          deliveryTime = data.days.replace(/дней?|дн\.?/gi, '').trim() || '5-7';
        } else if (typeof data.days === 'object') {
          const min = Number(data.days.min) || 5;
          const max = Number(data.days.max) || 7;
          deliveryTime = `${min}-${max}`;
        }
      }
      // Приоритет 5: delivery-time (kebab-case)
      else if (data['delivery-time']) {
        if (typeof data['delivery-time'] === 'string') {
          deliveryTime = data['delivery-time']
            .replace(/дней?|дн\.?/gi, '')
            .replace(/[^\d-]/g, '')
            .trim() || '5-7';
        } else if (typeof data['delivery-time'] === 'number') {
          deliveryTime = String(data['delivery-time']);
        }
      }
      
      // Убеждаемся, что deliveryTime в правильном формате
      if (!deliveryTime.includes('-') && !isNaN(Number(deliveryTime))) {
        // Если это одно число, добавляем диапазон ±1 день
        const days = Number(deliveryTime);
        deliveryTime = `${Math.max(1, days - 1)}-${days + 1}`;
      }

      return {
        cost: cost,
        deliveryTime: deliveryTime,
        type: data.type || 'standard',
        description: data.description || 'Стандартная доставка Почтой России',
      };
    } catch (error: any) {
      console.error('Ошибка расчета стоимости доставки:', error);
      throw new Error(error.message || 'Не удалось рассчитать стоимость доставки');
    }
  },

  /**
   * Получить информацию о точке выдачи по ID
   */
  async getPostOfficeById(officeId: string): Promise<PostOffice | null> {
    try {
      const { apiKey, apiToken, apiSecret } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'get_post_office',
          apiKey,
          apiToken: apiToken || apiKey, // Токен авторизации приложения
          apiSecret: apiSecret, // Base64(login:password) для X-User-Authorization (обязателен!)
          officeId,
        },
      });

      if (error || !data) {
        return null;
      }

      return {
        id: data.id || officeId,
        name: data.name || 'Отделение Почты России',
        address: data.address || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        workingHours: data.workingHours || '',
        type: data.type || 'post_office',
      };
    } catch (error: any) {
      console.error('Ошибка получения информации о точке выдачи:', error);
      return null;
    }
  },
};

