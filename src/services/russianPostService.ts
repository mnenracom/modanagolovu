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
   * Получить API ключ и токен из настроек
   */
  async getApiCredentials(): Promise<{ apiKey: string | null; apiToken: string | null }> {
    try {
      // Получаем API ключ и токен из настроек доставки (delivery_services)
      const { data, error } = await supabase
        .from('delivery_services')
        .select('api_key, api_secret, settings')
        .eq('code', 'russian_post')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.warn('API ключ Почты России не найден в настройках');
        return { apiKey: null, apiToken: null };
      }

      // API ключ (Authorization-Key)
      const apiKey = data.api_key || data.settings?.api_key || data.settings?.authorization_key || null;
      
      // API токен (AccessToken) - может быть в api_secret или settings
      const apiToken = data.api_secret || data.settings?.api_token || data.settings?.access_token || data.settings?.authorization_token || null;

      return { apiKey, apiToken };
    } catch (error) {
      console.error('Ошибка получения API ключа Почты России:', error);
      return { apiKey: null, apiToken: null };
    }
  },

  /**
   * Поиск точек выдачи по адресу
   * Использует ТОЛЬКО Edge Function (без прямых запросов с клиента)
   */
  async searchPostOffices(address: AddressData): Promise<PostOffice[]> {
    try {
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      // Используем ТОЛЬКО Edge Function
      // Согласно документации API Почты России:
      // - apiToken - это токен авторизации приложения (AccessToken)
      // - userAuth - это base64(login:password) для X-User-Authorization (опционально)
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'search_post_offices',
          apiToken: apiToken || apiKey, // Токен авторизации приложения (обязателен)
          apiKey: apiKey, // Для обратной совместимости
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
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      // Вызываем Edge Function для расчета стоимости
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'calculate_delivery',
          apiKey,
          apiToken, // Может быть null, функция использует apiKey как fallback
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

      return {
        cost: data.cost,
        deliveryTime: data.deliveryTime || data.days || '5-7',
        type: data.type || 'standard',
        description: data.description,
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
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'get_post_office',
          apiKey,
          apiToken, // Может быть null, функция использует apiKey как fallback
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

