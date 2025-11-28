-- SQL скрипт для добавления колонки retail_price и wholesale_threshold в таблицу products
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавляем retail_price (розничная цена)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'retail_price'
    ) THEN
        ALTER TABLE products ADD COLUMN retail_price DECIMAL(10, 2);
        
        -- Устанавливаем retail_price = price для существующих товаров
        UPDATE products 
        SET retail_price = COALESCE(price, 0)
        WHERE retail_price IS NULL;
    END IF;
END $$;

-- Добавляем wholesale_threshold (порог для опта)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'wholesale_threshold'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_threshold INTEGER DEFAULT 10;
        
        -- Устанавливаем wholesale_threshold = min_order_quantity для существующих товаров
        UPDATE products 
        SET wholesale_threshold = COALESCE(min_order_quantity, 10)
        WHERE wholesale_threshold IS NULL OR wholesale_threshold = 0;
    END IF;
END $$;

-- Убеждаемся, что wholesale_price существует
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'wholesale_price'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_products_retail_price ON products(retail_price);
CREATE INDEX IF NOT EXISTS idx_products_wholesale_price ON products(wholesale_price);
CREATE INDEX IF NOT EXISTS idx_products_wholesale_threshold ON products(wholesale_threshold);

-- Комментарии к полям
COMMENT ON COLUMN products.retail_price IS 'Розничная цена товара';
COMMENT ON COLUMN products.wholesale_price IS 'Оптовая цена товара';
COMMENT ON COLUMN products.wholesale_threshold IS 'Минимальное количество для оптовой цены';




