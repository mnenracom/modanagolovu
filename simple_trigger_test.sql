-- Простая проверка триггера регистрации
-- Выполните этот скрипт, чтобы быстро проверить, всё ли настроено правильно

-- 1. Проверяем последнего зарегистрированного пользователя
SELECT 
    'Последний зарегистрированный пользователь:' AS check_type,
    au.id,
    au.email,
    au.created_at::text AS registered_at,
    CASE 
        WHEN pu.id IS NOT NULL THEN '✓ ЕСТЬ в public.users'
        ELSE '✗ ОТСУТСТВУЕТ в public.users'
    END AS sync_status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 1;

-- 2. Проверяем, существует ли триггер
SELECT 
    'Проверка триггера:' AS check_type,
    trigger_name,
    CASE 
        WHEN trigger_name = 'on_auth_user_created' THEN '✓ Триггер существует'
        ELSE '✗ Триггер не найден'
    END AS status
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- 3. Проверяем функцию
SELECT 
    'Проверка функции:' AS check_type,
    p.proname AS function_name,
    CASE 
        WHEN p.prosecdef THEN '✓ SECURITY DEFINER установлен'
        ELSE '✗ SECURITY DEFINER НЕ установлен'
    END AS security_definer_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- 4. Итоговый статус
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE trigger_name = 'on_auth_user_created'
            AND event_object_table = 'users'
        ) 
        AND EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'handle_new_user'
        )
        THEN '✅ Триггер настроен правильно!'
        ELSE '❌ Триггер не настроен - выполните fix_trigger_with_error_handling.sql'
    END AS final_status;

