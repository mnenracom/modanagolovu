-- Добавление колонки article (артикул) в таблицу products
-- Выполните в Supabase SQL Editor

-- Проверка и добавление поля article если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'article'
    ) THEN
        ALTER TABLE products ADD COLUMN article VARCHAR(100);
        
        -- Создаем индекс для быстрого поиска по артикулу
        CREATE INDEX IF NOT EXISTS idx_products_article ON products(article);
        
        -- Комментарий к колонке
        COMMENT ON COLUMN products.article IS 'Внутренний артикул товара (например "ПГХ3005")';
        
        RAISE NOTICE 'Колонка article успешно добавлена в таблицу products';
    ELSE
        RAISE NOTICE 'Колонка article уже существует в таблице products';
    END IF;
END $$;

-- Миграция данных: переносим артикулы из import_metadata в новую колонку article
-- Это обновит только те товары, у которых есть артикул в import_metadata
UPDATE products 
SET article = import_metadata->>'артикул'
WHERE import_metadata IS NOT NULL 
  AND import_metadata->>'артикул' IS NOT NULL 
  AND import_metadata->>'артикул' != ''
  AND (article IS NULL OR article = '');

-- Показываем статистику
DO $$
DECLARE
    total_count INTEGER;
    with_article INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM products;
    SELECT COUNT(*) INTO with_article FROM products WHERE article IS NOT NULL AND article != '';
    
    RAISE NOTICE 'Всего товаров: %', total_count;
    RAISE NOTICE 'Товаров с артикулом: %', with_article;
END $$;



