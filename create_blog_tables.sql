-- SQL скрипт для создания таблиц блога и контент-менеджмента
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- 1. Таблица категорий статей
CREATE TABLE IF NOT EXISTS article_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_article_categories_slug ON article_categories(slug);
CREATE INDEX IF NOT EXISTS idx_article_categories_is_active ON article_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_article_categories_sort_order ON article_categories(sort_order);

-- 2. Таблица статей блога
CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  excerpt TEXT, -- Краткое описание
  content TEXT NOT NULL, -- Полный текст статьи
  featured_image_url TEXT, -- Главное изображение
  category_id BIGINT REFERENCES article_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(255), -- Имя автора (для удобства)
  
  -- SEO настройки
  meta_title VARCHAR(255), -- SEO заголовок
  meta_description TEXT, -- SEO описание
  meta_keywords TEXT, -- Ключевые слова
  og_image_url TEXT, -- Open Graph изображение
  og_title VARCHAR(255), -- Open Graph заголовок
  og_description TEXT, -- Open Graph описание
  
  -- Статус и публикация
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  is_featured BOOLEAN DEFAULT false, -- Показывать в избранном
  views_count INTEGER DEFAULT 0, -- Количество просмотров
  
  -- Дополнительные настройки
  allow_comments BOOLEAN DEFAULT true,
  tags TEXT[], -- Массив тегов
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для статей
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_is_featured ON articles(is_featured);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_views_count ON articles(views_count DESC);

-- 3. Таблица медиа-библиотеки
CREATE TABLE IF NOT EXISTS media_library (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL, -- Путь к файлу в Storage
  file_url TEXT NOT NULL, -- Полный URL файла
  file_type VARCHAR(50) NOT NULL, -- image, video, document, etc.
  mime_type VARCHAR(100), -- MIME тип
  file_size BIGINT, -- Размер файла в байтах
  width INTEGER, -- Ширина (для изображений)
  height INTEGER, -- Высота (для изображений)
  alt_text TEXT, -- Альтернативный текст
  title VARCHAR(255), -- Название файла
  description TEXT, -- Описание
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  folder_path VARCHAR(500) DEFAULT '/', -- Путь к папке в библиотеке
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для медиа-библиотеки
CREATE INDEX IF NOT EXISTS idx_media_library_file_type ON media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_library_uploaded_by ON media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_library_folder_path ON media_library(folder_path);
CREATE INDEX IF NOT EXISTS idx_media_library_is_active ON media_library(is_active);
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления updated_at
DROP TRIGGER IF EXISTS update_article_categories_updated_at ON article_categories;
CREATE TRIGGER update_article_categories_updated_at
  BEFORE UPDATE ON article_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_library_updated_at ON media_library;
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Публичный доступ: категории статей (только активные)
CREATE POLICY "Публичный доступ: категории статей" ON article_categories
  FOR SELECT
  USING (is_active = true);

-- Публичный доступ: статьи (только опубликованные)
CREATE POLICY "Публичный доступ: статьи" ON articles
  FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Админы и контент-менеджеры могут управлять категориями
CREATE POLICY "Админы управляют категориями статей" ON article_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  );

-- Админы и контент-менеджеры могут управлять статьями
CREATE POLICY "Админы управляют статьями" ON articles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  );

-- Публичный доступ: медиа (только активные)
CREATE POLICY "Публичный доступ: медиа" ON media_library
  FOR SELECT
  USING (is_active = true);

-- Админы и контент-менеджеры могут управлять медиа
CREATE POLICY "Админы управляют медиа" ON media_library
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (
        (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
        OR
        (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
      )
    )
  );

-- Комментарии
COMMENT ON TABLE article_categories IS 'Категории статей блога';
COMMENT ON TABLE articles IS 'Статьи блога и новости';
COMMENT ON TABLE media_library IS 'Медиа-библиотека для хранения файлов';




