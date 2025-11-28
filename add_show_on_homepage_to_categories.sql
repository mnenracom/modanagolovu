-- Добавление поля show_on_homepage в таблицу categories
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Добавляем колонку show_on_homepage, если её еще нет
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN DEFAULT false;

-- Создаем индекс для быстрого поиска категорий для главной страницы
CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage 
ON categories(show_on_homepage) 
WHERE show_on_homepage = true;

-- Комментарий к колонке
COMMENT ON COLUMN categories.show_on_homepage IS 'Отображать категорию на главной странице';




