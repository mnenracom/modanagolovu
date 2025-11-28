-- Добавить поля для хранения ID товаров на маркетплейсах в таблицу products
-- Это нужно для синхронизации отзывов с маркетплейсов

-- Проверяем и добавляем поля
DO $$ 
BEGIN
    -- Поле для WildBerries nmId (номенклатура ID)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'wb_nm_id'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN wb_nm_id VARCHAR(255);
        
        RAISE NOTICE 'Колонка wb_nm_id добавлена в таблицу products';
    ELSE
        RAISE NOTICE 'Колонка wb_nm_id уже существует';
    END IF;

    -- Поле для OZON product_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'ozon_product_id'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN ozon_product_id VARCHAR(255);
        
        RAISE NOTICE 'Колонка ozon_product_id добавлена в таблицу products';
    ELSE
        RAISE NOTICE 'Колонка ozon_product_id уже существует';
    END IF;

    -- Поле для OZON offer_id (артикул продавца)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'ozon_offer_id'
    ) THEN
        ALTER TABLE products 
        ADD COLUMN ozon_offer_id VARCHAR(255);
        
        RAISE NOTICE 'Колонка ozon_offer_id добавлена в таблицу products';
    ELSE
        RAISE NOTICE 'Колонка ozon_offer_id уже существует';
    END IF;
END $$;

-- Комментарии к колонкам
COMMENT ON COLUMN products.wb_nm_id IS 'ID товара на WildBerries (номенклатура ID) для синхронизации отзывов';
COMMENT ON COLUMN products.ozon_product_id IS 'ID товара на OZON (product_id) для синхронизации отзывов';
COMMENT ON COLUMN products.ozon_offer_id IS 'Артикул продавца на OZON (offer_id) для синхронизации отзывов';

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_products_wb_nm_id ON products(wb_nm_id) WHERE wb_nm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ozon_product_id ON products(ozon_product_id) WHERE ozon_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ozon_offer_id ON products(ozon_offer_id) WHERE ozon_offer_id IS NOT NULL;



