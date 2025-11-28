-- SQL скрипт для ПРАВИЛЬНОЙ настройки RLS политик в Supabase
-- ⚠️ ВАЖНО: Сначала выполните URGENT_RESTORE_ACCESS.sql для восстановления доступа
-- Затем выполните этот скрипт для правильной настройки политик
-- 
-- Этот скрипт использует безопасные методы проверки ролей без прямого доступа к auth.users

-- ============================================
-- ШАГ 1: Создание функции для проверки роли (безопасный способ)
-- ============================================

-- Функция для проверки роли пользователя (SECURITY DEFINER позволяет доступ к auth.users)
CREATE OR REPLACE FUNCTION check_user_role(allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Проверяем роль из JWT токена (безопасный способ)
  RETURN (
    (current_setting('request.jwt.claims', true)::json->>'user_metadata'->>'role') = ANY(allowed_roles)
    OR
    (current_setting('request.jwt.claims', true)::json->>'app_metadata'->>'role') = ANY(allowed_roles)
  );
END;
$$;

-- ============================================
-- ШАГ 2: Удаление временных политик
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
DROP POLICY IF EXISTS "Публичный доступ: товары" ON products;

DROP POLICY IF EXISTS "Админы управляют категориями" ON categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Клиенты видят категории" ON categories;
DROP POLICY IF EXISTS "Clients can view categories" ON categories;
DROP POLICY IF EXISTS "Публичный доступ: категории" ON categories;

DROP POLICY IF EXISTS "Админы управляют баннерами" ON banners;
DROP POLICY IF EXISTS "Admin can manage banners" ON banners;
DROP POLICY IF EXISTS "Клиенты видят баннеры" ON banners;
DROP POLICY IF EXISTS "Clients can view banners" ON banners;
DROP POLICY IF EXISTS "Публичный доступ: баннеры" ON banners;

DROP POLICY IF EXISTS "Админы управляют заказами" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;

-- ============================================
-- ШАГ 3: Включение RLS (если еще не включено)
-- ============================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ШАГ 4: Политики для ПУБЛИЧНОГО доступа (ВСЕ могут видеть)
-- ============================================

-- ВАЖНО: Сначала создаем политики для публичного доступа,
-- чтобы клиенты могли видеть данные БЕЗ авторизации

-- Публичный доступ: все видят товары в наличии
CREATE POLICY "Публичный доступ: товары" ON products 
FOR SELECT 
TO public
USING (in_stock = true);

-- Публичный доступ: все видят активные категории
CREATE POLICY "Публичный доступ: категории" ON categories
FOR SELECT 
TO public
USING (is_active = true);

-- Публичный доступ: все видят активные баннеры
CREATE POLICY "Публичный доступ: баннеры" ON banners
FOR SELECT 
TO public
USING (is_active = true);

-- ============================================
-- ШАГ 5: Политики для АДМИНОВ (только авторизованные с нужными ролями)
-- ============================================

-- Админы могут управлять товарами (admin, manager, content)
CREATE POLICY "Админы управляют товарами" ON products 
FOR ALL 
TO authenticated
USING (check_user_role(ARRAY['admin', 'manager', 'content']))
WITH CHECK (check_user_role(ARRAY['admin', 'manager', 'content']));

-- Админы могут управлять категориями (admin, manager, content)
CREATE POLICY "Админы управляют категориями" ON categories
FOR ALL 
TO authenticated
USING (check_user_role(ARRAY['admin', 'manager', 'content']))
WITH CHECK (check_user_role(ARRAY['admin', 'manager', 'content']));

-- Админы могут управлять баннерами (admin, manager, content)
CREATE POLICY "Админы управляют баннерами" ON banners
FOR ALL 
TO authenticated
USING (check_user_role(ARRAY['admin', 'manager', 'content']))
WITH CHECK (check_user_role(ARRAY['admin', 'manager', 'content']));

-- Админы могут управлять заказами (только admin, manager)
CREATE POLICY "Админы управляют заказами" ON orders
FOR ALL 
TO authenticated
USING (check_user_role(ARRAY['admin', 'manager']))
WITH CHECK (check_user_role(ARRAY['admin', 'manager']));

-- ============================================
-- ШАГ 6: Проверка политик
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




