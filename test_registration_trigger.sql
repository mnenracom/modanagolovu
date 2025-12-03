-- Тест триггера регистрации пользователей
-- Выполните этот скрипт, чтобы проверить, почему триггер не работает

-- 1. Проверяем, существует ли функция
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    n.nspname AS schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- 2. Проверяем, существует ли триггер
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name LIKE '%user%'
ORDER BY trigger_name;

-- 3. Проверяем последних пользователей в auth.users
SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Проверяем, есть ли соответствующие записи в public.users
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.created_at
FROM public.users u
ORDER BY created_at DESC
LIMIT 5;

-- 5. Проверяем, какие пользователи есть в auth.users, но нет в public.users
SELECT 
    au.id,
    au.email,
    au.created_at,
    CASE WHEN pu.id IS NULL THEN 'ОТСУТСТВУЕТ в public.users' ELSE 'ЕСТЬ в public.users' END AS status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 6. Проверяем логи ошибок (если доступны)
-- Примечание: В Supabase нужно проверить Database → Logs → Postgres Logs

-- 7. Тестируем функцию вручную (с подставленным UUID)
-- Замените UUID на реальный ID пользователя из auth.users
/*
DO $$
DECLARE
    test_user_id UUID := '9ca03796-5bde-4f70-bc9a-102e8703da50'; -- Замените на реальный UUID
    test_user_record auth.users%ROWTYPE;
BEGIN
    -- Получаем запись пользователя
    SELECT * INTO test_user_record
    FROM auth.users
    WHERE id = test_user_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Пользователь с ID % не найден в auth.users', test_user_id;
    ELSE
        RAISE NOTICE 'Найден пользователь: % (%)', test_user_record.email, test_user_record.id;
        
        -- Вызываем функцию триггера вручную
        BEGIN
            PERFORM public.handle_new_user() FROM auth.users WHERE id = test_user_id;
            RAISE NOTICE 'Функция выполнена успешно';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Ошибка при выполнении функции: %', SQLERRM;
        END;
    END IF;
END $$;
*/

-- 8. Проверяем права доступа функции
SELECT 
    p.proname AS function_name,
    p.prosecdef AS security_definer,
    pg_get_userbyid(p.proowner) AS owner,
    n.nspname AS schema
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user'
  AND n.nspname = 'public';




