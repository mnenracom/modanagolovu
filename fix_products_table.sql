-- Исправление таблицы products - добавление недостающих полей
-- Выполните в Supabase SQL Editor если поля отсутствуют

-- Проверка и добавление поля discount если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'discount'
    ) THEN
        ALTER TABLE products ADD COLUMN discount DECIMAL(5, 2) DEFAULT 0;
    END IF;
END $$;

-- Проверка и добавление поля subcategory если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'subcategory'
    ) THEN
        ALTER TABLE products ADD COLUMN subcategory VARCHAR(100);
    END IF;
END $$;

-- Проверка и добавление поля material если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'material'
    ) THEN
        ALTER TABLE products ADD COLUMN material VARCHAR(255);
    END IF;
END $$;

-- Проверка и добавление поля sku если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'sku'
    ) THEN
        ALTER TABLE products ADD COLUMN sku VARCHAR(100);
    END IF;
END $$;

-- Проверка и добавление поля colors если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'colors'
    ) THEN
        ALTER TABLE products ADD COLUMN colors TEXT[];
    END IF;
END $$;

-- Проверка и добавление поля sizes если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'sizes'
    ) THEN
        ALTER TABLE products ADD COLUMN sizes TEXT[];
    END IF;
END $$;

-- Проверка и добавление поля price_ranges если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'price_ranges'
    ) THEN
        ALTER TABLE products ADD COLUMN price_ranges JSONB;
    END IF;
END $$;

-- Проверка и добавление поля variations если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'variations'
    ) THEN
        ALTER TABLE products ADD COLUMN variations JSONB;
    END IF;
END $$;

-- Проверка и добавление поля wholesale_price если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'wholesale_price'
    ) THEN
        ALTER TABLE products ADD COLUMN wholesale_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Проверка и добавление поля min_order_quantity если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'min_order_quantity'
    ) THEN
        ALTER TABLE products ADD COLUMN min_order_quantity INTEGER DEFAULT 1;
    END IF;
END $$;

-- Проверка и добавление поля updated_at если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    END IF;
END $$;

-- Создание индекса для sku если его нет
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Создание индекса для subcategory если его нет
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);









