// Типы для работы с Supabase (snake_case)
export interface PriceRange {
  min_quantity: number;
  max_quantity: number | null;
  price: number;
}

export interface ProductVariation {
  id?: string;
  color?: string;
  size?: string;
  sku?: string;
  stock: number;
  price?: number;
}

export interface ProductSupabase {
  id: number;
  name: string;
  description: string | null;
  price?: number | null; // Базовая цена (для обратной совместимости)
  retail_price?: number | null; // Розничная цена
  wholesale_price?: number | null; // Оптовая цена
  wholesale_threshold?: number | null; // Порог для опта (минимальное количество)
  // economy_percent убрано - поле отсутствует в таблице products
  category: string;
  subcategory?: string | null;
  material?: string | null;
  sku?: string | null;
  article?: string | null; // Внутренний артикул товара (например "ПГХ3005")
  images?: string[] | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  in_stock?: boolean | null;
  stock_quantity?: number | null;
  min_order_quantity?: number | null;
  discount?: number | null;
  price_ranges?: PriceRange[] | null | any; // Может быть JSONB, массив или null
  variations?: ProductVariation[] | null;
  show_in_new_products?: boolean | null;
  show_in_bestsellers?: boolean | null;
  import_source?: string | null;
  imported_at?: string | null;
  import_batch_id?: string | null;
  import_metadata?: any | null;
  // ID товаров на маркетплейсах (для синхронизации отзывов)
  wb_nm_id?: string | null; // WildBerries номенклатура ID
  ozon_product_id?: string | null; // OZON product_id
  ozon_offer_id?: string | null; // OZON offer_id (артикул продавца)
  // Поля для управления автоценами
  auto_price_enabled?: boolean | null; // Включено ли автоматическое исправление цен
  last_marketplace_price?: number | null; // Последняя известная цена на маркетплейсе
  last_price_update_at?: string | null; // Дата последнего изменения цены
  max_price_change_percent?: number | null; // Максимальный процент изменения цены за раз (по умолчанию 25%)
  created_at?: string;
  updated_at?: string | null;
}

// Функция для преобразования Supabase формата в клиентский
export const transformProductFromSupabase = (product: ProductSupabase) => {
  try {
    // Преобразуем price_ranges из snake_case в camelCase
    let priceRanges: any[] = [];
    
    if (product.price_ranges) {
      try {
        // Если price_ranges это строка JSON, парсим её
        const parsedRanges = typeof product.price_ranges === 'string' 
          ? JSON.parse(product.price_ranges) 
          : product.price_ranges;
        
        // Если это массив, преобразуем
        if (Array.isArray(parsedRanges)) {
          priceRanges = parsedRanges.map((pr: any) => ({
            minQuantity: pr.min_quantity ?? pr.minQuantity ?? 1, // Всегда минимум 1 для розницы
            maxQuantity: pr.max_quantity ?? pr.maxQuantity ?? null,
            price: pr.price ?? product.price ?? 0,
          }));
        } else if (parsedRanges && typeof parsedRanges === 'object') {
          // Если это один объект, оборачиваем в массив
          priceRanges = [{
            minQuantity: parsedRanges.min_quantity ?? parsedRanges.minQuantity ?? 1, // Всегда минимум 1 для розницы
            maxQuantity: parsedRanges.max_quantity ?? parsedRanges.maxQuantity ?? null,
            price: parsedRanges.price ?? product.price ?? 0,
          }];
        }
      } catch (e) {
        console.warn('Ошибка парсинга price_ranges:', e);
        priceRanges = [];
      }
    }

    // Если price_ranges пустой, создаем дефолтный из price и min_order_quantity
    if (priceRanges.length === 0) {
      const minQty = 1; // Розница - всегда минимум 1 шт
      const price = product.price ?? product.wholesale_price ?? 0;
      priceRanges = [{ minQuantity: minQty, maxQuantity: null, price: price }];
    }

    // Обрабатываем images
    let images: string[] = [];
    if (product.images) {
      if (Array.isArray(product.images)) {
        images = product.images.filter(img => img && typeof img === 'string');
      } else if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          images = Array.isArray(parsed) ? parsed.filter((img: any) => img && typeof img === 'string') : [];
        } catch {
          images = [];
        }
      }
    }

    // Базовая цена - используем retail_price, price или wholesale_price
    const basePrice = product.retail_price ?? product.price ?? product.wholesale_price ?? 0;
    
    return {
      id: product.id?.toString() || '',
      name: product.name || 'Без названия',
      category: (product.category || 'scarves') as 'scarves' | 'bandanas' | 'capor' | 'kosinka',
      subcategory: product.subcategory || undefined,
      description: product.description || '',
      image: images[0] || '',
      images: images,
      priceRanges: priceRanges,
      colors: Array.isArray(product.colors) ? product.colors : [],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      material: product.material || '',
      sku: product.sku || undefined,
      article: product.article || undefined,
      stock: product.stock_quantity ?? 0,
      variations: Array.isArray(product.variations) ? product.variations : [],
      discount: product.discount ?? 0,
      inStock: product.in_stock ?? true,
      price: basePrice, // Базовая цена для обратной совместимости
      // Новые поля для dual-цен
      retailPrice: product.retail_price ?? product.price ?? 0,
      wholesalePrice: product.wholesale_price ?? product.price ?? 0,
      wholesaleThreshold: product.wholesale_threshold ?? 10, // Порог для опта
      importSource: product.import_source,
      importedAt: product.imported_at,
      importBatchId: product.import_batch_id,
      importMetadata: product.import_metadata || {},
      showInNewProducts: product.show_in_new_products ?? false,
      showInBestsellers: product.show_in_bestsellers ?? false,
      // ID маркетплейсов
      wbNmId: product.wb_nm_id,
      ozonProductId: product.ozon_product_id,
      ozonOfferId: product.ozon_offer_id,
      // Поля для управления автоценами
      autoPriceEnabled: product.auto_price_enabled ?? false,
      lastMarketplacePrice: product.last_marketplace_price ?? undefined,
      lastPriceUpdateAt: product.last_price_update_at ?? undefined,
      maxPriceChangePercent: product.max_price_change_percent ?? 25.00,
    };
  } catch (error) {
    console.error('Ошибка преобразования товара:', error, product);
    // Возвращаем минимальный объект товара
    return {
      id: product.id?.toString() || '',
      name: product.name || 'Без названия',
      category: 'scarves' as const,
      description: product.description || '',
      image: '',
      images: [],
      priceRanges: [{ minQuantity: 1, maxQuantity: null, price: product.price ?? 0 }], // Розница - всегда от 1 шт
      colors: [],
      sizes: [],
      material: product.material || '',
      inStock: product.in_stock ?? true,
      stock: product.stock_quantity ?? 0,
      discount: product.discount ?? 0,
    };
  }
};

// Функция для преобразования клиентского формата в Supabase
export const transformProductToSupabase = (product: any) => {
  const priceRanges = product.priceRanges || [];
  const minPrice = priceRanges.length > 0 ? priceRanges[0].price : (product.price || 0);
  const retailPrice = product.retailPrice ?? product.retail_price ?? product.price ?? minPrice;
  const wholesalePrice = product.wholesalePrice ?? product.wholesale_price ?? minPrice;
  
  return {
    name: product.name,
    description: product.description || '',
    price: product.price || retailPrice, // Для обратной совместимости
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    wholesale_threshold: product.wholesaleThreshold ?? product.wholesale_threshold ?? 10, // Порог для опта
    // economy_percent убрано - поле отсутствует в таблице products
    category: product.category,
    subcategory: product.subcategory || null,
    material: product.material || '',
    sku: product.sku || null,
    article: product.article !== undefined ? (product.article && product.article.trim() ? product.article.trim() : null) : null,
    images: product.images || [],
    colors: product.colors || [],
    sizes: product.sizes || [],
    in_stock: product.inStock ?? true,
    stock_quantity: product.stock || 0,
    min_order_quantity: 1, // Розница - всегда минимум 1 шт
    discount: product.discount || 0,
    price_ranges: priceRanges.map((pr: any) => ({
      min_quantity: pr.minQuantity,
      max_quantity: pr.maxQuantity,
      price: pr.price,
    })),
    variations: product.variations || [],
    show_in_new_products: product.show_in_new_products ?? false,
    show_in_bestsellers: product.show_in_bestsellers ?? false,
    import_source: product.importSource,
    imported_at: product.importedAt,
    import_batch_id: product.importBatchId,
    import_metadata: product.importMetadata || {},
    // ID маркетплейсов
    wb_nm_id: product.wbNmId || null,
    ozon_product_id: product.ozonProductId || null,
    ozon_offer_id: product.ozonOfferId || null,
    // Поля для управления автоценами
    auto_price_enabled: product.autoPriceEnabled ?? false,
    last_marketplace_price: product.lastMarketplacePrice ?? null,
    last_price_update_at: product.lastPriceUpdateAt ?? null,
    max_price_change_percent: product.maxPriceChangePercent ?? 25.00,
  };
};

