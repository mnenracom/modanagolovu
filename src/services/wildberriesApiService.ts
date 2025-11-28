/**
 * Сервис для работы с API WildBerries
 * Документация: https://openapi.wildberries.ru/
 */

import { supabase } from '@/lib/supabase';

// Используем прокси через Supabase Edge Functions для обхода CORS
const USE_PROXY = true; // Включить прокси через Edge Functions

export interface WBConfig {
  apiKey: string;
  sellerId?: string;
}

export interface WBOrder {
  orderId: string;
  date: string;
  lastChangeDate: string;
  supplierArticle: string;
  techSize: string;
  barcode: string;
  totalPrice: number;
  discountPercent: number;
  warehouseName: string;
  oblast: string;
  incomeID: number;
  odid: number;
  nmId: number;
  subject: string;
  category: string;
  brand: string;
  isCancel: boolean;
  cancel_dt?: string;
  gNumber: string;
  sticker?: string;
  srid?: string;
}

export interface WBProduct {
  nmId: number;
  name: string;
  brand: string;
  brandId: number;
  siteBrandId: number;
  supplierId: number;
  sale: number;
  price: number;
  salePrice: number;
  rating: number;
  feedbacks: number;
  colors: string[];
  quantity: number;
  category: string;
  rootCategory: string;
  kpp: number;
  photos: string[];
  promoTextCard?: string;
  promoTextCat?: string;
  supplierArticle?: string; // Артикул продавца (важно для связи с нашей базой)
}

export interface WBReview {
  id: string;
  nmId: number;
  text: string;
  productValuation: number; // Рейтинг 1-5
  createdDate: string;
  state: string; // 'none', 'wbRu', 'wbRuApproved', etc.
  answer?: {
    text: string;
    state: string;
    editable: boolean;
  };
  productDetails?: {
    nmId: number;
    imtId: number;
    productName: string;
    supplierArticle: string;
    supplierName: string;
    brand: string;
    country: string;
  };
  photoLinks?: string[];
  video?: {
    link: string;
    thumbnail: string;
  };
  wasViewed: boolean;
  matchingSize?: string;
  matchingColor?: string;
  matchingQuality?: string;
  matchingPhoto?: string;
  matchingDescription?: string;
  pros?: string;
  cons?: string;
  userName?: string;
}

export interface WBSalesReport {
  // Новый формат API v5 (как в n8n)
  realizationreport_id?: number;
  date_from?: string;
  date_to?: string;
  create_dt?: string;
  currency_name?: string;
  suppliercontract_code?: string | null;
  rrd_id?: number;
  gi_id?: number;
  dlv_prc?: number;
  fix_tariff_date_from?: string;
  fix_tariff_date_to?: string;
  subject_name?: string;
  nm_id?: number;
  brand_name?: string;
  sa_name?: string;
  ts_name?: string;
  barcode?: string;
  doc_type_name?: string;
  quantity?: number;
  retail_price?: number;
  retail_amount?: number;
  sale_percent?: number;
  commission_percent?: number;
  office_name?: string;
  supplier_oper_name?: string;
  order_dt?: string;
  sale_dt?: string;
  rr_dt?: string;
  shk_id?: number;
  retail_price_withdisc_rub?: number;
  delivery_amount?: number;
  return_amount?: number;
  delivery_rub?: number;
  gi_box_type_name?: string;
  product_discount_for_report?: number;
  supplier_promo?: number;
  ppvz_spp_prc?: number;
  ppvz_kvw_prc_base?: number;
  // Старые поля для обратной совместимости
  date?: string;
  lastChangeDate?: string;
  supplierArticle?: string;
  techSize?: string;
  totalPrice?: number;
  discountPercent?: number;
  isSupply?: boolean;
  isRealization?: boolean;
  warehouseName?: string;
  nmId?: number;
  subject?: string;
  category?: string;
  brand?: string;
  gNumber?: string;
}

/**
 * Сервис для работы с API WildBerries
 */
export class WildBerriesApiService {
  private apiKey: string;
  private sellerId?: string;
  // WildBerries использует несколько типов API:
  // 1. Statistics API: https://statistics-api.wildberries.ru - для статистики и финансов
  // 2. Marketplace API: https://suppliers-api.wildberries.ru - для работы с товарами
  // Для заказов, продаж и финансов используем Statistics API
  private baseUrl = 'https://statistics-api.wildberries.ru';

  constructor(config: WBConfig) {
    // Сохраняем токен как есть - n8n работает с ним напрямую, значит и мы должны
    // Убираем только пробелы в начале и конце
    this.apiKey = config.apiKey.trim();
    this.sellerId = config.sellerId;
  }

  /**
   * Выполнить POST запрос через прокси (Supabase Edge Function)
   */
  private async makePostRequest(endpoint: string, body: any, baseUrl?: string): Promise<{ ok: boolean; status: number; statusText: string; data: any; error?: any }> {
    if (USE_PROXY) {
      try {
        console.log('Invoking Edge Function POST with:', { endpoint, baseUrl, hasApiKey: !!this.apiKey });
        
        const { data, error } = await supabase.functions.invoke('wildberries-proxy', {
          body: {
            endpoint,
            method: 'POST',
            body,
            apiKey: this.apiKey,
            baseUrl,
          },
        });

        if (error) {
          console.error('Supabase function invoke error:', error);
          return {
            ok: false,
            status: 500,
            statusText: 'Proxy Error',
            data: null,
            error: error.message || 'Unknown proxy error',
          };
        }

        if (data?.error === true || data?.wbApiStatus) {
          console.error('WB API error in function response:', data);
          const errorMessage = data.wbApiError || data.error || 'Unknown WB API error';
          return {
            ok: false,
            status: data.wbApiStatus || 500,
            statusText: data.wbApiStatusText || 'Error',
            data: null,
            error: errorMessage,
          };
        }

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          data: data,
        };
      } catch (error: any) {
        console.error('Exception in makePostRequest:', error);
        return {
          ok: false,
          status: 500,
          statusText: 'Request Error',
          data: null,
          error: error.message || 'Unknown error',
        };
      }
    } else {
      // Прямой запрос (может не работать из-за CORS)
      const url = baseUrl ? `${baseUrl}${endpoint}` : `${this.baseUrl}${endpoint}`;
      const authHeader = this.apiKey.startsWith('Bearer ') 
        ? this.apiKey 
        : (this.apiKey.startsWith('eyJ') ? `Bearer ${this.apiKey}` : this.apiKey);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          data: null,
          error: errorText,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        data: data,
      };
    }
  }

  /**
   * Выполнить запрос через прокси (Supabase Edge Function) или напрямую
   */
  private async makeRequest(endpoint: string, params: Record<string, string>): Promise<{ ok: boolean; status: number; statusText: string; data: any; error?: any }> {
    if (USE_PROXY) {
      try {
        console.log('Invoking Edge Function with:', { endpoint, paramsKeys: Object.keys(params), hasApiKey: !!this.apiKey });
        
        // Используем прокси через Supabase Edge Functions
        const { data, error } = await supabase.functions.invoke('wildberries-proxy', {
          body: {
            endpoint,
            params,
            apiKey: this.apiKey,
          },
        });

        console.log('Edge Function response:', { hasData: !!data, hasError: !!error, dataKeys: data ? Object.keys(data) : [] });

        if (error) {
          console.error('Supabase function invoke error:', error);
          return {
            ok: false,
            status: 500,
            statusText: 'Proxy Error',
            data: null,
            error: error.message || 'Unknown proxy error',
          };
        }

        // Если есть ошибка в данных (от WB API)
        if (data?.error === true || data?.wbApiStatus) {
          console.error('WB API error in function response:', data);
          const errorMessage = data.wbApiError || data.error || 'Unknown WB API error';
          return {
            ok: false,
            status: data.wbApiStatus || 500,
            statusText: data.wbApiStatusText || 'Error',
            data: null,
            error: errorMessage,
          };
        }

        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          data: data,
        };
      } catch (error: any) {
        console.error('Exception in makeRequest:', error);
        return {
          ok: false,
          status: 500,
          statusText: 'Request Error',
          data: null,
          error: error.message || 'Unknown error',
        };
      }
    } else {
      // Прямой запрос (может не работать из-за CORS)
      const queryParams = new URLSearchParams(params);
      const url = `${this.baseUrl}${endpoint}`;
      const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

      const authHeader = this.apiKey.startsWith('Bearer ') 
        ? this.apiKey 
        : (this.apiKey.startsWith('eyJ') ? `Bearer ${this.apiKey}` : this.apiKey);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: data,
        error: response.ok ? undefined : data,
      };
    }
  }

  /**
   * Получить заказы за период
   * @param dateFrom Дата начала (формат: YYYY-MM-DD)
   * @param dateTo Дата окончания (формат: YYYY-MM-DD)
   */
  async getOrders(dateFrom: string, dateTo: string): Promise<WBOrder[]> {
    try {
      // WB API требует формат даты YYYY-MM-DD (без времени)
      const dateFromFormatted = dateFrom.split('T')[0];
      const dateToFormatted = dateTo.split('T')[0];
      
      // Используем v1 endpoint для заказов
      const endpoint = '/api/v1/supplier/orders';
      const params = {
        dateFrom: dateFromFormatted,
        dateTo: dateToFormatted,
      };

      console.log('WB API Request (Orders):', {
        endpoint,
        params,
        useProxy: USE_PROXY,
      });
      
      const response = await this.makeRequest(endpoint, params);
      
      console.log('WB API Response:', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        let errorMessage = `WB API Error: ${response.status}`;
        let errorJson: any = response.error;
        
        if (errorJson) {
          if (typeof errorJson === 'string') {
            try {
              errorJson = JSON.parse(errorJson);
            } catch {
              errorMessage = errorJson;
            }
          }
          
          if (errorJson && typeof errorJson === 'object') {
            errorMessage = errorJson.detail || errorJson.title || errorMessage;
            if (errorJson.detail && errorJson.detail.includes('dev.wildberries.ru')) {
              errorMessage += '\nПроверьте документацию: https://dev.wildberries.ru/openapi/api-information';
            }
          }
        }
        
        console.error('WB API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorJson,
        });
        
        throw new Error(`${errorMessage}`);
      }

      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Ошибка получения заказов WB:', error);
      throw error;
    }
  }

  /**
   * Получить отчет о продажах
   * @param dateFrom Дата начала (формат: YYYY-MM-DD)
   * @param dateTo Дата окончания (формат: YYYY-MM-DD)
   */
  async getSalesReport(dateFrom: string, dateTo: string): Promise<WBSalesReport[]> {
    try {
      // WB API требует формат даты YYYY-MM-DD (без времени)
      const dateFromFormatted = dateFrom.split('T')[0];
      const dateToFormatted = dateTo.split('T')[0];
      
      // Правильный endpoint для отчета о продажах (как в n8n)
      const endpoint = '/api/v5/supplier/reportDetailByPeriod';
      const params: Record<string, string> = {
        dateFrom: dateFromFormatted,
        dateTo: dateToFormatted,
        limit: '100000',
        rrdid: '0',
      };
      
      console.log('WB API Request (Report):', {
        endpoint,
        params,
        useProxy: USE_PROXY,
      });

      const response = await this.makeRequest(endpoint, params);
      
      console.log('WB API Response:', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        let errorMessage = `WB API Error: ${response.status}`;
        let errorJson: any = response.error;
        
        if (errorJson) {
          if (typeof errorJson === 'string') {
            try {
              errorJson = JSON.parse(errorJson);
            } catch {
              errorMessage = errorJson;
            }
          }
          
          if (errorJson && typeof errorJson === 'object') {
            errorMessage = errorJson.detail || errorJson.title || errorMessage;
            if (errorJson.detail && errorJson.detail.includes('dev.wildberries.ru')) {
              errorMessage += '\nПроверьте документацию: https://dev.wildberries.ru/openapi/api-information';
            }
          }
        }
        
        console.error('WB API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorJson,
        });
        
        throw new Error(`${errorMessage}`);
      }

      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Ошибка получения отчета о продажах WB:', error);
      throw error;
    }
  }

  /**
   * Получить список товаров (поступления)
   */
  async getProducts(): Promise<WBProduct[]> {
    try {
      const endpoint = '/api/v1/supplier/incomes';
      const response = await this.makeRequest(endpoint, {});

      if (!response.ok) {
        const errorMessage = response.error?.detail || response.error?.title || `WB API Error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Ошибка получения товаров WB:', error);
      throw error;
    }
  }

  /**
   * Получить карточки товаров через Marketplace API (с supplierArticle)
   * Использует /api/v1/supplier/cards/list для получения полной информации
   */
  async getProductsCards(): Promise<WBProduct[]> {
    try {
      // Marketplace API endpoint для получения карточек товаров
      // Базовый URL для Marketplace API
      const marketplaceApiBaseUrl = 'https://suppliers-api.wildberries.ru';
      const endpoint = '/content/v1/cards/list';
      
      // Marketplace API требует POST запрос с фильтрами
      const requestBody = {
        settings: {
          cursor: {
            limit: 1000, // Максимум товаров за запрос
          },
          filter: {
            withPhoto: -1, // Все товары (с фото и без)
          },
        },
      };

      console.log('Запрос карточек товаров через Marketplace API...');

      // Делаем запрос через прокси
      if (USE_PROXY) {
        // Для POST запросов нужно использовать другой подход
        // Пока используем прямой запрос через Edge Function
        const { data, error } = await supabase.functions.invoke('wildberries-proxy', {
          body: {
            endpoint,
            method: 'POST',
            body: requestBody,
            apiKey: this.apiKey,
            baseUrl: marketplaceApiBaseUrl,
          },
        });

        if (error) {
          console.error('Ошибка получения карточек товаров:', error);
          return [];
        }

        if (data?.error === true || data?.wbApiStatus) {
          console.error('WB Marketplace API error:', data);
          return [];
        }

        const responseData = data?.data || data;
        
        // Формат ответа Marketplace API
        if (responseData?.cards && Array.isArray(responseData.cards)) {
          return responseData.cards.map((card: any) => {
            // В Marketplace API supplierArticle может быть в разных полях
            // Обычно это vendorCode или supplierArticle
            const supplierArticle = card.vendorCode || card.supplierArticle || card.article || '';
            
            return {
              nmId: card.nmID || card.nmId || 0,
              name: card.title || card.name || card.vendorCode || '',
              brand: card.brand || '',
              brandId: card.brandId || 0,
              siteBrandId: card.siteBrandId || 0,
              supplierId: card.supplierId || 0,
              sale: 0,
              price: 0,
              salePrice: 0,
              rating: 0,
              feedbacks: 0,
              colors: [],
              quantity: 0,
              category: card.category || '',
              rootCategory: card.rootCategory || '',
              kpp: 0,
              photos: card.mediaFiles?.map((f: any) => f.url) || [],
              supplierArticle: supplierArticle, // Артикул продавца (например "ПГХ3005")
            };
          });
        }

        return [];
      }

      return [];
    } catch (error: any) {
      console.error('Ошибка получения карточек товаров WB:', error);
      return [];
    }
  }

  /**
   * Получить список карточек товаров (для синхронизации)
   * Использует Statistics API для остатков (fallback, если Marketplace API недоступен)
   */
  async getProductsList(): Promise<WBProduct[]> {
    try {
      // Используем endpoint для получения остатков товаров
      // Statistics API требует параметры dateFrom и dateTo
      // Используем текущую дату и дату месяц назад для получения всех товаров
      const today = new Date();
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      const dateFrom = monthAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];
      
      const endpoint = '/api/v1/supplier/stocks';
      const params = {
        dateFrom,
        dateTo,
      };
      
      const response = await this.makeRequest(endpoint, params);

      if (!response.ok) {
        const errorMessage = response.error?.detail || response.error?.title || `WB API Error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const stocks = response.data;
      if (!Array.isArray(stocks)) {
        return [];
      }

      // Преобразуем остатки в формат товаров
      // Для получения полной информации о товарах нужно использовать Marketplace API
      // Пока используем данные из остатков
      const products: WBProduct[] = stocks.map((stock: any) => ({
        nmId: stock.nmId || stock.nm_id || 0,
        name: stock.name || stock.subject || '',
        brand: stock.brand || '',
        brandId: stock.brandId || stock.brand_id || 0,
        siteBrandId: stock.siteBrandId || stock.site_brand_id || 0,
        supplierId: stock.supplierId || stock.supplier_id || 0,
        sale: stock.discount || 0,
        price: stock.price || 0,
        salePrice: stock.priceWithDisc || stock.price_with_disc || stock.price || 0,
        rating: 0,
        feedbacks: 0,
        colors: [],
        quantity: stock.quantity || stock.qty || 0,
        category: stock.subject || stock.category || '',
        rootCategory: stock.category || '',
        kpp: 0,
        photos: [],
      }));

      return products;
    } catch (error: any) {
      console.error('Ошибка получения списка товаров WB:', error);
      throw error;
    }
  }

  /**
   * Получить статистику по складам
   */
  async getStocks(): Promise<any[]> {
    try {
      const endpoint = '/api/v1/supplier/stocks';
      const response = await this.makeRequest(endpoint, {});

      if (!response.ok) {
        let errorMessage = `WB API Error: ${response.status}`;
        let errorJson: any = response.error;
        
        if (errorJson) {
          if (typeof errorJson === 'string') {
            try {
              errorJson = JSON.parse(errorJson);
            } catch {
              errorMessage = errorJson;
            }
          }
          
          if (errorJson && typeof errorJson === 'object') {
            errorMessage = errorJson.detail || errorJson.title || errorMessage;
          }
        }
        throw new Error(`${errorMessage}`);
      }

      const data = response.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Ошибка получения остатков WB:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать данные за период
   */
  async syncData(dateFrom: string, dateTo: string) {
    try {
      const [orders, salesReport] = await Promise.all([
        this.getOrders(dateFrom, dateTo),
        this.getSalesReport(dateFrom, dateTo),
      ]);

      return {
        orders,
        salesReport,
      };
    } catch (error) {
      console.error('Ошибка синхронизации данных WB:', error);
      throw error;
    }
  }

  /**
   * Получить imtId по nmId через карточку товара
   * @param nmId ID товара (номенклатура)
   * @param contentApiKey Опциональный токен для Content API
   */
  private async getImtIdByNmId(nmId: number, contentApiKey?: string): Promise<number | null> {
    try {
      console.log(`Получение imtId для nmId=${nmId}...`);
      
      // Используем уже существующий метод getProductsCards для получения карточек
      // Это более надежно, так как метод уже протестирован
      const products = await this.getProductsCards();
      
      if (products && products.length > 0) {
        // Ищем товар с нужным nmId
        const product = products.find((p: WBProduct) => p.nmId === nmId);
        
        if (product) {
          // К сожалению, getProductsCards не возвращает imtId
          // Нужно сделать отдельный запрос для получения imtId
          // Попробуем использовать Marketplace API напрямую
          const marketplaceApiBaseUrl = 'https://suppliers-api.wildberries.ru';
          const endpoint = '/content/v1/cards/list';
          const apiKeyToUse = contentApiKey || this.apiKey;
          
          // Упрощенный запрос - получаем первые 1000 карточек
          const requestBody = {
            settings: {
              cursor: {
                limit: 1000,
              },
              filter: {
                withPhoto: -1,
              },
            },
          };

          if (USE_PROXY) {
            try {
              const { data, error } = await supabase.functions.invoke('wildberries-proxy', {
                body: {
                  endpoint,
                  method: 'POST',
                  body: requestBody,
                  apiKey: apiKeyToUse,
                  baseUrl: marketplaceApiBaseUrl,
                },
              });

              if (error) {
                console.error('Ошибка получения карточки товара для imtId:', error);
                // Если ошибка DNS или сети, пропускаем получение imtId
                if (error?.message?.includes('DNS') || error?.message?.includes('dns') || error?.message?.includes('lookup')) {
                  console.warn('⚠ DNS ошибка при получении imtId - пропускаем и используем nmId напрямую');
                }
                return null;
              }

              if (data?.error === true || data?.wbApiStatus) {
                // Если DNS ошибка, пропускаем
                if (data?.errorType === 'DNS_ERROR' || data?.details?.includes('DNS')) {
                  console.warn('⚠ DNS ошибка при получении imtId - пропускаем и используем nmId напрямую');
                  return null;
                }
                console.error('WB Marketplace API error при получении imtId:', data);
                return null;
              }

              const responseData = data?.data || data;
              
              if (responseData?.cards && Array.isArray(responseData.cards)) {
                // Ищем карточку с нужным nmId
                const card = responseData.cards.find((c: any) => {
                  const cardNmId = c.nmID || c.nmId || c.nm_id;
                  return cardNmId && Number(cardNmId) === nmId;
                });
                
                if (card) {
                  const imtId = card.imtID || card.imtId || card.imt_id || null;
                  
                  if (imtId) {
                    console.log(`✓ Получен imtId=${imtId} для nmId=${nmId}`);
                    return Number(imtId);
                  }
                } else {
                  console.warn(`⚠ Карточка с nmId=${nmId} не найдена в ответе (найдено ${responseData.cards.length} карточек)`);
                }
              }
            } catch (proxyError: any) {
              console.error('Ошибка при вызове прокси для получения imtId:', proxyError);
              return null;
            }
          }
        } else {
          console.warn(`⚠ Товар с nmId=${nmId} не найден в списке карточек`);
        }
      }

      return null;
    } catch (error: any) {
      console.error('Ошибка получения imtId по nmId:', error);
      return null;
    }
  }

  /**
   * Получить отзывы для товара
   * @param nmId ID товара (номенклатура)
   * @param limit Лимит отзывов
   * @param skip Пропустить отзывов
   * @param contentApiKey Опциональный токен для Content API (если отличается от основного)
   */
  async getReviews(nmId: number, limit: number = 30, skip: number = 0, contentApiKey?: string): Promise<WBReview[]> {
    try {
      // Правильный API для отзывов - Feedbacks API
      // URL: https://feedbacks-api.wildberries.ru/api/v1/feedbacks
      // Токен должен иметь права на контент и отзывы (как в n8n)
      const feedbacksApiBaseUrl = 'https://feedbacks-api.wildberries.ru';
      const endpoint = '/api/v1/feedbacks';
      
      // Используем токен с правами на отзывы
      // Если передан contentApiKey (токен с правами на контент и отзывы), используем его
      // Иначе используем основной токен (если он имеет права на отзывы)
      const apiKeyToUse = contentApiKey || this.apiKey;
      
      console.log(`Запрос отзывов WB: nmId=${nmId}, limit=${limit}, skip=${skip}`);
      
      // Feedbacks API требует обязательный параметр isAnswered
      // Делаем два запроса: для необработанных (false) и обработанных (true) отзывов
      // Затем объединяем результаты
      const allReviews: any[] = [];
      
      // 1. Запрос необработанных отзывов (isAnswered=false)
      const paramsUnanswered: Record<string, string> = {
        isAnswered: 'false',
        take: String(limit),
        skip: String(skip),
        order: 'dateDesc',
      };
      
      // 2. Запрос обработанных/архивных отзывов (isAnswered=true)
      const paramsAnswered: Record<string, string> = {
        isAnswered: 'true',
        take: String(limit),
        skip: String(skip),
        order: 'dateDesc',
      };
      
      console.log(`Запрос отзывов WB через Feedbacks API: ${endpoint}`);

      if (USE_PROXY) {
        // Функция для выполнения одного запроса с retry логикой
        const fetchReviews = async (params: Record<string, string>, label: string, retryCount = 0): Promise<any[]> => {
          const maxRetries = 2;
          const retryDelay = 1000; // 1 секунда
          
          try {
            const { data, error } = await supabase.functions.invoke('wildberries-proxy', {
              body: {
                endpoint,
                params,
                apiKey: apiKeyToUse,
                baseUrl: feedbacksApiBaseUrl,
              },
            });

            if (error) {
              // Если это временная ошибка (502, 503, CORS) и есть попытки - повторяем
              if (retryCount < maxRetries && (
                error.message?.includes('502') || 
                error.message?.includes('503') || 
                error.message?.includes('CORS') ||
                error.message?.includes('Failed to send')
              )) {
                console.warn(`⚠ Временная ошибка для ${label} отзывов, повтор через ${retryDelay}ms (попытка ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
                return fetchReviews(params, label, retryCount + 1);
              }
              console.error(`Ошибка прокси для Feedbacks API (${label}):`, error);
              return [];
            }

            if (data?.error === true || data?.wbApiStatus) {
              // Игнорируем ошибки для обработанных отзывов, если их нет
              if (label === 'обработанные' && data?.wbApiStatus === 400) {
                console.log(`⚠ Нет обработанных отзывов (${label})`);
                return [];
              }
              console.error(`WB Feedbacks API error (${label}):`, data);
              return [];
            }

            const responseData = data?.data || data;
            
            // Feedbacks API возвращает объект с полем feedbacks (массив отзывов)
            // Формат: {countUnanswered: 0, countArchive: 2208, feedbacks: Array(0)}
            let reviews: any[] = [];
            
            if (Array.isArray(responseData)) {
              reviews = responseData;
            } else if (responseData?.feedbacks && Array.isArray(responseData.feedbacks)) {
              reviews = responseData.feedbacks;
            } else if (responseData?.data && Array.isArray(responseData.data)) {
              reviews = responseData.data;
            }
            
            console.log(`✓ Получено ${reviews.length} ${label} отзывов`);
            return reviews;
          } catch (error) {
            console.error(`Ошибка получения ${label} отзывов:`, error);
            return [];
          }
        };

        // Выполняем оба запроса последовательно с небольшой задержкой, чтобы не перегружать Edge Function
        // Это помогает избежать ошибок 502 Bad Gateway
        const unansweredReviews = await fetchReviews(paramsUnanswered, 'необработанных');
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const answeredReviews = await fetchReviews(paramsAnswered, 'обработанных');

        // Объединяем результаты
        allReviews.push(...unansweredReviews, ...answeredReviews);
        
        if (allReviews.length > 0) {
          // Фильтруем отзывы по nmId (если указан)
          const filteredReviews = nmId 
            ? allReviews.filter((review: any) => {
                try {
                  // Пробуем разные варианты извлечения nmId из структуры отзыва
                  const reviewNmId = review?.productDetails?.nmId || 
                                    review?.nmId || 
                                    review?.productDetails?.imtId ||
                                    review?.imtId;
                  
                  if (reviewNmId && Number(reviewNmId) === nmId) {
                    return true;
                  }
                  
                  // Если nmId не найден, логируем структуру для отладки (только для первого отзыва)
                  if (allReviews.indexOf(review) === 0) {
                    console.log(`🔍 Структура отзыва для отладки фильтрации:`, {
                      hasProductDetails: !!review.productDetails,
                      productDetailsNmId: review?.productDetails?.nmId,
                      productDetailsImtId: review?.productDetails?.imtId,
                      productDetailsVendorCode: review?.productDetails?.vendorCode,
                      reviewNmId: review?.nmId,
                      reviewImtId: review?.imtId,
                      fullProductDetails: review?.productDetails,
                      keys: Object.keys(review || {}),
                      productDetailsKeys: review?.productDetails ? Object.keys(review.productDetails) : [],
                    });
                  }
                  
                  return false;
                } catch (e) {
                  return false;
                }
              })
            : allReviews;
          
          console.log(`✓ Всего получено отзывов: ${allReviews.length} (отфильтровано по nmId=${nmId}: ${filteredReviews.length})`);
          return filteredReviews;
        }
        
        console.log(`✓ Получено 0 отзывов для nmId=${nmId}`);
        return [];
      }
      
      return [];
    } catch (error: any) {
      console.error('Ошибка получения отзывов WB:', error);
      return [];
    }
  }

  /**
   * Получить товары с ценами по nmId (номенклатурным ID)
   * API: https://discounts-prices-api.wildberries.ru/api/v2/list/goods/filter
   * Формат запроса: { "nmList": [26613989, 1348041] }
   */
  async getProductsWithPrices(nmIds: number[]): Promise<WBProductPrice[]> {
    try {
      const discountsPricesBaseUrl = 'https://discounts-prices-api.wildberries.ru';
      
      // Формат запроса для Discounts & Prices API v2
      // Документация: https://openapi.wildberries.ru/#tag/Prosmotr-cen/paths/~1api~1v2~1list~1goods~1filter/post
      // API ожидает формат: { "nmList": [26613989, 1348041] }
      // Максимум 1000 товаров за один запрос
      
      if (nmIds.length === 0) {
        return [];
      }
      
      // Разбиваем на батчи по 1000 товаров (лимит API)
      const batchSize = 1000;
      const allPrices: WBProductPrice[] = [];
      
      for (let i = 0; i < nmIds.length; i += batchSize) {
        const batch = nmIds.slice(i, i + batchSize);
        
        const requestBody = {
          nmList: batch.map(id => Number(id)) // Убеждаемся, что это числа
        };
        
        console.log('Discounts & Prices API request:', {
          endpoint: '/api/v2/list/goods/filter',
          baseUrl: discountsPricesBaseUrl,
          requestBody: JSON.stringify(requestBody, null, 2),
          nmIdsCount: batch.length,
          batch: `${i + 1}-${Math.min(i + batchSize, nmIds.length)} из ${nmIds.length}`
        });
        
        const response = await this.makePostRequest(
          '/api/v2/list/goods/filter',
          requestBody,
          discountsPricesBaseUrl
        );

        if (!response.ok) {
          let errorMessage = `WB Discounts & Prices API Error: ${response.status} - ${response.error || response.statusText}`;
          
          // Более понятное сообщение для ошибки прав доступа
          if (response.status === 401 && (response.error?.includes('token scope not allowed') || response.statusText === 'Unauthorized')) {
            errorMessage = `Ошибка прав доступа API ключа. Токен для цен должен иметь права "ЦЕНЫ" или "ЦЕНЫ ОТЗЫВЫ". ` +
              `Проверьте настройки маркетплейсов (вкладка "Цены") и убедитесь, что используете правильный API ключ с правами на управление ценами.`;
          }
          
          // Более понятное сообщение для ошибки формата запроса
          if (response.status === 400 && (response.error?.includes('Invalid request parameters') || response.error?.includes('Invalid'))) {
            errorMessage = `Ошибка формата запроса к API цен. ` +
              `Проверьте, что nmId указаны правильно (должны быть числа). ` +
              `Полученная ошибка: ${response.error || response.statusText}`;
          }
          
          console.error('Discounts & Prices API error details:', {
            status: response.status,
            statusText: response.statusText,
            error: response.error,
            requestBody: JSON.stringify(requestBody, null, 2),
            nmIds: batch
          });
          
          throw new Error(errorMessage);
        }

        // Логируем ответ от API для отладки
        const firstItem = response.data?.data?.listGoods?.[0];
        console.log('Discounts & Prices API response:', {
          status: response.status,
          dataType: typeof response.data,
          hasData: !!response.data,
          hasDataData: !!response.data?.data,
          hasListGoods: !!response.data?.data?.listGoods,
          listGoodsLength: response.data?.data?.listGoods?.length || 0,
          firstItemKeys: firstItem ? Object.keys(firstItem) : [],
          firstItemFull: firstItem ? JSON.stringify(firstItem, null, 2) : 'null',
          nmIdsRequested: batch
        });

        // API возвращает данные в формате: { data: { listGoods: [...] }, error: false }
        let goodsList: any[] = [];
        
        if (response.data?.data?.listGoods && Array.isArray(response.data.data.listGoods)) {
          // Формат: { data: { listGoods: [...] } }
          goodsList = response.data.data.listGoods;
        } else if (response.data && Array.isArray(response.data)) {
          // Формат: [...] (напрямую массив)
          goodsList = response.data;
        } else if (response.data?.listGoods && Array.isArray(response.data.listGoods)) {
          // Формат: { listGoods: [...] }
          goodsList = response.data.listGoods;
        } else {
          console.warn('⚠ API вернул данные в неожиданном формате:', {
            dataType: typeof response.data,
            isArray: Array.isArray(response.data),
            hasData: !!response.data?.data,
            hasListGoods: !!response.data?.data?.listGoods,
            data: response.data
          });
        }

        if (goodsList.length > 0) {
          const batchPrices = goodsList.map((item: any) => {
            const discount = item.discount || item.discountPercent || 0;
            
            // Цена может быть в разных местах:
            // 1. В корневом объекте (price, priceWithDiscount)
            // 2. В массиве sizes (каждый размер может иметь свою цену)
            // 3. В editableSizePrice
            
            let actualPrice = 0;
            let priceWithDiscount = 0;
            
            // Сначала проверяем корневые поля
            if (item.price && item.price > 0) {
              actualPrice = item.price;
            } else if (item.priceWithDiscount && item.priceWithDiscount > 0) {
              actualPrice = item.priceWithDiscount;
              priceWithDiscount = item.priceWithDiscount;
            } else if (item.basePrice && item.basePrice > 0) {
              actualPrice = item.basePrice;
            }
            
            // Если цена не найдена в корне, проверяем sizes (массив размеров)
            if (actualPrice === 0 && item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
              // Берем цену из первого размера (обычно все размеры имеют одну цену)
              const firstSize = item.sizes[0];
              if (firstSize.price && firstSize.price > 0) {
                actualPrice = firstSize.price;
              } else if (firstSize.priceWithDiscount && firstSize.priceWithDiscount > 0) {
                actualPrice = firstSize.priceWithDiscount;
                priceWithDiscount = firstSize.priceWithDiscount;
              } else if (firstSize.basePrice && firstSize.basePrice > 0) {
                actualPrice = firstSize.basePrice;
              }
            }
            
            // Если цена все еще 0, проверяем editableSizePrice
            if (actualPrice === 0 && item.editableSizePrice) {
              if (typeof item.editableSizePrice === 'number' && item.editableSizePrice > 0) {
                actualPrice = item.editableSizePrice;
              } else if (item.editableSizePrice.price && item.editableSizePrice.price > 0) {
                actualPrice = item.editableSizePrice.price;
              }
            }
            
            // Если цена найдена, но нет priceWithDiscount, вычисляем его
            if (actualPrice > 0 && priceWithDiscount === 0 && discount > 0) {
              priceWithDiscount = actualPrice * (1 - discount / 100);
            } else if (actualPrice > 0 && priceWithDiscount === 0) {
              priceWithDiscount = actualPrice;
            }
            
            // Если цена 0, но есть discount, логируем для отладки (только первые 3)
            if (actualPrice === 0 && discount > 0 && allPrices.length < 3) {
              console.warn(`⚠ Товар nmId ${item.nmID || item.nmId || item.nm_id}: цена = 0, но есть скидка ${discount}%.`, {
                hasSizes: !!item.sizes,
                sizesLength: item.sizes?.length || 0,
                firstSize: item.sizes?.[0] || null,
                editableSizePrice: item.editableSizePrice,
                allKeys: Object.keys(item)
              });
            }
            
            const priceData = {
              nmId: item.nmID || item.nmId || item.nm_id,
              supplierArticle: item.vendorCode || item.supplierArticle || item.supplier_article || '',
              price: actualPrice,
              discount: discount,
              priceWithDiscount: priceWithDiscount || actualPrice,
              currencyCode: item.currencyIsoCode4217 || item.currencyCode || item.currency_code || 'RUB',
            };
            
            // Логируем только первые 3 для отладки
            if (allPrices.length < 3) {
              console.log(`Parsed price for nmId ${priceData.nmId}:`, priceData, 'First size:', item.sizes?.[0]);
            }
            return priceData;
          });
          
          allPrices.push(...batchPrices);
        } else {
          console.warn('⚠ API вернул пустой список товаров для nmIds:', batch);
        }
        
        // Небольшая задержка между батчами, чтобы не перегружать API
        if (i + batchSize < nmIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      return allPrices;
    } catch (error: any) {
      console.error('Ошибка получения товаров с ценами:', error);
      throw error;
    }
  }

  /**
   * Установить цены и скидки для товаров
   * API: https://discounts-prices-api.wildberries.ru/api/v2/upload/task
   */
  async setPricesAndDiscounts(prices: WBPriceUpdate[]): Promise<WBPriceUpdateTask> {
    try {
      const discountsPricesBaseUrl = 'https://discounts-prices-api.wildberries.ru';
      
      const response = await this.makePostRequest(
        '/api/v2/upload/task',
        {
          data: prices
        },
        discountsPricesBaseUrl
      );

      if (!response.ok) {
        throw new Error(`WB Discounts & Prices API Error: ${response.status} - ${response.error || response.statusText}`);
      }

      return {
        taskId: response.data?.taskId || response.data?.id || '',
        status: response.data?.status || 'processing',
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Ошибка установки цен и скидок:', error);
      throw error;
    }
  }
}

/**
 * Интерфейсы для работы с Discounts & Prices API
 */
export interface WBProductPrice {
  nmId: number;
  supplierArticle: string;
  price: number;
  discount: number;
  priceWithDiscount: number;
  currencyCode: string;
}

export interface WBPriceUpdate {
  nmID: number; // API использует nmID (с заглавной D), а не nmId
  price: number;
  discount?: number;
}

export interface WBPriceUpdateTask {
  taskId: string;
  status: string;
  createdAt: string;
}

