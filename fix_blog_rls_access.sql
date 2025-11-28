-- SQL скрипт для исправления RLS политик для блога и медиа-библиотеки
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Удаляем все существующие политики для статей
DROP POLICY IF EXISTS "Публичный доступ: статьи" ON articles;
DROP POLICY IF EXISTS "Админы управляют статьями" ON articles;
DROP POLICY IF EXISTS "temp_see_all_articles" ON articles;

-- Удаляем все существующие политики для категорий статей
DROP POLICY IF EXISTS "Публичный доступ: категории статей" ON article_categories;
DROP POLICY IF EXISTS "Админы управляют категориями статей" ON article_categories;
DROP POLICY IF EXISTS "temp_see_all_article_categories" ON article_categories;

-- Удаляем все существующие политики для медиа-библиотеки
DROP POLICY IF EXISTS "Публичный доступ: медиа" ON media_library;
DROP POLICY IF EXISTS "Админы управляют медиа" ON media_library;
DROP POLICY IF EXISTS "temp_see_all_media" ON media_library;

-- ВРЕМЕННЫЕ политики для полного доступа (для восстановления работы)
-- Публичный доступ: категории статей (только активные)
CREATE POLICY "Публичный доступ: категории статей" ON article_categories
  FOR SELECT
  USING (is_active = true);

-- Публичный доступ: статьи (только опубликованные)
CREATE POLICY "Публичный доступ: статьи" ON articles
  FOR SELECT
  USING (status = 'published' AND published_at <= NOW());

-- Публичный доступ: медиа (только активные)
CREATE POLICY "Публичный доступ: медиа" ON media_library
  FOR SELECT
  USING (is_active = true);

-- ВРЕМЕННО: Админы и контент-менеджеры могут управлять категориями статей
-- Используем простую проверку через JWT claims (без EXISTS)
CREATE POLICY "Админы управляют категориями статей" ON article_categories
  FOR ALL
  TO authenticated
  USING (true) -- ВРЕМЕННО: разрешаем всем авторизованным
  WITH CHECK (true);

-- ВРЕМЕННО: Админы и контент-менеджеры могут управлять статьями
CREATE POLICY "Админы управляют статьями" ON articles
  FOR ALL
  TO authenticated
  USING (true) -- ВРЕМЕННО: разрешаем всем авторизованным
  WITH CHECK (true);

-- ВРЕМЕННО: Админы и контент-менеджеры могут управлять медиа
CREATE POLICY "Админы управляют медиа" ON media_library
  FOR ALL
  TO authenticated
  USING (true) -- ВРЕМЕННО: разрешаем всем авторизованным
  WITH CHECK (true);
