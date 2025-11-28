-- SQL скрипт для создания Storage bucket и настройки RLS политик
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Создание bucket для медиа-библиотеки
-- ВАЖНО: Сначала создайте bucket вручную через Supabase Dashboard → Storage
-- Затем выполните этот скрипт для настройки RLS политик

-- Удаляем существующие политики
DROP POLICY IF EXISTS "Публичный доступ: чтение медиа" ON storage.objects;
DROP POLICY IF EXISTS "Контент-менеджеры загружают медиа" ON storage.objects;
DROP POLICY IF EXISTS "Контент-менеджеры удаляют медиа" ON storage.objects;
DROP POLICY IF EXISTS "Контент-менеджеры обновляют медиа" ON storage.objects;
DROP POLICY IF EXISTS "temp_media_access" ON storage.objects;
DROP POLICY IF EXISTS "Все могут загружать медиа" ON storage.objects;
DROP POLICY IF EXISTS "Все могут удалять медиа" ON storage.objects;

-- Публичный доступ на чтение
CREATE POLICY "Публичный доступ: чтение медиа" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media-library');

-- ВРЕМЕННО: Все авторизованные могут загружать (для тестирования)
CREATE POLICY "Контент-менеджеры загружают медиа" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-library');

-- ВРЕМЕННО: Все авторизованные могут удалять (для тестирования)
CREATE POLICY "Контент-менеджеры удаляют медиа" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'media-library');

-- ВРЕМЕННО: Все авторизованные могут обновлять (для тестирования)
CREATE POLICY "Контент-менеджеры обновляют медиа" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'media-library')
  WITH CHECK (bucket_id = 'media-library');

