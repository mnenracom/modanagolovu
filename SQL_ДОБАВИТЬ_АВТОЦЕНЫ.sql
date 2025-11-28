-- Добавление полей для управления автоценами в таблицу products
-- Выполните в Supabase SQL Editor

-- Проверка и добавление полей для автоцен
DO $$ 
BEGIN
    -- Поле для включения/выключения автоисправления цен
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'auto_price_enabled'
    ) THEN
        ALTER TABLE products ADD COLUMN auto_price_enabled BOOLEAN DEFAULT false;
        COMMENT ON COLUMN products.auto_price_enabled IS 'Включено ли автоматическое исправление цен для этого товара';
    END IF;

    -- Поле для хранения последней цены на маркетплейсе (для защиты от резких перепадов)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'last_marketplace_price'
    ) THEN
        ALTER TABLE products ADD COLUMN last_marketplace_price DECIMAL(10, 2);
        COMMENT ON COLUMN products.last_marketplace_price IS 'Последняя известная цена на маркетплейсе (для защиты от резких перепадов)';
    END IF;

    -- Поле для хранения даты последнего изменения цены
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'last_price_update_at'
    ) THEN
        ALTER TABLE products ADD COLUMN last_price_update_at TIMESTAMPTZ;
        COMMENT ON COLUMN products.last_price_update_at IS 'Дата последнего изменения цены на маркетплейсе';
    END IF;

    -- Поле для максимального процента изменения цены за раз (защита от карантина)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'max_price_change_percent'
    ) THEN
        ALTER TABLE products ADD COLUMN max_price_change_percent DECIMAL(5, 2) DEFAULT 25.00;
        COMMENT ON COLUMN products.max_price_change_percent IS 'Максимальный процент изменения цены за раз (по умолчанию 25%)';
    END IF;

    RAISE NOTICE 'Поля для автоцен успешно добавлены в таблицу products';
END $$;

-- Создаем индекс для быстрого поиска товаров с включенными автоценами
CREATE INDEX IF NOT EXISTS idx_products_auto_price_enabled ON products(auto_price_enabled) WHERE auto_price_enabled = true;

-- Показываем статистику
DO $$
DECLARE
    total_count INTEGER;
    with_auto_price INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO with_auto_price FROM products WHERE auto_price_enabled = true;
    
    RAISE NOTICE 'Всего товаров: %', total_count;
    RAISE NOTICE 'Товаров с включенными автоценами: %', with_auto_price;
END $$;



