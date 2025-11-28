-- Добавление поля show_in_new_products в таблицу products
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Добавляем колонку show_in_new_products, если её еще нет
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS show_in_new_products BOOLEAN DEFAULT false;

-- Создаем индекс для быстрого поиска товаров для секции новинок
CREATE INDEX IF NOT EXISTS idx_products_show_in_new_products 
ON products(show_in_new_products) 
WHERE show_in_new_products = true AND in_stock = true;

-- Комментарий к колонке
COMMENT ON COLUMN products.show_in_new_products IS 'Отображать товар в секции новинок на главной странице';




