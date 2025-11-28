-- SQL скрипт для исправления RLS политик в Supabase
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- ============================================
-- ШАГ 1: Удаление существующих политик (если есть)
-- ============================================

-- Удаляем старые политики для таблицы products
DROP POLICY IF EXISTS "Админы управляют товарами" ON products;
DROP POLICY IF EXISTS "Admin can manage products" ON products;
DROP POLICY IF EXISTS "Клиенты видят товары" ON products;
DROP POLICY IF EXISTS "Clients can view products" ON products;

-- Удаляем старые политики для таблицы categories
DROP POLICY IF EXISTS "Админы управляют категориями" ON categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Клиенты видят категории" ON categories;
DROP POLICY IF EXISTS "Clients can view categories" ON categories;

-- Удаляем старые политики для таблицы banners
DROP POLICY IF EXISTS "Админы управляют баннерами" ON banners;
DROP POLICY IF EXISTS "Admin can manage banners" ON banners;
DROP POLICY IF EXISTS "Клиенты видят баннеры" ON banners;
DROP POLICY IF EXISTS "Clients can view banners" ON banners;

-- Удаляем старые политики для таблицы orders
DROP POLICY IF EXISTS "Админы управляют заказами" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;

-- ============================================
-- ШАГ 2: Включение RLS для всех таблиц
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ШАГ 3: Создание политик для админов
-- ============================================

-- Политика для таблицы products (админы, менеджеры, контент-менеджеры)
CREATE POLICY "Админы управляют товарами" ON products 
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'manager', 'content')
  )
);

-- Политика для таблицы categories (админы, менеджеры, контент-менеджеры)
CREATE POLICY "Админы управляют категориями" ON categories
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'manager', 'content')
  )
);

-- Политика для таблицы banners (админы, менеджеры, контент-менеджеры)
CREATE POLICY "Админы управляют баннерами" ON banners
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'manager', 'content')
  )
);

-- Политика для таблицы orders (только админы и менеджеры)
CREATE POLICY "Админы управляют заказами" ON orders
FOR ALL 
USING (
  auth.uid() IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' IN ('admin', 'manager')
  )
);

-- ============================================
-- ШАГ 4: Создание политик для клиентов (публичный доступ)
-- ============================================

-- Клиенты могут видеть товары в наличии
CREATE POLICY "Клиенты видят товары" ON products 
FOR SELECT 
USING (in_stock = true);

-- Клиенты могут видеть активные категории
CREATE POLICY "Клиенты видят категории" ON categories
FOR SELECT 
USING (is_active = true);

-- Клиенты могут видеть активные баннеры
CREATE POLICY "Клиенты видят баннеры" ON banners
FOR SELECT 
USING (is_active = true);

-- ============================================
-- ШАГ 5: Проверка политик
-- ============================================

-- Проверяем созданные политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('products', 'categories', 'banners', 'orders')
ORDER BY tablename, policyname;




