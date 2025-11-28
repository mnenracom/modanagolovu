-- Обновление категорий в товарах для соответствия slug из таблицы categories
-- Выполните этот SQL ПОСЛЕ создания таблицы categories

-- Обновление категорий в товарах
UPDATE products 
SET category = 'platki' 
WHERE category = 'scarves';

UPDATE products 
SET category = 'kosynki' 
WHERE category = 'kosinka';

UPDATE products 
SET category = 'kapory' 
WHERE category = 'capor';

-- Если нужно сохранить банданы, создаем категорию для них
INSERT INTO categories (name, slug, description, order_index, is_active) 
SELECT 'Банданы', 'bandanas', 'Яркие и стильные банданы', 5, true
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'bandanas');

-- Проверка результата
SELECT category, COUNT(*) as count 
FROM products 
GROUP BY category 
ORDER BY count DESC;









