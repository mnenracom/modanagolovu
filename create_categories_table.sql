-- Создание таблицы categories в Supabase
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Сначала создаем функцию для обновления updated_at, если её еще нет
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание таблицы categories
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  image VARCHAR(255),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Создание индексов для categories (если их еще нет)
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(order_index);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Удаляем старый триггер, если он существует, и создаем заново
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Отключение RLS для упрощения (можно включить позже с политиками)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Добавление начальных категорий (только если их еще нет)
INSERT INTO categories (name, slug, description, order_index, is_active) 
SELECT * FROM (VALUES
  ('Колпаки', 'kolpaki', 'Колпаки различных видов', 1, true),
  ('Платки', 'platki', 'Платки на голову', 2, true),
  ('Косынки', 'kosynki', 'Косынки', 3, true),
  ('Капоры', 'kapory', 'Капоры', 4, true)
) AS v(name, slug, description, order_index, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE categories.slug = v.slug
);

