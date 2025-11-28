-- ПОЛНОЕ РЕШЕНИЕ: Отключение RLS и настройка Storage
-- Выполните ВСЕ команды в Supabase SQL Editor

-- ============================================
-- 1. ОТКЛЮЧИТЬ RLS ДЛЯ ВСЕХ ТАБЛИЦ
-- ============================================

ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Проверка: убедитесь что RLS отключен
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('products', 'orders', 'users', 'categories');

-- ============================================
-- 2. НАСТРОИТЬ ПОЛИТИКИ ДЛЯ STORAGE
-- ============================================

-- Удалить существующие политики для product-images (если есть)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public insert access" ON storage.objects;
DROP POLICY IF EXISTS "Public update access" ON storage.objects;
DROP POLICY IF EXISTS "Public delete access" ON storage.objects;

-- Создать политики для публичного доступа к Storage
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

-- ============================================
-- 3. ПРОВЕРКА
-- ============================================

-- Проверить политики Storage
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'objects' 
-- AND schemaname = 'storage'
-- AND policyname LIKE '%product-images%';









