-- Отключение Row Level Security для таблиц products и orders
-- Выполните эти команды в Supabase SQL Editor

-- Отключить RLS для таблицы products
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Отключить RLS для таблицы orders
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Отключить RLS для таблицы users (если используется)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Отключить RLS для таблицы categories (если используется)
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Проверка статуса RLS (опционально)
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('products', 'orders', 'users', 'categories');









