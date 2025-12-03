-- Финальные RLS политики для таблицы users
-- Этот скрипт настраивает RLS с учетом работы триггера регистрации

-- Включить RLS для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удалить все существующие политики, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Пользователи видят свои данные" ON users;
DROP POLICY IF EXISTS "Пользователи создают свои записи" ON users;
DROP POLICY IF EXISTS "Пользователи обновляют свои данные" ON users;
DROP POLICY IF EXISTS "Админы видят всех пользователей" ON users;
DROP POLICY IF EXISTS "Админы обновляют пользователей" ON users;

-- 1. Политика для чтения - пользователи могут видеть только свои данные
CREATE POLICY "Users can view own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Политика для вставки - пользователи могут создавать только свои записи
-- ВАЖНО: Триггер handle_new_user использует SECURITY DEFINER,
-- поэтому он обходит RLS и может создавать записи автоматически.
-- Эта политика нужна только для ручного создания записей.
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Проверка: показать все политики для таблицы users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Примечание о триггере:
-- Функция handle_new_user создана с SECURITY DEFINER,
-- что означает, что она выполняется с правами создателя функции (обычно postgres).
-- При выполнении триггера RLS НЕ ПРИМЕНЯЕТСЯ, поэтому триггер может создавать записи
-- даже если политика "Users can insert own data" не позволяет это делать напрямую.
--
-- Это правильное поведение для триггеров регистрации:
-- - Пользователь регистрируется через Supabase Auth
-- - Триггер автоматически создает запись в public.users
-- - RLS не блокирует эту операцию, потому что триггер работает с правами postgres
--
-- Если регистрация не работает, проверьте:
-- 1. Существует ли функция handle_new_user и триггер on_auth_user_created
--    (выполните check_and_fix_registration_triggers.sql)
-- 2. Правильно ли настроена функция (должна быть SECURITY DEFINER)
-- 3. Включено ли подтверждение email в настройках Authentication



