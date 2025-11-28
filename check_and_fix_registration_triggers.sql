-- Скрипт для проверки и исправления триггеров регистрации пользователей

-- 1. Проверяем, существует ли таблица users
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE NOTICE 'Таблица users не существует. Создайте её сначала через create_users_table.sql';
  ELSE
    RAISE NOTICE 'Таблица users существует ✓';
  END IF;
END $$;

-- 2. Создаём или обновляем функцию handle_new_user
-- Функция создаётся вне блока DO, чтобы избежать конфликта разделителей $$
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    address,
    telegram,
    whatsapp,
    role,
    status,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'telegram',
    NEW.raw_user_meta_data->>'whatsapp',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    address = COALESCE(EXCLUDED.address, users.address),
    telegram = COALESCE(EXCLUDED.telegram, users.telegram),
    whatsapp = COALESCE(EXCLUDED.whatsapp, users.whatsapp),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем, что функция создана
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE 'Функция handle_new_user создана/обновлена ✓';
  ELSE
    RAISE NOTICE 'ОШИБКА: Функция handle_new_user не создана!';
  END IF;
END $$;

-- 3. Создаём или обновляем триггер on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  RAISE NOTICE 'Триггер on_auth_user_created создан/обновлён ✓';
END $$;

-- 4. Создаём или обновляем триггер для обновления пользователя
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  RAISE NOTICE 'Триггер on_auth_user_updated создан/обновлён ✓';
END $$;

-- 5. Проверяем RLS политики для таблицы users
DO $$
BEGIN
  -- Проверяем, включён ли RLS
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'RLS включён на таблице users';
    RAISE NOTICE 'Убедитесь, что есть политики для INSERT операций от имени триггера';
  ELSE
    RAISE NOTICE 'RLS отключён на таблице users ✓ (триггер должен работать)';
  END IF;
END $$;

-- 6. Выводим информацию о существующих триггерах
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 7. Выводим информацию о функции
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- Финальное сообщение
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Проверка завершена!';
  RAISE NOTICE 'Теперь при регистрации нового пользователя триггер должен автоматически создать запись в public.users';
  RAISE NOTICE '========================================';
END $$;

