-- Исправленные RLS политики для таблицы users
-- Этот скрипт позволяет триггеру создавать записи пользователей

-- Включить RLS для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики, если они существуют
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Service role can manage users" ON users;
DROP POLICY IF EXISTS "Пользователи видят свои данные" ON users;
DROP POLICY IF EXISTS "Пользователи обновляют свои данные" ON users;
DROP POLICY IF EXISTS "Админы видят всех пользователей" ON users;
DROP POLICY IF EXISTS "Админы обновляют пользователей" ON users;

-- ВАЖНО: Функция handle_new_user использует SECURITY DEFINER,
-- что означает, что она выполняется с правами создателя функции (обычно postgres),
-- и RLS НЕ ПРИМЕНЯЕТСЯ при выполнении триггера. Это правильное поведение.
-- Однако, если RLS всё же блокирует операции, нужно добавить политики ниже.

-- 1. Политика для чтения - пользователи могут видеть только свои данные
CREATE POLICY "Users can view own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Политика для вставки - пользователи могут создавать только свои записи
-- Примечание: Триггер обходит RLS благодаря SECURITY DEFINER,
-- но эта политика нужна для ручного создания записей пользователями
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. Политика для обновления - пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
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

