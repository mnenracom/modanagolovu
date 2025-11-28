import { supabase } from '@/lib/supabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';
import { transformProductFromSupabase } from '@/types/productSupabase';

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  material: string;
  sku?: string;
  article?: string; // Внутренний артикул товара (например "ПГХ3005")
  price: number; // Для обратной совместимости (должна быть равна retail_price)
  // Dual-цены
  retail_price: number;
  wholesale_price: number;
  wholesale_threshold?: number;
  economy_percent?: number;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  in_stock: boolean;
  stock_quantity: number;
  min_order_quantity: number;
  discount?: number;
  price_ranges?: any[];
  variations?: any[];
  show_in_new_products?: boolean;
  show_in_bestsellers?: boolean;
  // Поля для отслеживания импорта
  import_source?: string;
  imported_at?: string;
  import_batch_id?: string;
  import_metadata?: any;
  // ID маркетплейсов
  wbNmId?: string;
  ozonProductId?: string;
  ozonOfferId?: string;
  // Поля для управления автоценами
  autoPriceEnabled?: boolean;
  lastMarketplacePrice?: number;
  lastPriceUpdateAt?: string;
  maxPriceChangePercent?: number;
}

export const productsService = {
  // Получить все товары
  async getAll(params?: { 
    category?: string; 
    search?: string; 
    in_stock?: boolean;
    page?: number;
    limit?: number;
  }) {
    let query = supabase.from('products').select('*', { count: 'exact' });

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    if (params?.in_stock !== undefined) {
      query = query.eq('in_stock', params.in_stock);
    }

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
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
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Преобразуем данные из Supabase формата (snake_case) в клиентский (camelCase)
    const transformedData = (data || []).map(transformProductFromSupabase);

    return { data: transformedData, count: count || 0 };
  },

  // Получить товары для секции новинок
  async getForNewProducts(params?: { limit?: number }) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .eq('show_in_new_products', true)
        .order('created_at', { ascending: false });

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        // Если поле show_in_new_products не существует, возвращаем последние товары
        if (error.message.includes('show_in_new_products')) {
          console.warn('Поле show_in_new_products не найдено. Выполните SQL-скрипт add_show_in_new_products_to_products.sql');
          // Fallback: возвращаем последние товары
          return this.getAll({ 
            in_stock: true, 
            limit: params?.limit || 4 
          }).then(result => ({ data: result.data || [] }));
        }
        throw new Error(error.message);
      }

      return { data: data || [] };
    } catch (error: any) {
      // Если произошла ошибка, возвращаем последние товары как fallback
      console.warn('Ошибка при получении товаров для новинок, используем fallback:', error);
      return this.getAll({ 
        in_stock: true, 
        limit: params?.limit || 4 
      }).then(result => ({ data: result.data || [] }));
    }
  },

  // Получить товары для секции хитов продаж
  async getForBestsellers(params?: { limit?: number }) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .eq('show_in_bestsellers', true)
        .order('created_at', { ascending: false });

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) {
        // Если поле show_in_bestsellers не существует, возвращаем последние товары
        if (error.message.includes('show_in_bestsellers')) {
          console.warn('Поле show_in_bestsellers не найдено. Выполните SQL-скрипт add_show_in_bestsellers_to_products.sql');
          // Fallback: возвращаем последние товары
          return this.getAll({ 
            in_stock: true, 
            limit: params?.limit || 4 
          }).then(result => ({ data: result.data || [] }));
        }
        throw new Error(error.message);
      }

      return { data: data || [] };
    } catch (error: any) {
      // Если произошла ошибка, возвращаем последние товары как fallback
      console.warn('Ошибка при получении товаров для хитов продаж, используем fallback:', error);
      return this.getAll({ 
        in_stock: true, 
        limit: params?.limit || 4 
      }).then(result => ({ data: result.data || [] }));
    }
  },

  // Получить товар по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Проверяем, существует ли таблица
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        throw new Error('Таблица products не существует. Создайте её через SQL Editor в Supabase Dashboard.');
      }
      // Если товар не найден (404)
      if (error.code === 'PGRST116') {
        throw new Error('Товар не найден');
      }
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error('Товар не найден');
    }

    return data;
  },

  // Получить товары по артикулу (исключая текущий товар)
  async getByArticle(article: string, excludeId?: number, limit: number = 10) {
    if (!article || !article.trim()) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('article', article.trim())
      .eq('in_stock', true);

    // Исключаем текущий товар
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error('Ошибка получения товаров по артикулу:', error);
      return { data: [], count: 0 };
    }

    const transformedData = (data || []).map(transformProductFromSupabase);
    return { data: transformedData, count: count || 0 };
  },

  // Получить похожие товары (по артикулу или категории)
  async getSimilarProducts(productId: number, article?: string | null, category?: string, limit: number = 10) {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('in_stock', true)
      .neq('id', productId);

    // Если есть артикул, ищем по артикулу
    if (article && article.trim()) {
      query = query.eq('article', article.trim());
    } else if (category) {
      // Иначе ищем по категории
      query = query.eq('category', category);
    } else {
      return { data: [], count: 0 };
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error, count } = await query;

    if (error) {
      console.error('Ошибка получения похожих товаров:', error);
      return { data: [], count: 0 };
    }

    const transformedData = (data || []).map(transformProductFromSupabase);
    return { data: transformedData, count: count || 0 };
  },

  // Создать товар
  async create(productData: ProductFormData) {
    // Получаем dual-цены
    const retailPrice = productData.retail_price ?? productData.price ?? 0;
    const wholesalePrice = productData.wholesale_price ?? 0;
    const wholesaleThreshold = productData.wholesale_threshold ?? 10;
    
    // Формируем объект данных, исключая undefined значения
    const insertData: any = {
      name: productData.name,
      description: productData.description || '',
      category: productData.category,
      price: retailPrice, // Для обратной совместимости
      retail_price: retailPrice,
      wholesale_price: wholesalePrice,
      wholesale_threshold: wholesaleThreshold,
      // economy_percent убрано - поле отсутствует в таблице products
      in_stock: productData.in_stock ?? true,
      stock_quantity: productData.stock_quantity || 0,
      min_order_quantity: 1, // Розница - всегда минимум 1 шт
    };

    // Обрабатываем массивы - убеждаемся, что это массив строк
    if (productData.images !== undefined) {
      insertData.images = Array.isArray(productData.images) 
        ? productData.images.filter(img => img && typeof img === 'string')
        : [];
    }
    
    if (productData.colors !== undefined) {
      insertData.colors = Array.isArray(productData.colors)
        ? productData.colors.filter(c => c && typeof c === 'string')
        : [];
    }
    
    if (productData.sizes !== undefined) {
      insertData.sizes = Array.isArray(productData.sizes)
        ? productData.sizes.filter(s => s && typeof s === 'string')
        : [];
    }

    // Обрабатываем JSONB поля - преобразуем в правильный формат
    if (productData.price_ranges !== undefined) {
      if (Array.isArray(productData.price_ranges) && productData.price_ranges.length > 0) {
        insertData.price_ranges = productData.price_ranges.map((pr: any) => ({
          min_quantity: pr.minQuantity ?? pr.min_quantity ?? pr.minQuantity ?? 1,
          max_quantity: pr.maxQuantity ?? pr.max_quantity ?? null,
          price: pr.price ?? 0,
        }));
      } else {
        insertData.price_ranges = null;
      }
    }
    
    if (productData.variations !== undefined) {
      if (Array.isArray(productData.variations) && productData.variations.length > 0) {
        insertData.variations = productData.variations.map((v: any) => ({
          id: v.id || undefined,
          color: v.color || null,
          size: v.size || null,
          sku: v.sku || null,
          stock: v.stock ?? 0,
          price: v.price || null,
        }));
      } else {
        insertData.variations = null;
      }
    }

    // Добавляем опциональные поля только если они определены
    if (productData.subcategory !== undefined) insertData.subcategory = productData.subcategory || null;
    // material должен быть всегда установлен (NOT NULL constraint)
    insertData.material = productData.material || '';
    if (productData.sku !== undefined) insertData.sku = productData.sku || null;
    // article - сохраняем даже если пустая строка (устанавливаем null)
    if (productData.article !== undefined) {
      insertData.article = productData.article && productData.article.trim() ? productData.article.trim() : null;
      console.log(`Создание товара: article="${insertData.article || 'null'}"`);
    }
    if (productData.discount !== undefined) insertData.discount = productData.discount || 0;
    if (productData.show_in_new_products !== undefined) insertData.show_in_new_products = productData.show_in_new_products;
    if (productData.show_in_bestsellers !== undefined) insertData.show_in_bestsellers = productData.show_in_bestsellers;
    // ID маркетплейсов
    if (productData.wbNmId !== undefined) insertData.wb_nm_id = productData.wbNmId || null;
    if (productData.ozonProductId !== undefined) insertData.ozon_product_id = productData.ozonProductId || null;
    if (productData.ozonOfferId !== undefined) insertData.ozon_offer_id = productData.ozonOfferId || null;

    const { data, error } = await supabase
      .from('products')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания товара:', error);
      
      // Проверяем RLS ошибки
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      
      // Проверяем, есть ли проблема с отсутствующими полями
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        throw new Error(
          `Не найдено поле в таблице products. Выполните SQL из файла fix_products_table.sql в Supabase Dashboard для добавления недостающих полей. Ошибка: ${error.message}`
        );
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем создание товара
    if (data) {
      auditLogger.logCreate('product', data.id, data.name, insertData).catch(err => 
        console.error('Ошибка логирования создания товара:', err)
      );
    }

    return data;
  },

  // Обновить товар
  async update(id: number, productData: Partial<ProductFormData>) {
    const updateData: any = {};

    // Добавляем только те поля, которые определены
    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.description !== undefined) updateData.description = productData.description || '';
    if (productData.category !== undefined) updateData.category = productData.category;
    if (productData.subcategory !== undefined) updateData.subcategory = productData.subcategory || null;
    // material должен быть всегда установлен (NOT NULL constraint)
    if (productData.material !== undefined) updateData.material = productData.material || '';
    if (productData.sku !== undefined) updateData.sku = productData.sku || null;
    // article - обновляем даже если пустая строка (устанавливаем null)
    // Важно: всегда обновляем article, даже если оно undefined (чтобы не потерять существующее значение)
    // Но если оно явно передано, используем переданное значение
    if (productData.article !== undefined) {
      updateData.article = productData.article && productData.article.trim() ? productData.article.trim() : null;
      console.log(`Обновление товара ID ${id}: article="${updateData.article || 'null'}" (передано: "${productData.article}")`);
    } else {
      // Если article не передано, НЕ обновляем его (сохраняем существующее значение в БД)
      console.log(`Обновление товара ID ${id}: article не передано, сохраняем существующее значение`);
    }
    // ID маркетплейсов
    if (productData.wbNmId !== undefined) updateData.wb_nm_id = productData.wbNmId || null;
    if (productData.ozonProductId !== undefined) updateData.ozon_product_id = productData.ozonProductId || null;
    if (productData.ozonOfferId !== undefined) updateData.ozon_offer_id = productData.ozonOfferId || null;
    // Поля для управления автоценами
    if (productData.autoPriceEnabled !== undefined) updateData.auto_price_enabled = productData.autoPriceEnabled;
    if (productData.lastMarketplacePrice !== undefined) updateData.last_marketplace_price = productData.lastMarketplacePrice || null;
    if (productData.lastPriceUpdateAt !== undefined) updateData.last_price_update_at = productData.lastPriceUpdateAt || null;
    if (productData.maxPriceChangePercent !== undefined) updateData.max_price_change_percent = productData.maxPriceChangePercent || 25.00;
    
    // Обработка dual-цен
    if (productData.retail_price !== undefined || productData.price !== undefined) {
      const retailPrice = productData.retail_price ?? productData.price ?? 0;
      updateData.price = retailPrice; // Для обратной совместимости
      updateData.retail_price = retailPrice;
    }
    
    if (productData.wholesale_price !== undefined) {
      updateData.wholesale_price = productData.wholesale_price;
    }
    
    if (productData.wholesale_threshold !== undefined) {
      updateData.wholesale_threshold = productData.wholesale_threshold;
    }
    
    // economy_percent убрано - поле отсутствует в таблице products
    
    // Сохраняем старое значение in_stock для проверки изменений
    const oldInStock = updateData.in_stock;
    if (productData.in_stock !== undefined) updateData.in_stock = productData.in_stock;
    if (productData.stock_quantity !== undefined) updateData.stock_quantity = productData.stock_quantity;
    if (productData.min_order_quantity !== undefined) updateData.min_order_quantity = productData.min_order_quantity;
    
    // Проверяем наличие discount перед добавлением (может отсутствовать в таблице)
    if (productData.discount !== undefined && productData.discount !== null) {
      updateData.discount = productData.discount;
    }
    
    // Обрабатываем массивы - убеждаемся, что это массив строк
    if (productData.images !== undefined) {
      updateData.images = Array.isArray(productData.images)
        ? productData.images.filter(img => img && typeof img === 'string')
        : [];
    }
    
    if (productData.colors !== undefined) {
      updateData.colors = Array.isArray(productData.colors)
        ? productData.colors.filter(c => c && typeof c === 'string')
        : [];
    }
    
    if (productData.sizes !== undefined) {
      updateData.sizes = Array.isArray(productData.sizes)
        ? productData.sizes.filter(s => s && typeof s === 'string')
        : [];
    }
    
    // Обрабатываем JSONB поля - преобразуем в правильный формат
    if (productData.price_ranges !== undefined) {
      if (Array.isArray(productData.price_ranges) && productData.price_ranges.length > 0) {
        updateData.price_ranges = productData.price_ranges.map((pr: any) => ({
          min_quantity: pr.minQuantity ?? pr.min_quantity ?? 1,
          max_quantity: pr.maxQuantity ?? pr.max_quantity ?? null,
          price: pr.price ?? 0,
        }));
      } else {
        updateData.price_ranges = null;
      }
    }
    
    if (productData.variations !== undefined) {
      if (Array.isArray(productData.variations) && productData.variations.length > 0) {
        updateData.variations = productData.variations.map((v: any) => ({
          id: v.id || undefined,
          color: v.color || null,
          size: v.size || null,
          sku: v.sku || null,
          stock: v.stock ?? 0,
          price: v.price || null,
        }));
      } else {
        updateData.variations = null;
      }
    }
    
    if (productData.show_in_new_products !== undefined) updateData.show_in_new_products = productData.show_in_new_products;
    if (productData.show_in_bestsellers !== undefined) updateData.show_in_bestsellers = productData.show_in_bestsellers;
    
    // Поля для отслеживания импорта (можно обновить при повторном импорте)
    if ('import_source' in productData && productData.import_source !== undefined) {
      updateData.import_source = productData.import_source;
    }
    if ('imported_at' in productData && productData.imported_at !== undefined) {
      updateData.imported_at = productData.imported_at;
    }
    if ('import_batch_id' in productData && productData.import_batch_id !== undefined) {
      updateData.import_batch_id = productData.import_batch_id;
    }
    if ('import_metadata' in productData && productData.import_metadata !== undefined) {
      updateData.import_metadata = productData.import_metadata;
    }

    const { data, error } = await supabase
      .from('products')
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

    // Логируем обновление товара
    if (data) {
      // Получаем старые данные для сравнения (упрощенно)
      auditLogger.logUpdate('product', id, data.name || 'Товар', {}, updateData).catch(err => 
        console.error('Ошибка логирования обновления товара:', err)
      );
    }

    return data;
  },

  // Удалить товар
  async delete(id: number) {
    // Получаем данные товара перед удалением для логирования
    let productName = 'Товар';
    try {
      const product = await this.getById(id);
      productName = product.name || 'Товар';
    } catch (err) {
      // Игнорируем ошибку, если товар не найден
    }

    const { error } = await supabase
      .from('products')
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

    // Логируем удаление товара
    auditLogger.logDelete('product', id, productName).catch(err => 
      console.error('Ошибка логирования удаления товара:', err)
    );

    return true;
  },

  // Загрузить изображение (используем Supabase Storage)
  async uploadImage(file: File, productId?: number): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Загружаем файл в Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Не перезаписывать существующие файлы
        });

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError);
        
        // Более подробная информация об ошибке
        if (uploadError.message.includes('row-level security')) {
          throw new Error(
            'Ошибка доступа к Storage. Выполните SQL из файла fix_all_rls.sql в Supabase Dashboard для настройки политик Storage.'
          );
        }
        
        throw new Error(`Не удалось загрузить изображение: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Не удалось загрузить изображение: нет данных');
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(uploadData.path);

      if (!urlData?.publicUrl) {
        throw new Error('Не удалось получить URL изображения');
      }

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Полная ошибка загрузки изображения:', error);
      throw error;
    }
  },

  // Удалить изображение из Storage
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Извлекаем путь из URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'product-images');
      
      if (bucketIndex === -1) {
        throw new Error('Неверный формат URL изображения');
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (error) {
        console.error('Ошибка удаления изображения:', error);
        // Не выбрасываем ошибку, так как файл может быть уже удален
      }
    } catch (error: any) {
      console.error('Ошибка при удалении изображения:', error);
      // Не выбрасываем ошибку, продолжаем работу
    }
  },
};

