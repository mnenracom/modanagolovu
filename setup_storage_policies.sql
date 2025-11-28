-- Настройка политик для Supabase Storage (bucket product-images)
-- Выполните эти команды в Supabase SQL Editor

-- Политики для публичного доступа к Storage
-- Разрешить публичное чтение
CREATE POLICY "Public read access" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Разрешить публичную запись (для анонимных пользователей)
CREATE POLICY "Public insert access" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Разрешить публичное обновление
CREATE POLICY "Public update access" ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Разрешить публичное удаление
CREATE POLICY "Public delete access" ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- Если политики уже существуют и нужно их пересоздать, сначала удалите их:
-- DROP POLICY IF EXISTS "Public read access" ON storage.objects;
-- DROP POLICY IF EXISTS "Public insert access" ON storage.objects;
-- DROP POLICY IF EXISTS "Public update access" ON storage.objects;
-- DROP POLICY IF EXISTS "Public delete access" ON storage.objects;









