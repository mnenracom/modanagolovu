-- ⚠️ СРОЧНО! Восстановление доступа к данным
-- Выполните ЭТОТ скрипт ПЕРВЫМ в Supabase Dashboard → SQL Editor

-- Удаляем все существующие политики, которые блокируют доступ
DROP POLICY IF EXISTS "Админы управляют товарами" ON products;
DROP POLICY IF EXISTS "Admin can manage products" ON products;
DROP POLICY IF EXISTS "Клиенты видят товары" ON products;
DROP POLICY IF EXISTS "Clients can view products" ON products;
DROP POLICY IF EXISTS "Публичный доступ: товары" ON products;
DROP POLICY IF EXISTS "temp_see_all_products" ON products;
DROP POLICY IF EXISTS "temp_manage_all_products" ON products;

DROP POLICY IF EXISTS "Админы управляют категориями" ON categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Клиенты видят категории" ON categories;
DROP POLICY IF EXISTS "Clients can view categories" ON categories;
DROP POLICY IF EXISTS "Публичный доступ: категории" ON categories;
DROP POLICY IF EXISTS "temp_see_all_categories" ON categories;
DROP POLICY IF EXISTS "temp_manage_all_categories" ON categories;

DROP POLICY IF EXISTS "Админы управляют баннерами" ON banners;
DROP POLICY IF EXISTS "Admin can manage banners" ON banners;
DROP POLICY IF EXISTS "Клиенты видят баннеры" ON banners;
DROP POLICY IF EXISTS "Clients can view banners" ON banners;
DROP POLICY IF EXISTS "Публичный доступ: баннеры" ON banners;
DROP POLICY IF EXISTS "temp_see_all_banners" ON banners;
DROP POLICY IF EXISTS "temp_manage_all_banners" ON banners;

DROP POLICY IF EXISTS "Админы управляют заказами" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;
DROP POLICY IF EXISTS "temp_manage_all_orders" ON orders;

-- ВРЕМЕННЫЕ ПОЛИТИКИ - ВСЕ ВИДЯТ ВСЁ (для восстановления доступа)
-- Эти политики разрешают ВСЕ операции для ВСЕХ пользователей
CREATE POLICY "temp_see_all_products" ON products FOR SELECT USING (true);
CREATE POLICY "temp_see_all_categories" ON categories FOR SELECT USING (true);
CREATE POLICY "temp_see_all_banners" ON banners FOR SELECT USING (true);

-- ВРЕМЕННЫЕ ПОЛИТИКИ - ВСЕ МОГУТ УПРАВЛЯТЬ (для восстановления доступа)
CREATE POLICY "temp_manage_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "temp_manage_all_categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "temp_manage_all_banners" ON banners FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "temp_manage_all_orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- Проверка: все данные должны быть доступны
SELECT '✅ Политики созданы! Доступ к данным восстановлен.' as status;
