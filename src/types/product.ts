export interface PriceRange {
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
}

export interface ProductVariation {
  id?: string;
  color?: string;
  size?: string;
  sku?: string;
  stock: number;
  price?: number; // Переопределение базовой цены для вариации
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  subcategories?: Category[];
}

export interface Product {
  id: string;
  name: string;
  category: 'scarves' | 'bandanas' | 'capor' | 'kosinka';
  subcategory?: string;
  description: string;
  image: string;
  images?: string[]; // Дополнительные изображения
  priceRanges: PriceRange[];
  colors: string[];
  sizes: string[];
  material: string;
  inStock: boolean;
  stock?: number; // Общий остаток на складе
  variations?: ProductVariation[]; // Вариации с остатками
  sku?: string; // SKU (nmId с маркетплейса)
  article?: string; // Внутренний артикул товара (например "ПГХ3005")
  discount?: number; // Скидка в процентах
  discountPrice?: number; // Цена со скидкой
  price?: number; // Базовая цена (для обратной совместимости)
  // Новые поля для dual-цен
  retailPrice?: number; // Розничная цена
  wholesalePrice?: number; // Оптовая цена
  wholesaleThreshold?: number; // Порог для опта (минимальное количество)
  // Поля для отслеживания импорта
  importSource?: string; // Источник импорта (wildberries, ozon, manual, csv, excel)
  importedAt?: string; // Дата импорта
  importBatchId?: string; // ID партии импорта
  importMetadata?: Record<string, any>; // Метаданные импорта
  // ID товаров на маркетплейсах (для синхронизации отзывов)
  wbNmId?: string; // WildBerries номенклатура ID
  ozonProductId?: string; // OZON product_id
  ozonOfferId?: string; // OZON offer_id (артикул продавца)
  // Поля для управления автоценами
  autoPriceEnabled?: boolean; // Включено ли автоматическое исправление цен
  lastMarketplacePrice?: number; // Последняя известная цена на маркетплейсе
  lastPriceUpdateAt?: string; // Дата последнего изменения цены
  maxPriceChangePercent?: number; // Максимальный процент изменения цены за раз (по умолчанию 25%)
  showInNewProducts?: boolean; // Показывать в секции новинок
  showInBestsellers?: boolean; // Показывать в секции хитов продаж
  // Поля для веса и габаритов
  weightGrams?: number; // Вес товара в граммах
  lengthCm?: number; // Длина товара в сантиметрах
  widthCm?: number; // Ширина товара в сантиметрах
  heightCm?: number; // Высота товара в сантиметрах
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}
