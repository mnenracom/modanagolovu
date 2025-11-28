-- Миграция для поддержки розничных и оптовых продаж
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- ============================================
-- 1. ОБНОВЛЕНИЕ ТАБЛИЦЫ products
-- ============================================

-- Добавляем новые поля для dual-цен
DO $$ 
BEGIN
    -- retail_price (розничная цена)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'retail_price'
    ) THEN
        ALTER TABLE products ADD COLUMN retail_price DECIMAL(10, 2);
    END IF;

    -- wholesale_price (оптовая цена) - уже существует, но убедимся что он есть
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'wholesale_price'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10, 2);
    END IF;

    -- wholesale_threshold (порог для опта - минимальное количество для оптовой цены)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'wholesale_threshold'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_threshold INTEGER DEFAULT 10;
    END IF;

    -- min_retail_order (минимальная сумма розничного заказа)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'min_retail_order'
    ) THEN
        ALTER TABLE products ADD COLUMN min_retail_order DECIMAL(10, 2) DEFAULT 1000.00;
    END IF;

    -- min_wholesale_order (минимальная сумма оптового заказа)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'min_wholesale_order'
    ) THEN
        ALTER TABLE products ADD COLUMN min_wholesale_order DECIMAL(10, 2) DEFAULT 5000.00;
    END IF;

    -- economy_percent (процент экономии при оптовой покупке)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'economy_percent'
    ) THEN
        ALTER TABLE products ADD COLUMN economy_percent DECIMAL(5, 2) DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- 2. ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ТОВАРОВ
-- ============================================

-- Устанавливаем retail_price = price (текущая цена становится розничной)
-- Проверяем наличие колонки price перед обновлением
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'price'
    ) THEN
        UPDATE products 
        SET retail_price = COALESCE(price, 0)
        WHERE retail_price IS NULL;
    ELSE
        -- Если price не существует, устанавливаем retail_price = 0
        UPDATE products 
        SET retail_price = 0
        WHERE retail_price IS NULL;
    END IF;
END $$;

-- Устанавливаем wholesale_price (если не установлен, используем текущий wholesale_price или retail_price * 0.8)
UPDATE products 
SET wholesale_price = COALESCE(wholesale_price, retail_price * 0.8)
WHERE wholesale_price IS NULL OR wholesale_price = 0;

-- Рассчитываем economy_percent автоматически
UPDATE products 
SET economy_percent = CASE 
    WHEN retail_price > 0 AND wholesale_price > 0 THEN
        ROUND(((retail_price - wholesale_price) / retail_price * 100)::numeric, 2)
    ELSE 0
END
WHERE economy_percent IS NULL OR economy_percent = 0;

-- Устанавливаем wholesale_threshold = min_order_quantity если не установлен
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'min_order_quantity'
    ) THEN
        UPDATE products 
        SET wholesale_threshold = COALESCE(min_order_quantity, 10)
        WHERE wholesale_threshold IS NULL OR wholesale_threshold = 0;
    ELSE
        UPDATE products 
        SET wholesale_threshold = 10
        WHERE wholesale_threshold IS NULL OR wholesale_threshold = 0;
    END IF;
END $$;

-- ============================================
-- 3. ОБНОВЛЕНИЕ ТАБЛИЦЫ orders
-- ============================================

-- Добавляем новые поля для типов заказов
DO $$ 
BEGIN
    -- order_type (retail/wholesale)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'order_type'
    ) THEN
        ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'retail' 
            CHECK (order_type IN ('retail', 'wholesale'));
    END IF;

    -- original_total (оригинальная сумма до скидок)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'original_total'
    ) THEN
        ALTER TABLE orders ADD COLUMN original_total DECIMAL(10, 2);
    END IF;

    -- final_total (итоговая сумма после всех скидок)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'final_total'
    ) THEN
        ALTER TABLE orders ADD COLUMN final_total DECIMAL(10, 2);
    END IF;

    -- economy_amount (сумма экономии)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'economy_amount'
    ) THEN
        ALTER TABLE orders ADD COLUMN economy_amount DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Обновляем существующие заказы
-- Сначала проверяем наличие колонок перед обновлением
DO $$ 
DECLARE
    has_subtotal BOOLEAN;
    has_shipping_cost BOOLEAN;
    has_discount BOOLEAN;
    has_total_amount BOOLEAN;
BEGIN
    -- Проверяем наличие всех необходимых колонок
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'subtotal'
    ) INTO has_subtotal;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'shipping_cost'
    ) INTO has_shipping_cost;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'discount'
    ) INTO has_discount;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'total_amount'
    ) INTO has_total_amount;
    
    -- Обновляем заказы в зависимости от наличия колонок
    IF has_total_amount THEN
        IF has_subtotal AND has_shipping_cost AND has_discount THEN
            -- Все колонки существуют
            UPDATE orders 
            SET 
                order_type = CASE 
                    WHEN total_amount >= 5000 THEN 'wholesale'
                    ELSE 'retail'
                END,
                original_total = COALESCE(subtotal + shipping_cost, total_amount),
                final_total = COALESCE(total_amount, subtotal + shipping_cost - COALESCE(discount, 0)),
                economy_amount = COALESCE(discount, 0)
            WHERE order_type IS NULL;
        ELSIF has_subtotal AND has_shipping_cost THEN
            -- Нет discount
            UPDATE orders 
            SET 
                order_type = CASE 
                    WHEN total_amount >= 5000 THEN 'wholesale'
                    ELSE 'retail'
                END,
                original_total = COALESCE(subtotal + shipping_cost, total_amount),
                final_total = total_amount,
                economy_amount = 0
            WHERE order_type IS NULL;
        ELSE
            -- Только total_amount
            UPDATE orders 
            SET 
                order_type = CASE 
                    WHEN total_amount >= 5000 THEN 'wholesale'
                    ELSE 'retail'
                END,
                original_total = total_amount,
                final_total = total_amount,
                economy_amount = 0
            WHERE order_type IS NULL;
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. СОЗДАНИЕ ИНДЕКСОВ
-- ============================================

-- Индексы для быстрого поиска по типам заказов
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_products_retail_price ON products(retail_price);
CREATE INDEX IF NOT EXISTS idx_products_wholesale_price ON products(wholesale_price);

-- ============================================
-- 5. КОММЕНТАРИИ
-- ============================================

COMMENT ON COLUMN products.retail_price IS 'Розничная цена товара';
COMMENT ON COLUMN products.wholesale_price IS 'Оптовая цена товара';
COMMENT ON COLUMN products.wholesale_threshold IS 'Минимальное количество для оптовой цены';
COMMENT ON COLUMN products.min_retail_order IS 'Минимальная сумма розничного заказа';
COMMENT ON COLUMN products.min_wholesale_order IS 'Минимальная сумма оптового заказа';
COMMENT ON COLUMN products.economy_percent IS 'Процент экономии при оптовой покупке (автоматически рассчитывается)';

COMMENT ON COLUMN orders.order_type IS 'Тип заказа: retail (розница) или wholesale (опт)';
COMMENT ON COLUMN orders.original_total IS 'Оригинальная сумма заказа до применения скидок';
COMMENT ON COLUMN orders.final_total IS 'Итоговая сумма заказа после всех скидок';
COMMENT ON COLUMN orders.economy_amount IS 'Сумма экономии при оптовой покупке';

-- ============================================
-- ГОТОВО!
-- ============================================
-- После выполнения миграции:
-- 1. Все существующие товары будут иметь retail_price = price
-- 2. wholesale_price будет установлен (если был) или рассчитан как retail_price * 0.8
-- 3. economy_percent будет автоматически рассчитан
-- 4. Существующие заказы будут классифицированы как retail/wholesale на основе суммы

