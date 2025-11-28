-- Добавление поля show_in_bestsellers в таблицу products
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Добавляем колонку show_in_bestsellers, если её еще нет
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_in_bestsellers BOOLEAN DEFAULT false;

-- Создаем индекс для быстрого поиска товаров для секции хитов продаж
CREATE INDEX IF NOT EXISTS idx_products_show_in_bestsellers 
ON products(show_in_bestsellers) 
WHERE show_in_bestsellers = true AND in_stock = true;

-- Комментарий к колонке
COMMENT ON COLUMN products.show_in_bestsellers IS 'Отображать товар в секции "Хиты продаж" на главной странице';

