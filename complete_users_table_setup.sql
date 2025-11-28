-- Полная настройка таблицы users с правильными RLS политиками
-- Этот скрипт включает политики для триггера и для прямого доступа

-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удаляем все старые политики
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Пользователи видят свои данные" ON users;
DROP POLICY IF EXISTS "Пользователи создают свои записи" ON users;
DROP POLICY IF EXISTS "Пользователи обновляют свои данные" ON users;
DROP POLICY IF EXISTS "Админы видят всех пользователей" ON users;
DROP POLICY IF EXISTS "Админы обновляют пользователей" ON users;

-- 1. Политика для чтения - пользователи могут видеть только свои данные
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Политика для вставки - пользователи могут создавать только свои записи
-- ВАЖНО: Это для прямого INSERT из клиента, триггер обходит RLS благодаря SECURITY DEFINER
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. Политика для обновления - пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Проверяем политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS operation_type,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE NULL
    END AS using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE NULL
    END AS with_check_clause
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Проверяем статус RLS
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS включён'
        ELSE '❌ RLS отключён'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- ВАЖНО О ТРИГГЕРЕ:
-- Функция handle_new_user использует SECURITY DEFINER,
-- что означает, что она выполняется с правами создателя функции (обычно postgres).
-- При выполнении триггера RLS НЕ ПРИМЕНЯЕТСЯ, поэтому триггер может создавать записи
-- даже если политика "Users can insert own profile" не позволяет это делать напрямую.
--
-- Это правильное поведение:
-- 1. Пользователь регистрируется через Supabase Auth → запись создаётся в auth.users
-- 2. Триггер on_auth_user_created автоматически вызывает handle_new_user
-- 3. handle_new_user выполняется с правами postgres (SECURITY DEFINER) → обходит RLS
-- 4. Запись автоматически создаётся в public.users
--
-- Политики выше нужны для:
-- - Прямого доступа из клиентского кода (чтение, обновление своих данных)
-- - Резервного способа создания записи, если триггер не сработал

