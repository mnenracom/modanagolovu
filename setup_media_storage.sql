-- SQL скрипт для настройки Storage для медиа-библиотеки
-- Выполните этот скрипт в Supabase Dashboard → Storage

-- Создание bucket для медиа-библиотеки
-- ВАЖНО: Этот скрипт нужно выполнить вручную через Supabase Dashboard → Storage
-- Или использовать Supabase CLI

-- Пример создания bucket через SQL (если доступно):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'media-library',
--   'media-library',
--   true,
--   52428800, -- 50MB
--   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf']
-- );

-- RLS политики для Storage (если bucket создан)
-- Публичный доступ на чтение
-- CREATE POLICY "Публичный доступ: чтение медиа" ON storage.objects
--   FOR SELECT
--   USING (bucket_id = 'media-library');

-- Аутентифицированные пользователи с ролью content могут загружать
-- CREATE POLICY "Контент-менеджеры загружают медиа" ON storage.objects
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     bucket_id = 'media-library' AND
--     EXISTS (
--       SELECT 1 FROM auth.users 
--       WHERE auth.users.id = auth.uid()
--       AND (
--         (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
--         OR
--         (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
--       )
--     )
--   );

-- Аутентифицированные пользователи с ролью content могут удалять
-- CREATE POLICY "Контент-менеджеры удаляют медиа" ON storage.objects
--   FOR DELETE
--   TO authenticated
--   USING (
--     bucket_id = 'media-library' AND
--     EXISTS (
--       SELECT 1 FROM auth.users 
--       WHERE auth.users.id = auth.uid()
--       AND (
--         (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'manager', 'content'))
--         OR
--         (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role' IN ('admin', 'manager', 'content'))
--       )
--     )
--   );

-- ИНСТРУКЦИЯ:
-- 1. Перейдите в Supabase Dashboard → Storage
-- 2. Создайте новый bucket с именем "media-library"
-- 3. Установите "Public bucket" = true
-- 4. Установите "File size limit" = 50MB (или нужное значение)
-- 5. Установите "Allowed MIME types" = image/*, video/*, application/pdf (или нужные типы)




