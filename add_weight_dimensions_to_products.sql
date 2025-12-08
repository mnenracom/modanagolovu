-- Добавление полей веса и габаритов в таблицу products
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавляем поле для веса (в граммах)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight_grams INTEGER DEFAULT NULL;

-- Добавляем поля для габаритов (в сантиметрах)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(5, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5, 2) DEFAULT NULL;

-- Добавляем комментарии к полям
COMMENT ON COLUMN products.weight_grams IS 'Вес товара в граммах';
COMMENT ON COLUMN products.length_cm IS 'Длина товара в сантиметрах';
COMMENT ON COLUMN products.width_cm IS 'Ширина товара в сантиметрах';
COMMENT ON COLUMN products.height_cm IS 'Высота товара в сантиметрах';

-- Создаем индексы для быстрого поиска (опционально)
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight_grams) WHERE weight_grams IS NOT NULL;

