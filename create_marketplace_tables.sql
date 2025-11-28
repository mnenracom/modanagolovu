-- SQL скрипт для создания таблиц маркетплейсов (WildBerries и OZON)
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- 1. Таблица настроек маркетплейсов (API ключи и настройки)
CREATE TABLE IF NOT EXISTS marketplace_settings (
  id SERIAL PRIMARY KEY,
  marketplace_type VARCHAR(50) NOT NULL, -- 'wildberries' или 'ozon'
  account_name VARCHAR(255) NOT NULL, -- Название аккаунта (например, 'WB Основной', 'OZON 1')
  api_key TEXT NOT NULL, -- API ключ
  api_secret TEXT, -- Секретный ключ (для OZON)
  client_id TEXT, -- Client ID (для OZON)
  seller_id TEXT, -- Seller ID (для WB)
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true, -- Включена ли автоматическая синхронизация
  sync_interval_minutes INTEGER DEFAULT 60, -- Интервал синхронизации в минутах
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50), -- 'success', 'error', 'pending'
  last_sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marketplace_type, account_name)
);

-- Индексы для marketplace_settings
CREATE INDEX IF NOT EXISTS idx_marketplace_settings_type ON marketplace_settings(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_settings_active ON marketplace_settings(is_active);

-- 2. Таблица статистики продаж с маркетплейсов
CREATE TABLE IF NOT EXISTS marketplace_sales (
  id BIGSERIAL PRIMARY KEY,
  marketplace_type VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Общая статистика
  orders_count INTEGER DEFAULT 0,
  revenue DECIMAL(12, 2) DEFAULT 0, -- Выручка (цена продажи)
  commission DECIMAL(12, 2) DEFAULT 0, -- Комиссия маркетплейса
  logistics DECIMAL(12, 2) DEFAULT 0, -- Логистика/доставка
  storage DECIMAL(12, 2) DEFAULT 0, -- Хранение
  penalties DECIMAL(12, 2) DEFAULT 0, -- Штрафы
  returns DECIMAL(12, 2) DEFAULT 0, -- Возвраты
  total_expenses DECIMAL(12, 2) DEFAULT 0, -- Все расходы (комиссия + логистика + хранение + штрафы + возвраты)
  profit DECIMAL(12, 2) DEFAULT 0, -- Реальная прибыль (выручка - все расходы)
  net_revenue DECIMAL(12, 2) DEFAULT 0, -- Чистая выручка (для обратной совместимости, равно profit)
  
  -- Статистика по товарам
  items_sold INTEGER DEFAULT 0, -- Количество реально проданных (выкупленных) товаров
  average_order_value DECIMAL(10, 2) DEFAULT 0, -- Средний чек
  
  -- Рейтинги и отзывы
  rating DECIMAL(3, 2) DEFAULT 0, -- Средний рейтинг
  reviews_count INTEGER DEFAULT 0, -- Количество отзывов
  positive_reviews_count INTEGER DEFAULT 0,
  
  -- Дополнительные метрики
  views_count INTEGER DEFAULT 0, -- Просмотры товаров
  add_to_cart_count INTEGER DEFAULT 0, -- Добавления в корзину
  conversion_rate DECIMAL(5, 2) DEFAULT 0, -- Конверсия (%)
  
  -- Данные в JSON для гибкости
  metadata JSONB DEFAULT '{}', -- Дополнительные данные
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marketplace_type, account_name, date)
);

-- Индексы для marketplace_sales
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_type ON marketplace_sales(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_account ON marketplace_sales(account_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_date ON marketplace_sales(date);
CREATE INDEX IF NOT EXISTS idx_marketplace_sales_type_date ON marketplace_sales(marketplace_type, date);

-- 3. Таблица товаров с маркетплейсов
CREATE TABLE IF NOT EXISTS marketplace_products (
  id BIGSERIAL PRIMARY KEY,
  marketplace_type VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  marketplace_product_id VARCHAR(255) NOT NULL, -- ID товара на маркетплейсе
  
  -- Основная информация
  name VARCHAR(500) NOT NULL,
  sku VARCHAR(255),
  barcode VARCHAR(255),
  category VARCHAR(255),
  
  -- Цены и остатки
  price DECIMAL(10, 2) DEFAULT 0,
  old_price DECIMAL(10, 2), -- Старая цена (для скидок)
  stock_quantity INTEGER DEFAULT 0,
  
  -- Статистика продаж
  sales_count INTEGER DEFAULT 0, -- Количество продаж
  revenue DECIMAL(12, 2) DEFAULT 0, -- Выручка
  views_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  
  -- Статус
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'moderation', etc.
  is_visible BOOLEAN DEFAULT true,
  
  -- Связь с нашим товаром (если есть)
  our_product_id BIGINT, -- ID товара в нашей базе products
  
  -- Дополнительные данные
  images TEXT[],
  metadata JSONB DEFAULT '{}',
  
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marketplace_type, account_name, marketplace_product_id)
);

-- Индексы для marketplace_products
CREATE INDEX IF NOT EXISTS idx_marketplace_products_type ON marketplace_products(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_account ON marketplace_products(account_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_sku ON marketplace_products(sku);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_our_product ON marketplace_products(our_product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_products_status ON marketplace_products(status);

-- 4. Таблица заказов с маркетплейсов
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id BIGSERIAL PRIMARY KEY,
  marketplace_type VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  marketplace_order_id VARCHAR(255) NOT NULL, -- ID заказа на маркетплейсе
  
  -- Информация о заказе
  order_number VARCHAR(255),
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(100) NOT NULL, -- Статус заказа на маркетплейсе
  
  -- Клиент
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  delivery_address TEXT,
  
  -- Финансы
  total_amount DECIMAL(12, 2) DEFAULT 0,
  commission DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) DEFAULT 0, -- Сумма после комиссии
  delivery_cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Товары в заказе
  items JSONB DEFAULT '[]', -- Массив товаров в заказе
  
  -- Дополнительная информация
  payment_method VARCHAR(100),
  delivery_method VARCHAR(100),
  tracking_number VARCHAR(255),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(marketplace_type, account_name, marketplace_order_id)
);

-- Индексы для marketplace_orders
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_type ON marketplace_orders(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_account ON marketplace_orders(account_name);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_date ON marketplace_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_orders_number ON marketplace_orders(order_number);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_marketplace_settings_updated_at ON marketplace_settings;
CREATE TRIGGER update_marketplace_settings_updated_at
  BEFORE UPDATE ON marketplace_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_sales_updated_at ON marketplace_sales;
CREATE TRIGGER update_marketplace_sales_updated_at
  BEFORE UPDATE ON marketplace_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_products_updated_at ON marketplace_products;
CREATE TRIGGER update_marketplace_products_updated_at
  BEFORE UPDATE ON marketplace_products
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at_column();

DROP TRIGGER IF EXISTS update_marketplace_orders_updated_at ON marketplace_orders;
CREATE TRIGGER update_marketplace_orders_updated_at
  BEFORE UPDATE ON marketplace_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at_column();

-- RLS политики (если RLS включен)
-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Admins can manage marketplace settings" ON marketplace_settings;
DROP POLICY IF EXISTS "Admins can read marketplace settings" ON marketplace_settings;
DROP POLICY IF EXISTS "Admins can manage marketplace sales" ON marketplace_sales;
DROP POLICY IF EXISTS "Admins can read marketplace sales" ON marketplace_sales;
DROP POLICY IF EXISTS "Admins can manage marketplace products" ON marketplace_products;
DROP POLICY IF EXISTS "Admins can read marketplace products" ON marketplace_products;
DROP POLICY IF EXISTS "Admins can manage marketplace orders" ON marketplace_orders;
DROP POLICY IF EXISTS "Admins can read marketplace orders" ON marketplace_orders;

-- Политики для marketplace_settings
CREATE POLICY "Admins can read marketplace settings" ON marketplace_settings
  FOR SELECT
  USING (true); -- Пока разрешаем всем читать, можно ограничить по роли

CREATE POLICY "Admins can manage marketplace settings" ON marketplace_settings
  FOR ALL
  USING (true); -- Пока разрешаем всем управлять, можно ограничить по роли

-- Политики для marketplace_sales
CREATE POLICY "Admins can read marketplace sales" ON marketplace_sales
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage marketplace sales" ON marketplace_sales
  FOR ALL
  USING (true);

-- Политики для marketplace_products
CREATE POLICY "Admins can read marketplace products" ON marketplace_products
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage marketplace products" ON marketplace_products
  FOR ALL
  USING (true);

-- Политики для marketplace_orders
CREATE POLICY "Admins can read marketplace orders" ON marketplace_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage marketplace orders" ON marketplace_orders
  FOR ALL
  USING (true);

