import { supabase } from '@/lib/supabase';
import { DeliveryService } from '@/types/delivery';

// Преобразование из Supabase формата
function transformFromSupabase(data: any): DeliveryService {
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type,
    isActive: data.is_active ?? true,
    isEnabled: data.is_enabled ?? true,
    apiKey: data.api_key,
    apiSecret: data.api_secret,
    accountId: data.account_id,
    senderCityId: data.sender_city_id,
    senderAddress: data.sender_address,
    apiUrl: data.api_url,
    webhookUrl: data.webhook_url,
    deliveryTypes: data.delivery_types || [],
    calculateCost: data.calculate_cost ?? true,
    defaultCost: data.default_cost,
    freeDeliveryThreshold: data.free_delivery_threshold,
    trackingEnabled: data.tracking_enabled ?? true,
    trackingApiEndpoint: data.tracking_api_endpoint,
    trackingUpdateInterval: data.tracking_update_interval || 3600,
    statusMapping: data.status_mapping || {},
    settings: data.settings || {},
    description: data.description,
    iconUrl: data.icon_url,
    websiteUrl: data.website_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат
function transformToSupabase(data: Partial<DeliveryService>): any {
  const result: any = {};
  if ('name' in data) result.name = data.name;
  if ('code' in data) result.code = data.code;
  if ('type' in data) result.type = data.type;
  if ('isActive' in data) result.is_active = data.isActive;
  if ('isEnabled' in data) result.is_enabled = data.isEnabled;
  if ('apiKey' in data) result.api_key = data.apiKey;
  if ('apiSecret' in data) result.api_secret = data.apiSecret;
  if ('accountId' in data) result.account_id = data.accountId;
  if ('senderCityId' in data) result.sender_city_id = data.senderCityId;
  if ('senderAddress' in data) result.sender_address = data.senderAddress;
  if ('apiUrl' in data) result.api_url = data.apiUrl;
  if ('webhookUrl' in data) result.webhook_url = data.webhookUrl;
  if ('deliveryTypes' in data) result.delivery_types = data.deliveryTypes || [];
  if ('calculateCost' in data) result.calculate_cost = data.calculateCost;
  if ('defaultCost' in data) result.default_cost = data.defaultCost;
  if ('freeDeliveryThreshold' in data) result.free_delivery_threshold = data.freeDeliveryThreshold;
  if ('trackingEnabled' in data) result.tracking_enabled = data.trackingEnabled;
  if ('trackingApiEndpoint' in data) result.tracking_api_endpoint = data.trackingApiEndpoint;
  if ('trackingUpdateInterval' in data) result.tracking_update_interval = data.trackingUpdateInterval;
  if ('statusMapping' in data) result.status_mapping = data.statusMapping || {};
  if ('settings' in data) result.settings = data.settings || {};
  if ('description' in data) result.description = data.description;
  if ('iconUrl' in data) result.icon_url = data.iconUrl;
  if ('websiteUrl' in data) result.website_url = data.websiteUrl;
  return result;
}

export const deliveryServicesService = {
  /**
   * Получить все активные службы доставки
   */
  async getActive(): Promise<DeliveryService[]> {
    const { data, error } = await supabase
      .from('delivery_services')
      .select('*')
      .eq('is_active', true)
      .eq('is_enabled', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения служб доставки:', error);
      throw new Error(`Ошибка получения служб доставки: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Получить все службы доставки (для админки)
   */
  async getAll(): Promise<DeliveryService[]> {
    const { data, error } = await supabase
      .from('delivery_services')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения служб доставки:', error);
      throw new Error(`Ошибка получения служб доставки: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  /**
   * Получить службу доставки по ID
   */
  async getById(id: number): Promise<DeliveryService | null> {
    const { data, error } = await supabase
      .from('delivery_services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Ошибка получения службы доставки:', error);
      throw new Error(`Ошибка получения службы доставки: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  /**
   * Получить службу доставки по коду
   */
  async getByCode(code: string): Promise<DeliveryService | null> {
    const { data, error } = await supabase
      .from('delivery_services')
      .select('*')
      .eq('code', code)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Ошибка получения службы доставки:', error);
      throw new Error(`Ошибка получения службы доставки: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  /**
   * Создать или обновить службу доставки
   */
  async upsert(service: Partial<DeliveryService> & { code: string }): Promise<DeliveryService> {
    const supabaseData = transformToSupabase(service);

    const { data, error } = await supabase
      .from('delivery_services')
      .upsert(supabaseData, {
        onConflict: 'code',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения службы доставки:', error);
      throw new Error(`Ошибка сохранения службы доставки: ${error.message}`);
    }

    return transformFromSupabase(data);
  },

  /**
   * Удалить службу доставки
   */
  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('delivery_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления службы доставки:', error);
      throw new Error(`Ошибка удаления службы доставки: ${error.message}`);
    }
  },

  /**
   * Получить статус доставки по номеру отслеживания
   */
  async getTrackingStatus(
    serviceCode: string,
    trackingNumber: string
  ): Promise<{ status: string; history: any[]; location?: string } | null> {
    const service = await this.getByCode(serviceCode);
    
    if (!service || !service.trackingEnabled || !service.trackingApiEndpoint) {
      return null;
    }

    // Здесь будет интеграция с API службы доставки
    // Пока возвращаем заглушку
    // TODO: Реализовать интеграцию с конкретными службами доставки
    
    return {
      status: 'in_transit',
      history: [
        {
          status: 'accepted',
          timestamp: new Date().toISOString(),
          location: 'Москва',
        },
        {
          status: 'in_transit',
          timestamp: new Date().toISOString(),
          location: 'В пути',
        },
      ],
    };
  },
};




