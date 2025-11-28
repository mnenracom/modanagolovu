-- SQL скрипт для ПРАВИЛЬНОЙ настройки RLS политик в Supabase
-- ⚠️ ВАЖНО: Сначала выполните URGENT_RESTORE_ACCESS.sql для восстановления доступа
-- Затем выполните этот скрипт для правильной настройки политик

-- ============================================
-- ШАГ 1: Удаление временных политик
-- ============================================

DROP POLICY IF EXISTS "temp_see_all_products" ON products;
DROP POLICY IF EXISTS "temp_see_all_categories" ON categories;
DROP POLICY IF EXISTS "temp_see_all_banners" ON banners;
DROP POLICY IF EXISTS "temp_manage_all_products" ON products;
DROP POLICY IF EXISTS "temp_manage_all_categories" ON categories;
DROP POLICY IF EXISTS "temp_manage_all_banners" ON banners;
DROP POLICY IF EXISTS "temp_manage_all_orders" ON orders;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Админы управляют товарами" ON products;
DROP POLICY IF EXISTS "Admin can manage products" ON products;
DROP POLICY IF EXISTS "Клиенты видят товары" ON products;
DROP POLICY IF EXISTS "Clients can view products" ON products;

DROP POLICY IF EXISTS "Админы управляют категориями" ON categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Клиенты видят категории" ON categories;
DROP POLICY IF EXISTS "Clients can view categories" ON categories;

DROP POLICY IF EXISTS "Админы управляют баннерами" ON banners;
DROP POLICY IF EXISTS "Admin can manage banners" ON banners;
DROP POLICY IF EXISTS "Клиенты видят баннеры" ON banners;
DROP POLICY IF EXISTS "Clients can view banners" ON banners;

DROP POLICY IF EXISTS "Админы управляют заказами" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;

-- ============================================
-- ШАГ 2: Включение RLS (если еще не включено)
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ШАГ 3: Политики для ПУБЛИЧНОГО доступа (ВСЕ могут видеть)
-- ============================================

-- ВАЖНО: Сначала создаем политики для публичного доступа,
-- чтобы клиенты могли видеть данные БЕЗ авторизации

-- Публичный доступ: все видят товары в наличии
CREATE POLICY "Публичный доступ: товары" ON products 
FOR SELECT 
USING (in_stock = true);

-- Публичный доступ: все видят активные категории
CREATE POLICY "Публичный доступ: категории" ON categories
FOR SELECT 
USING (is_active = true);

-- Публичный доступ: все видят активные баннеры
CREATE POLICY "Публичный доступ: баннеры" ON banners
FOR SELECT 
USING (is_active = true);

-- ============================================
-- ШАГ 4: Политики для АДМИНОВ (только авторизованные с нужными ролями)
-- ============================================

-- Админы могут управлять товарами (admin, manager, content)
CREATE POLICY "Админы управляют товарами" ON products 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
);

-- Админы могут управлять категориями (admin, manager, content)
CREATE POLICY "Админы управляют категориями" ON categories
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
);

-- Админы могут управлять баннерами (admin, manager, content)
CREATE POLICY "Админы управляют баннерами" ON banners
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager', 'content'))
  )
);

-- Админы могут управлять заказами (только admin, manager)
CREATE POLICY "Админы управляют заказами" ON orders
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager'))
  )
);

-- ============================================
-- ШАГ 5: Проверка политик
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('products', 'categories', 'banners', 'orders')
ORDER BY tablename, policyname;




