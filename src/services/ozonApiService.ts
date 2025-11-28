/**
 * Сервис для работы с API OZON
 * Документация: https://docs.ozon.ru/api/seller/
 */

export interface OzonConfig {
  apiKey: string;
  clientId: string;
}

export interface OzonOrder {
  order_id: number;
  order_number: string;
  posting_number: string;
  status: string;
  delivery_method?: {
    id: number;
    name: string;
    warehouse_id: number;
    warehouse: string;
    tpl_provider_id: number;
    tpl_provider: string;
  };
  tracking_number?: string;
  tpl_integration_type?: string;
  in_process_at?: string;
  shipment_date?: string;
  delivery_date?: string;
  cancellation_reason_id?: number;
  cancellation_type?: string;
  cancel_reason?: string;
  created_at: string;
  customer?: {
    customer_id: number;
    name: string;
    phone: string;
    email?: string;
  };
  addressee?: {
    name: string;
    phone: string;
  };
  barcodes?: {
    upper_barcode?: string;
    lower_barcode?: string;
  };
  products: Array<{
    price: string;
    offer_id: string;
    name: string;
    sku: number;
    quantity: number;
    mandatory_mark?: string[];
  }>;
  financial_data?: {
    products: Array<{
      product_id: number;
      price: string;
      commission_amount: string;
      commission_percent: number;
      payout: string;
      product_discount_amount: string;
      product_discount_percent: number;
      item_services?: {
        marketplace_service_item_fulfillment?: number;
        marketplace_service_item_pickup?: number;
        marketplace_service_item_dropoff_pvz?: number;
        marketplace_service_item_dropoff_sc?: number;
        marketplace_service_item_dropoff_ff?: number;
        marketplace_service_item_direct_flow_trans?: number;
        marketplace_service_item_deliv_to_customer?: number;
        marketplace_service_item_return_flow_trans?: number;
        marketplace_service_item_return_flow_not_deliv_to_customer?: number;
        marketplace_service_item_return_part_goods_customer?: number;
        marketplace_service_item_return_after_deliv_to_customer?: number;
      };
    }>;
    posting_services?: {
      marketplace_service_item_fulfillment?: number;
      marketplace_service_item_pickup?: number;
      marketplace_service_item_dropoff_pvz?: number;
      marketplace_service_item_dropoff_sc?: number;
      marketplace_service_item_dropoff_ff?: number;
      marketplace_service_item_direct_flow_trans?: number;
      marketplace_service_item_deliv_to_customer?: number;
      marketplace_service_item_return_flow_trans?: number;
      marketplace_service_item_return_flow_not_deliv_to_customer?: number;
      marketplace_service_item_return_part_goods_customer?: number;
      marketplace_service_item_return_after_deliv_to_customer?: number;
    };
  };
  analytics_data?: {
    region: string;
    city: string;
    delivery_type: string;
    is_premium: boolean;
    payment_type_group_name: string;
    warehouse_id: number;
    warehouse_name: string;
    is_legal: boolean;
  };
}

export interface OzonProduct {
  product_id: number;
  offer_id: string;
  name: string;
  barcode?: string;
  barcodes?: string[];
  buybox_price?: string;
  category_id: number;
  category_name?: string;
  currency_code: string;
  currency_code_name?: string;
  marketing_price?: string;
  min_ozon_price?: string;
  old_price?: string;
  premium_price?: string;
  price: string;
  recommended_price?: string;
  min_price?: string;
  sources?: Array<{
    is_enabled: boolean;
    sku: number;
    source: string;
  }>;
  status: string;
  stocks?: {
    coming: number;
    present: number;
    reserved: number;
  };
  vat: string;
  visible: boolean;
  visibility_details?: {
    has_price: boolean;
    has_stock: boolean;
    active_product: boolean;
  };
  visible_product_name?: string;
  images?: string[];
  color_image?: string;
  images360?: string[];
  primary_image?: string;
  status_state?: string;
  status_state_name?: string;
  status_failed?: string[];
  status_moderate?: string[];
  status_reject?: Array<{
    reject_reason: string;
    reject_comment: string;
  }>;
  status_validation_failed?: string[];
  status_validation_success?: string[];
  status_complete?: string[];
  status_create?: string[];
  status_connecting?: string[];
  status_quality_check?: string[];
  status_archive?: string[];
  status_overprice?: string[];
  status_delisting?: string[];
  errors?: string[];
  warnings?: string[];
  info?: string[];
  is_archived: boolean;
  is_created: boolean;
  is_creating: boolean;
  is_updated: boolean;
  is_updating: boolean;
  is_visible: boolean;
  is_kgt: boolean;
  is_prepayment: boolean;
  is_prepayment_allowed: boolean;
  images_count?: number;
  is_discounted?: boolean;
  has_discounted_item?: boolean;
}

export interface OzonAnalytics {
  date: string;
  ordered_units: number;
  revenue: number;
  returns: number;
  cancellations: number;
  delivered_units: number;
  adv_view_pdp: number;
  adv_view_all_category: number;
  adv_view_search_category: number;
  adv_view_all_brand: number;
  adv_view_search_brand: number;
  adv_sum_all: number;
  adv_sum_pdp: number;
  adv_sum_all_category: number;
  adv_sum_search_category: number;
  adv_sum_all_brand: number;
  adv_sum_search_brand: number;
  position_category: number;
  position_search: number;
  discounts: number;
  promo: number;
}

export interface OzonReview {
  review_id: number;
  product_id: number;
  sku: number;
  offer_id: string;
  rating: number; // 1-5
  text: string;
  created_at: string;
  updated_at: string;
  state: string; // 'approved', 'rejected', 'published', etc.
  photos?: string[];
  video?: string;
  author?: {
    name: string;
    avatar?: string;
  };
  answer?: {
    text: string;
    created_at: string;
  };
  pros?: string;
  cons?: string;
  verified_purchase: boolean;
}

/**
 * Интерфейс для финансового отчета OZON (аналог WBSalesReport)
 * Получается из /v3/finance/transaction/list
 */
export interface OzonSalesReport {
  operation_id: number;
  operation_type: string; // "operation", "operation_with_cancel", "delivery", "return_delivery", "return", "services", "other_deductions", "other_payments", "correction"
  operation_type_name: string;
  operation_date: string; // Дата операции
  operation_type_id: number;
  delivery_charge?: number; // Стоимость доставки
  return_delivery_charge?: number; // Стоимость возврата доставки
  accruals_for_sale?: number; // Начисления за продажу
  sale_commission?: number; // Комиссия за продажу
  amount?: number; // Сумма операции
  type?: string; // "orders", "returns", "services", "other"
  posting?: {
    posting_number: string;
    order_date: string;
    delivery_date?: string;
    status: string;
  };
  items?: Array<{
    name: string;
    sku: number;
    quantity: number;
    price: number;
    commission_amount?: number;
    commission_percent?: number;
    payout?: number;
    delivery_amount?: number;
    return_amount?: number;
  }>;
  services?: Array<{
    name: string;
    price: number;
  }>;
  // Дополнительные поля для детализации расходов
  accruals_for_sale_delivery?: number; // Начисления за доставку
  sale_commission_delivery?: number; // Комиссия за доставку
  accruals_for_sale_return?: number; // Начисления за возврат
  sale_commission_return?: number; // Комиссия за возврат
  storage_fee?: number; // Плата за хранение
  penalty?: number; // Штрафы
  other_deductions?: number; // Прочие удержания
}

/**
 * Сервис для работы с API OZON
 */
export class OzonApiService {
  private apiKey: string;
  private clientId: string;
  private baseUrl = 'https://api-seller.ozon.ru';

  constructor(config: OzonConfig) {
    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
  }

  /**
   * Выполнить запрос к API OZON
   */
  private async request(endpoint: string, method: string = 'POST', body?: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Client-Id': this.clientId,
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OZON API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Ошибка запроса к OZON API (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Получить список заказов
   * @param dateFrom Дата начала (формат: ISO 8601)
   * @param dateTo Дата окончания (формат: ISO 8601)
   * @param limit Лимит заказов
   * @param offset Смещение
   */
  async getOrders(dateFrom: string, dateTo: string, limit: number = 100, offset: number = 0): Promise<OzonOrder[]> {
    try {
      // OZON API требует формат ISO 8601 с временем (RFC3339)
      // Конвертируем YYYY-MM-DD в ISO 8601, если нужно
      const sinceISO = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00Z`;
      const toISO = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59Z`;
      
      const response = await this.request('/v3/posting/fbs/list', 'POST', {
        dir: 'ASC',
        filter: {
          since: sinceISO,
          to: toISO,
          status: '',
        },
        limit,
        offset,
        with: {
          analytics_data: true,
          financial_data: true,
        },
      });

      return response.result?.postings || [];
    } catch (error) {
      console.error('Ошибка получения заказов OZON:', error);
      throw error;
    }
  }

  /**
   * Получить список товаров
   * @param limit Лимит товаров
   * @param offset Смещение
   */
  async getProducts(limit: number = 100, offset: number = 0): Promise<OzonProduct[]> {
    try {
      const response = await this.request('/v3/product/list', 'POST', {
        filter: {
          visibility: 'ALL',
        },
        limit,
        offset,
        last_id: '',
        sort_dir: 'ASC',
      });

      return response.result?.items || [];
    } catch (error) {
      console.error('Ошибка получения товаров OZON:', error);
      throw error;
    }
  }

  /**
   * Получить аналитику за период
   * @param dateFrom Дата начала (формат: YYYY-MM-DD)
   * @param dateTo Дата окончания (формат: YYYY-MM-DD)
   */
  async getAnalytics(dateFrom: string, dateTo: string): Promise<OzonAnalytics[]> {
    try {
      const response = await this.request('/v1/analytics/data', 'POST', {
        date_from: dateFrom,
        date_to: dateTo,
        dimension: ['day'],
        metrics: [
          'ordered_units',
          'revenue',
          'returns',
          'cancellations',
          'delivered_units',
          'adv_view_pdp',
          'adv_view_all_category',
          'adv_view_search_category',
          'adv_view_all_brand',
          'adv_view_search_brand',
          'adv_sum_all',
          'adv_sum_pdp',
          'adv_sum_all_category',
          'adv_sum_search_category',
          'adv_sum_all_brand',
          'adv_sum_search_brand',
          'position_category',
          'position_search',
          'discounts',
          'promo',
          'stocks',
        ],
        limit: 1000, // OZON API требует limit в диапазоне (0, 1000]
        offset: 0,
      });

      return response.result?.data || [];
    } catch (error) {
      console.error('Ошибка получения аналитики OZON:', error);
      throw error;
    }
  }

  /**
   * Получить детальный финансовый отчет о продажах (аналог WB getSalesReport)
   * Использует /v3/finance/transaction/list для получения всех финансовых транзакций
   * @param dateFrom Дата начала (формат: YYYY-MM-DD или ISO 8601)
   * @param dateTo Дата окончания (формат: YYYY-MM-DD или ISO 8601)
   */
  async getSalesReport(dateFrom: string, dateTo: string): Promise<OzonSalesReport[]> {
    try {
      // Конвертируем даты в формат ISO 8601, если нужно
      const dateFromISO = dateFrom.includes('T') ? dateFrom : `${dateFrom}T00:00:00Z`;
      const dateToISO = dateTo.includes('T') ? dateTo : `${dateTo}T23:59:59Z`;

      const allTransactions: OzonSalesReport[] = [];
      let page = 1;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const response = await this.request('/v3/finance/transaction/list', 'POST', {
          filter: {
            date: {
              from: dateFromISO,
              to: dateToISO,
            },
            operation_type: [], // Пустой массив = все типы операций
            posting_number: '',
            transaction_type: 'all', // 'all', 'orders', 'returns', 'services', 'other'
          },
          page,
          page_size: pageSize,
        });

        const transactions = response.result?.operations || [];
        allTransactions.push(...transactions);

        // Проверяем, есть ли еще страницы
        hasMore = transactions.length === pageSize;
        page++;
      }

      return allTransactions;
    } catch (error) {
      console.error('Ошибка получения финансового отчета OZON:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать данные за период
   */
  async syncData(dateFrom: string, dateTo: string) {
    try {
      const [orders, analytics, salesReport] = await Promise.all([
        this.getOrders(dateFrom, dateTo).catch(err => {
          console.warn('Ошибка получения заказов OZON (продолжаем без них):', err.message);
          return [];
        }),
        this.getAnalytics(dateFrom, dateTo).catch(err => {
          console.warn('Ошибка получения аналитики OZON (продолжаем без неё):', err.message);
          return [];
        }),
        this.getSalesReport(dateFrom, dateTo).catch(err => {
          console.warn('Ошибка получения финансового отчета OZON (продолжаем без него):', err.message);
          return [];
        }),
      ]);

      return {
        orders,
        analytics,
        salesReport,
      };
    } catch (error) {
      console.error('Ошибка синхронизации данных OZON:', error);
      throw error;
    }
  }

  /**
   * Получить отзывы для товара
   * @param productId ID товара на OZON
   * @param limit Лимит отзывов
   * @param offset Смещение
   */
  async getReviews(productId: number, limit: number = 30, offset: number = 0): Promise<OzonReview[]> {
    try {
      const response = await this.request('/v1/review/list', 'POST', {
        filter: {
          product_id: [productId],
        },
        limit,
        offset,
        sort_dir: 'DESC',
        sort_by: 'created_at',
      });

      return response.result?.reviews || [];
    } catch (error) {
      console.error('Ошибка получения отзывов OZON:', error);
      // Не бросаем ошибку, просто возвращаем пустой массив
      return [];
    }
  }
}

