-- SQL скрипт для добавления полей для отслеживания импорта товаров
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавляем поля для отслеживания импорта
DO $$ 
BEGIN
  -- Источник импорта (например, 'wildberries', 'ozon', 'manual', 'csv', 'excel')
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'import_source') THEN
    ALTER TABLE products ADD COLUMN import_source VARCHAR(100);
  END IF;

  -- Дата импорта
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'imported_at') THEN
    ALTER TABLE products ADD COLUMN imported_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- ID импорта (для группировки товаров из одного импорта)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'import_batch_id') THEN
    ALTER TABLE products ADD COLUMN import_batch_id VARCHAR(255);
  END IF;

  -- Метаданные импорта (JSON)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'import_metadata') THEN
    ALTER TABLE products ADD COLUMN import_metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_products_import_source ON products(import_source);
CREATE INDEX IF NOT EXISTS idx_products_imported_at ON products(imported_at);
CREATE INDEX IF NOT EXISTS idx_products_import_batch_id ON products(import_batch_id);

-- Комментарии к полям
COMMENT ON COLUMN products.import_source IS 'Источник импорта товара (wildberries, ozon, manual, csv, excel)';
COMMENT ON COLUMN products.imported_at IS 'Дата и время импорта товара';
COMMENT ON COLUMN products.import_batch_id IS 'ID партии импорта для группировки товаров из одного импорта';
COMMENT ON COLUMN products.import_metadata IS 'Дополнительные метаданные импорта (JSON)';




