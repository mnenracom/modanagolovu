import { supabase } from '@/lib/supabase';

export interface MarketplaceSetting {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  apiKey: string;
  apiSecret?: string;
  clientId?: string;
  sellerId?: string;
  isActive: boolean;
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'success' | 'error' | 'pending';
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSetting {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  reviewsApiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceSetting {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  pricesApiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceSales {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  date: string;
  ordersCount: number;
  revenue: number;
  commission: number;
  netRevenue: number;
  itemsSold: number;
  averageOrderValue: number;
  rating: number;
  reviewsCount: number;
  positiveReviewsCount: number;
  viewsCount: number;
  addToCartCount: number;
  conversionRate: number;
  metadata?: Record<string, any>;
}

export interface MarketplaceProduct {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  marketplaceProductId: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  oldPrice?: number;
  stockQuantity: number;
  salesCount: number;
  revenue: number;
  viewsCount: number;
  rating: number;
  reviewsCount: number;
  status: string;
  isVisible: boolean;
  ourProductId?: number;
  images?: string[];
  metadata?: Record<string, any>;
}

export interface MarketplaceOrder {
  id: number;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  marketplaceOrderId: string;
  orderNumber?: string;
  orderDate: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  totalAmount: number;
  commission: number;
  netAmount: number;
  deliveryCost: number;
  items: any[];
  paymentMethod?: string;
  deliveryMethod?: string;
  trackingNumber?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Сервис для работы с маркетплейсами
 */
export const marketplaceService = {
  // ========== Настройки маркетплейсов ==========
  
  /**
   * Получить все настройки маркетплейсов
   */
  async getAllSettings(): Promise<MarketplaceSetting[]> {
    try {
      const { data, error } = await supabase
        .from('marketplace_settings')
        .select('*')
        .order('marketplace_type', { ascending: true })
        .order('account_name', { ascending: true });

      if (error) {
        // Если таблица не существует, возвращаем пустой массив
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Таблица marketplace_settings не существует. Выполните SQL-скрипт create_marketplace_tables.sql');
          return [];
        }
        console.error('Ошибка загрузки настроек маркетплейсов:', error);
        throw error;
      }

      return (data || []).map(transformSettingFromSupabase);
    } catch (error: any) {
      // Если таблица не существует, возвращаем пустой массив
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Таблица marketplace_settings не существует');
        return [];
      }
      throw error;
    }
  },

  /**
   * Получить настройки по типу маркетплейса
   */
  async getSettingsByType(type: 'wildberries' | 'ozon'): Promise<MarketplaceSetting[]> {
    const { data, error } = await supabase
      .from('marketplace_settings')
      .select('*')
      .eq('marketplace_type', type)
      .eq('is_active', true)
      .order('account_name', { ascending: true });

    if (error) {
      console.error('Ошибка загрузки настроек маркетплейса:', error);
      throw error;
    }

    return (data || []).map(transformSettingFromSupabase);
  },

  /**
   * Создать или обновить настройки маркетплейса
   */
  async upsertSetting(setting: Partial<MarketplaceSetting> & { marketplaceType: 'wildberries' | 'ozon'; accountName: string }): Promise<MarketplaceSetting> {
    const supabaseData = transformSettingToSupabase(setting);

    const { data, error } = await supabase
      .from('marketplace_settings')
      .upsert(supabaseData, {
        onConflict: 'marketplace_type,account_name',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения настроек маркетплейса:', error);
      throw error;
    }

    return transformSettingFromSupabase(data);
  },

  /**
   * Удалить настройки маркетплейса
   */
  async deleteSetting(id: number): Promise<void> {
    const { error } = await supabase
      .from('marketplace_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления настроек маркетплейса:', error);
      throw error;
    }
  },

  // ========== Статистика продаж ==========

  /**
   * Получить статистику продаж
   */
  async getSales(params?: {
    marketplaceType?: 'wildberries' | 'ozon';
    accountName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MarketplaceSales[]> {
    try {
      let query = supabase
        .from('marketplace_sales')
        .select('*')
        .order('date', { ascending: false });

      if (params?.marketplaceType) {
        query = query.eq('marketplace_type', params.marketplaceType);
      }
      if (params?.accountName) {
        query = query.eq('account_name', params.accountName);
      }
      if (params?.startDate) {
        query = query.gte('date', params.startDate);
      }
      if (params?.endDate) {
        query = query.lte('date', params.endDate);
      }

      const { data, error } = await query;

      if (error) {
        // Если таблица не существует, возвращаем пустой массив
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Таблица marketplace_sales не существует');
          return [];
        }
        console.error('Ошибка загрузки статистики продаж:', error);
        throw error;
      }

      return (data || []).map(transformSalesFromSupabase);
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.warn('Таблица marketplace_sales не существует');
        return [];
      }
      throw error;
    }
  },

  /**
   * Сохранить статистику продаж
   */
  async saveSales(sales: Partial<MarketplaceSales> & { marketplaceType: 'wildberries' | 'ozon'; accountName: string; date: string }): Promise<MarketplaceSales> {
    const supabaseData = transformSalesToSupabase(sales);

    const { data, error } = await supabase
      .from('marketplace_sales')
      .upsert(supabaseData, {
        onConflict: 'marketplace_type,account_name,date',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения статистики продаж:', error);
      throw error;
    }

    return transformSalesFromSupabase(data);
  },

  // ========== Товары ==========

  /**
   * Получить товары с маркетплейсов
   */
  async getProducts(params?: {
    marketplaceType?: 'wildberries' | 'ozon';
    accountName?: string;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceProduct[]> {
    let query = supabase
      .from('marketplace_products')
      .select('*')
      .order('updated_at', { ascending: false });

    if (params?.marketplaceType) {
      query = query.eq('marketplace_type', params.marketplaceType);
    }
    if (params?.accountName) {
      query = query.eq('account_name', params.accountName);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка загрузки товаров маркетплейсов:', error);
      throw error;
    }

    return (data || []).map(transformProductFromSupabase);
  },

  /**
   * Создать или обновить товар с маркетплейса
   */
  async upsertProduct(product: MarketplaceProduct): Promise<MarketplaceProduct> {
    const supabaseData = transformProductToSupabase(product);

    const { data, error } = await supabase
      .from('marketplace_products')
      .upsert(supabaseData, {
        onConflict: 'marketplace_type,account_name,marketplace_product_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения товара маркетплейса:', error);
      throw error;
    }

    return transformProductFromSupabase(data);
  },

  // ========== Заказы ==========

  /**
   * Сохранить заказ с маркетплейса
   */
  async saveOrder(order: Partial<MarketplaceOrder> & { marketplaceType: 'wildberries' | 'ozon'; accountName: string; marketplaceOrderId: string }): Promise<MarketplaceOrder> {
    const supabaseData = transformOrderToSupabase(order);

    const { data, error } = await supabase
      .from('marketplace_orders')
      .upsert(supabaseData, {
        onConflict: 'marketplace_type,account_name,marketplace_order_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения заказа маркетплейса:', error);
      throw error;
    }

    return transformOrderFromSupabase(data);
  },

  /**
   * Получить заказы с маркетплейсов
   */
  async getOrders(params?: {
    marketplaceType?: 'wildberries' | 'ozon';
    accountName?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<MarketplaceOrder[]> {
    let query = supabase
      .from('marketplace_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (params?.marketplaceType) {
      query = query.eq('marketplace_type', params.marketplaceType);
    }
    if (params?.accountName) {
      query = query.eq('account_name', params.accountName);
    }
    if (params?.startDate) {
      query = query.gte('order_date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('order_date', params.endDate);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка загрузки заказов маркетплейсов:', error);
      throw error;
    }

    return (data || []).map(transformOrderFromSupabase);
  },

  // ========== Настройки отзывов ==========
  
  /**
   * Получить все настройки отзывов
   */
  async getReviewSettings(): Promise<ReviewSetting[]> {
    try {
      const { data, error } = await supabase
        .from('review_settings')
        .select('*')
        .order('marketplace_type', { ascending: true })
        .order('account_name', { ascending: true });

      if (error) {
        // Ошибка 406 может означать проблему с RLS или таблицей
        if (error.code === '42P01' || 
            error.message?.includes('does not exist') || 
            error.message?.includes('relation') || 
            error.message?.includes('table') ||
            error.status === 406) {
          console.warn('⚠ Таблица review_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_REVIEW_SETTINGS.sql');
          return [];
        }
        console.error('Ошибка загрузки настроек отзывов:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        marketplaceType: item.marketplace_type,
        accountName: item.account_name,
        reviewsApiKey: item.reviews_api_key,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error: any) {
      // Обработка различных типов ошибок
      if (error?.code === '42P01' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') || 
          error?.message?.includes('table') ||
          error?.status === 406) {
        console.warn('⚠ Таблица review_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_REVIEW_SETTINGS.sql');
        return [];
      }
      console.error('Неожиданная ошибка при загрузке настроек отзывов:', error);
      throw error;
    }
  },

  /**
   * Получить настройку отзывов по аккаунту
   */
  async getReviewSettingByAccount(marketplaceType: 'wildberries' | 'ozon', accountName: string): Promise<ReviewSetting | null> {
    try {
      const { data, error } = await supabase
        .from('review_settings')
        .select('*')
        .eq('marketplace_type', marketplaceType)
        .eq('account_name', accountName)
        .eq('is_active', true)
        .maybeSingle(); // Используем maybeSingle вместо single для более мягкой обработки отсутствия записи

      if (error) {
        // Ошибка 406 может означать проблему с RLS или таблицей
        if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406) {
          console.warn(`⚠ Настройка отзывов не найдена для ${marketplaceType} / ${accountName}:`, error.message);
          return null;
        }
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
          console.warn('⚠ Таблица review_settings не существует. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_REVIEW_SETTINGS.sql');
          return null;
        }
        console.error('Ошибка получения настройки отзывов:', error);
        throw error;
      }

      if (!data) {
        console.warn(`⚠ Настройка отзывов не найдена для ${marketplaceType} / ${accountName}`);
        return null;
      }

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        reviewsApiKey: data.reviews_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      // Обработка различных типов ошибок
      if (error?.code === '42P01' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') || 
          error?.message?.includes('table') ||
          error?.status === 406) {
        console.warn('⚠ Таблица review_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_REVIEW_SETTINGS.sql');
        return null;
      }
      console.error('Неожиданная ошибка при получении настройки отзывов:', error);
      throw error;
    }
  },

  /**
   * Сохранить или обновить настройку отзывов
   */
  async upsertReviewSetting(setting: Partial<ReviewSetting>): Promise<ReviewSetting> {
    if (!setting.marketplaceType || !setting.accountName || !setting.reviewsApiKey) {
      throw new Error('Заполните все обязательные поля: marketplaceType, accountName, reviewsApiKey');
    }

    const existing = await this.getReviewSettingByAccount(setting.marketplaceType, setting.accountName);

    const dataToSave: any = {
      marketplace_type: setting.marketplaceType,
      account_name: setting.accountName,
      reviews_api_key: setting.reviewsApiKey,
      is_active: setting.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabase
        .from('review_settings')
        .update(dataToSave)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        reviewsApiKey: data.reviews_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } else {
      dataToSave.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('review_settings')
        .insert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        reviewsApiKey: data.reviews_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  },

  /**
   * Удалить настройку отзывов
   */
  async deleteReviewSetting(id: number): Promise<void> {
    const { error } = await supabase
      .from('review_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления настройки отзывов:', error);
      throw error;
    }
  },

  // ========== Настройки цен ==========
  
  /**
   * Получить все настройки цен
   */
  async getPriceSettings(): Promise<PriceSetting[]> {
    try {
      const { data, error } = await supabase
        .from('price_settings')
        .select('*')
        .order('marketplace_type', { ascending: true })
        .order('account_name', { ascending: true });

      if (error) {
        if (error.code === '42P01' || 
            error.message?.includes('does not exist') || 
            error.message?.includes('relation') || 
            error.message?.includes('table') ||
            error.status === 406) {
          console.warn('⚠ Таблица price_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_PRICE_SETTINGS.sql');
          return [];
        }
        console.error('Ошибка загрузки настроек цен:', error);
        throw error;
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        marketplaceType: item.marketplace_type,
        accountName: item.account_name,
        pricesApiKey: item.prices_api_key,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error: any) {
      if (error?.code === '42P01' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') || 
          error?.message?.includes('table') ||
          error?.status === 406) {
        console.warn('⚠ Таблица price_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_PRICE_SETTINGS.sql');
        return [];
      }
      console.error('Неожиданная ошибка при загрузке настроек цен:', error);
      throw error;
    }
  },

  /**
   * Получить настройку цен по аккаунту
   */
  async getPriceSettingByAccount(marketplaceType: 'wildberries' | 'ozon', accountName: string): Promise<PriceSetting | null> {
    try {
      const { data, error } = await supabase
        .from('price_settings')
        .select('*')
        .eq('marketplace_type', marketplaceType)
        .eq('account_name', accountName)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406) {
          console.warn(`⚠ Настройка цен не найдена для ${marketplaceType} / ${accountName}:`, error.message);
          return null;
        }
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
          console.warn('⚠ Таблица price_settings не существует. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_PRICE_SETTINGS.sql');
          return null;
        }
        console.error('Ошибка получения настройки цен:', error);
        throw error;
      }

      if (!data) {
        console.warn(`⚠ Настройка цен не найдена для ${marketplaceType} / ${accountName}`);
        return null;
      }

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        pricesApiKey: data.prices_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      if (error?.code === '42P01' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') || 
          error?.message?.includes('table') ||
          error?.status === 406) {
        console.warn('⚠ Таблица price_settings не существует или недоступна. Выполните SQL скрипт SQL_СОЗДАТЬ_ТАБЛИЦУ_PRICE_SETTINGS.sql');
        return null;
      }
      console.error('Неожиданная ошибка при получении настройки цен:', error);
      throw error;
    }
  },

  /**
   * Сохранить или обновить настройку цен
   */
  async upsertPriceSetting(setting: Partial<PriceSetting>): Promise<PriceSetting> {
    if (!setting.marketplaceType || !setting.accountName || !setting.pricesApiKey) {
      throw new Error('Заполните все обязательные поля: marketplaceType, accountName, pricesApiKey');
    }

    const existing = await this.getPriceSettingByAccount(setting.marketplaceType, setting.accountName);

    const dataToSave: any = {
      marketplace_type: setting.marketplaceType,
      account_name: setting.accountName,
      prices_api_key: setting.pricesApiKey,
      is_active: setting.isActive ?? true,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await supabase
        .from('price_settings')
        .update(dataToSave)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        pricesApiKey: data.prices_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } else {
      dataToSave.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('price_settings')
        .insert(dataToSave)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        marketplaceType: data.marketplace_type,
        accountName: data.account_name,
        pricesApiKey: data.prices_api_key,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  },

  /**
   * Удалить настройку цен
   */
  async deletePriceSetting(id: number): Promise<void> {
    const { error } = await supabase
      .from('price_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления настройки цен:', error);
      throw error;
    }
  },
};

// ========== Функции трансформации ==========

function transformSettingFromSupabase(data: any): MarketplaceSetting {
  return {
    id: data.id,
    marketplaceType: data.marketplace_type,
    accountName: data.account_name,
    apiKey: data.api_key,
    apiSecret: data.api_secret,
    clientId: data.client_id,
    sellerId: data.seller_id,
    isActive: data.is_active,
    syncEnabled: data.sync_enabled,
    syncIntervalMinutes: data.sync_interval_minutes,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    lastSyncError: data.last_sync_error,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function transformSettingToSupabase(setting: Partial<MarketplaceSetting>): any {
  return {
    id: setting.id,
    marketplace_type: setting.marketplaceType,
    account_name: setting.accountName,
    api_key: setting.apiKey,
    api_secret: setting.apiSecret,
    client_id: setting.clientId,
    seller_id: setting.sellerId,
    is_active: setting.isActive,
    sync_enabled: setting.syncEnabled,
    sync_interval_minutes: setting.syncIntervalMinutes,
    last_sync_at: setting.lastSyncAt,
    last_sync_status: setting.lastSyncStatus,
    last_sync_error: setting.lastSyncError,
  };
}

function transformSalesFromSupabase(data: any): MarketplaceSales {
  // Убеждаемся, что все расходы положительные (в базе могут храниться как отрицательные)
  const logistics = Math.abs(parseFloat(data.logistics || 0));
  const storage = Math.abs(parseFloat(data.storage || 0));
  const penalties = Math.abs(parseFloat(data.penalties || 0));
  const returns = Math.abs(parseFloat(data.returns || 0));
  const commission = Math.abs(parseFloat(data.commission || 0));
  const revenue = Math.abs(parseFloat(data.revenue || 0));
  const totalExpenses = Math.abs(parseFloat(data.total_expenses || 0)) || (commission + logistics + storage + penalties + returns);
  // Прибыль = выручка - расходы (может быть отрицательной, если расходы больше выручки)
  const profit = parseFloat(data.profit || 0) || (revenue - totalExpenses);
  
  return {
    id: data.id,
    marketplaceType: data.marketplace_type,
    accountName: data.account_name,
    date: data.date,
    ordersCount: data.orders_count,
    revenue,
    commission,
    logistics,
    storage,
    penalties,
    returns,
    totalExpenses,
    profit,
    netRevenue: profit, // Для обратной совместимости
    itemsSold: data.items_sold,
    averageOrderValue: parseFloat(data.average_order_value || 0),
    rating: parseFloat(data.rating || 0),
    reviewsCount: data.reviews_count,
    positiveReviewsCount: data.positive_reviews_count,
    viewsCount: data.views_count,
    addToCartCount: data.add_to_cart_count,
    conversionRate: parseFloat(data.conversion_rate || 0),
    metadata: data.metadata || {},
  };
}

function transformSalesToSupabase(sales: Partial<MarketplaceSales>): any {
  return {
    id: sales.id,
    marketplace_type: sales.marketplaceType,
    account_name: sales.accountName,
    date: sales.date,
    orders_count: sales.ordersCount,
    revenue: sales.revenue,
    commission: sales.commission,
    logistics: sales.logistics || 0,
    storage: sales.storage || 0,
    penalties: sales.penalties || 0,
    returns: sales.returns || 0,
    total_expenses: sales.totalExpenses || 0,
    profit: sales.profit || 0,
    net_revenue: sales.profit || sales.netRevenue || 0, // Для обратной совместимости
    items_sold: sales.itemsSold,
    average_order_value: sales.averageOrderValue,
    rating: sales.rating,
    reviews_count: sales.reviewsCount,
    positive_reviews_count: sales.positiveReviewsCount,
    views_count: sales.viewsCount,
    add_to_cart_count: sales.addToCartCount,
    conversion_rate: sales.conversionRate,
    metadata: sales.metadata || {},
  };
}

function transformProductToSupabase(product: Partial<MarketplaceProduct>): any {
  // Убираем id=0 или undefined, чтобы не было конфликта при upsert
  // При upsert id должен быть либо не передан, либо существующий
  const result: any = {
    marketplace_type: product.marketplaceType,
    account_name: product.accountName,
    marketplace_product_id: product.marketplaceProductId,
    name: product.name || 'Без названия', // Обязательное поле, не может быть null
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    price: product.price || 0,
    old_price: product.oldPrice,
    stock_quantity: product.stockQuantity || 0,
    sales_count: product.salesCount || 0,
    revenue: product.revenue || 0,
    views_count: product.viewsCount || 0,
    rating: product.rating || 0,
    reviews_count: product.reviewsCount || 0,
    status: product.status || 'active',
    is_visible: product.isVisible !== undefined ? product.isVisible : true,
    our_product_id: product.ourProductId,
    images: product.images || [],
    metadata: product.metadata || {},
  };
  
  // Добавляем id только если он существует и не равен 0 (для обновления существующей записи)
  if (product.id && product.id > 0) {
    result.id = product.id;
  }
  
  return result;
}

function transformProductFromSupabase(data: any): MarketplaceProduct {
  return {
    id: data.id,
    marketplaceType: data.marketplace_type,
    accountName: data.account_name,
    marketplaceProductId: data.marketplace_product_id,
    name: data.name,
    sku: data.sku,
    barcode: data.barcode,
    category: data.category,
    price: parseFloat(data.price || 0),
    oldPrice: data.old_price ? parseFloat(data.old_price) : undefined,
    stockQuantity: data.stock_quantity,
    salesCount: data.sales_count,
    revenue: parseFloat(data.revenue || 0),
    viewsCount: data.views_count,
    rating: parseFloat(data.rating || 0),
    reviewsCount: data.reviews_count,
    status: data.status,
    isVisible: data.is_visible,
    ourProductId: data.our_product_id,
    images: data.images || [],
    metadata: data.metadata || {},
  };
}

function transformOrderToSupabase(order: Partial<MarketplaceOrder>): any {
  return {
    id: order.id,
    marketplace_type: order.marketplaceType,
    account_name: order.accountName,
    marketplace_order_id: order.marketplaceOrderId,
    order_number: order.orderNumber,
    order_date: order.orderDate,
    status: order.status,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    customer_email: order.customerEmail,
    delivery_address: order.deliveryAddress,
    total_amount: order.totalAmount,
    commission: order.commission,
    net_amount: order.netAmount,
    delivery_cost: order.deliveryCost,
    items: order.items || [],
    payment_method: order.paymentMethod,
    delivery_method: order.deliveryMethod,
    tracking_number: order.trackingNumber,
    notes: order.notes,
    metadata: order.metadata || {},
  };
}

function transformOrderFromSupabase(data: any): MarketplaceOrder {
  return {
    id: data.id,
    marketplaceType: data.marketplace_type,
    accountName: data.account_name,
    marketplaceOrderId: data.marketplace_order_id,
    orderNumber: data.order_number,
    orderDate: data.order_date,
    status: data.status,
    customerName: data.customer_name,
    customerPhone: data.customer_phone,
    customerEmail: data.customer_email,
    deliveryAddress: data.delivery_address,
    totalAmount: parseFloat(data.total_amount || 0),
    commission: parseFloat(data.commission || 0),
    netAmount: parseFloat(data.net_amount || 0),
    deliveryCost: parseFloat(data.delivery_cost || 0),
    items: data.items || [],
    paymentMethod: data.payment_method,
    deliveryMethod: data.delivery_method,
    trackingNumber: data.tracking_number,
    notes: data.notes,
    metadata: data.metadata || {},
  };
}

