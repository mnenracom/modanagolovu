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
   * Выполнить прямой запрос к API Почты России с клиента (браузера)
   * Это обходит проблему блокировки IP Supabase Edge Functions
   */
  async makeDirectApiRequest(
    endpoint: string,
    apiKey: string,
    apiToken: string | null,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<any> {
    const url = `https://otpravka.pochta.ru${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `AccessToken ${apiToken || apiKey}`,
      'Authorization-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        
        // Специальная обработка ошибки 417
        if (response.status === 417) {
          throw new Error('API Почты России заблокировал запрос. Возможно, требуется настройка белого списка IP или использование виджета.');
        }
        
        throw new Error(`API Почты России вернул ошибку ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        const text = await response.text();
        throw new Error('API вернул не JSON ответ');
      }
    } catch (error: any) {
      console.error(`Ошибка запроса к API Почты России (${endpoint}):`, error);
      throw error;
    }
  },

  /**
   * Поиск точек выдачи по адресу
   * Пробует сначала через Edge Function, затем напрямую с клиента
   */
  async searchPostOffices(address: AddressData): Promise<PostOffice[]> {
    try {
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ Почты России не настроен. Настройте его в админ-панели → Доставка → Службы доставки');
      }

      // Сначала пробуем через Edge Function
      try {
        const { data, error } = await supabase.functions.invoke('russian-post-api', {
          body: {
            action: 'search_post_offices',
            apiKey,
            apiToken,
            address: {
              city: address.city,
              region: address.region,
              postalCode: address.postalCode,
              latitude: address.latitude,
              longitude: address.longitude,
            },
          },
        });

        if (!error && data && !data.error && data.postOffices) {
          // Успешно получили данные через Edge Function
          const realOffices = data.postOffices.filter((office: any) => {
            return !office.name?.toLowerCase().includes('тест') && 
                   !office.address?.toLowerCase().includes('примерная');
          });

          if (realOffices.length > 0) {
            return realOffices.map((office: any) => ({
              id: office.id || office.code || `${office.latitude}_${office.longitude}`,
              name: office.name || office.fullName || 'Отделение Почты России',
              address: office.address || office.fullAddress || '',
              latitude: office.latitude || office.lat || 0,
              longitude: office.longitude || office.lon || office.lng || 0,
              workingHours: office.workingHours || office.schedule || '',
              distance: office.distance,
              type: office.type || 'post_office',
            }));
          }
        }
      } catch (edgeError: any) {
        console.warn('Edge Function не сработала, пробуем прямой запрос:', edgeError.message);
      }

      // Если Edge Function не сработала (блокировка IP), пробуем прямой запрос с клиента
      console.log('Выполняем прямой запрос к API Почты России с клиента');
      
      try {
        // Прямой запрос к API с клиента (браузера)
        // Это обходит блокировку IP Supabase, но может не работать из-за CORS
        const queryParams = new URLSearchParams({
          filter: 'ALL',
          top: '50',
        });

        if (address.postalCode) {
          queryParams.append('postalCode', address.postalCode);
        }

        const officesResponse = await this.makeDirectApiRequest(
          `/1.0/office?${queryParams.toString()}`,
          apiKey,
          apiToken,
          'GET'
        );

        // Преобразуем ответ
        let postOffices: any[] = [];
        
        if (Array.isArray(officesResponse)) {
          const cityName = address.city.trim();
          
          postOffices = officesResponse
            .filter((office: any) => {
              const officeCity = office?.address?.city || office?.city || '';
              const matchesCity = officeCity.toLowerCase().includes(cityName.toLowerCase()) ||
                                 cityName.toLowerCase().includes(officeCity.toLowerCase());
              return matchesCity;
            })
            .slice(0, 20)
            .map((office: any) => {
              let type = 'post_office';
              if (office.type === 'POSTAMAT' || office.type === 'постамат') {
                type = 'postamat';
              } else if (office.type === 'TERMINAL' || office.type === 'терминал') {
                type = 'terminal';
              }

              const officeAddress = office.address?.source || 
                                  office.address?.addressString ||
                                  `${office.address?.city || ''}, ${office.address?.street || ''}, ${office.address?.house || ''}`.trim() ||
                                  office.address ||
                                  'Адрес не указан';

              const officeName = office.name || 
                                office.description ||
                                `Отделение Почты России ${office.index || office.postalCode || ''}` ||
                                'Отделение Почты России';

              const workingHours = office.workTime || 
                                 office.workingHours ||
                                 office.schedule ||
                                 'Не указано';

              return {
                id: office.index || office.postalCode || office.id || `${office.latitude}_${office.longitude}`,
                name: officeName,
                address: officeAddress,
                latitude: office.latitude || office.coordinates?.latitude || 0,
                longitude: office.longitude || office.coordinates?.longitude || 0,
                workingHours: workingHours,
                distance: office.distance || null,
                type: type,
              };
            });
        }

        if (postOffices.length === 0) {
          throw new Error('Отделения не найдены для указанного города');
        }

        return postOffices;
      } catch (directError: any) {
        console.error('Прямой запрос также не сработал:', directError);
        
        // Если и прямой запрос не сработал (CORS), предлагаем альтернативу
        if (directError.message?.includes('CORS') || directError.message?.includes('Failed to fetch')) {
          throw new Error(
            'Не удалось подключиться к API Почты России из-за ограничений CORS. ' +
            'Рекомендуется: 1) Обратиться в поддержку Почты России для добавления вашего домена в белый список CORS, ' +
            '2) Или использовать виджет Почты России для выбора точек выдачи.'
          );
        }
        
        throw directError;
      }
    } catch (error: any) {
      console.error('Ошибка поиска точек выдачи:', error);
      
      // Специальная обработка ошибки 417 (блокировка IP)
      if (error.message?.includes('417') || error.message?.includes('заблокирован')) {
        throw new Error(
          'API Почты России заблокировал запрос. ' +
          'Рекомендуется обратиться в поддержку Почты России (support@pochta.ru) для настройки доступа. ' +
          'Альтернатива: использовать виджет Почты России для выбора точек выдачи.'
        );
      }
      
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

      if (!data) {
        throw new Error('Не получены данные о стоимости доставки');
      }

      return {
        cost: data.cost || 0,
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

