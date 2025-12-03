-- Проверка работы триггера и последних операций

-- 1. Проверяем последних зарегистрированных пользователей
SELECT 
    au.id,
    au.email,
    au.created_at AS auth_created_at,
    au.email_confirmed_at,
    pu.id AS public_users_id,
    pu.email AS public_users_email,
    pu.created_at AS public_users_created_at,
    CASE 
        WHEN pu.id IS NOT NULL THEN 'ЕСТЬ в public.users ✓'
        ELSE 'ОТСУТСТВУЕТ в public.users ❌'
    END AS status
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC
LIMIT 10;

-- 2. Проверяем, сколько пользователей не синхронизированы
SELECT 
    COUNT(*) AS missing_count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 3. Проверяем, существует ли функция и её параметры
SELECT 
    p.proname AS function_name,
    p.prosecdef AS is_security_definer,
    p.proowner::regrole AS owner,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- 4. Проверяем триггеры на auth.users
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 5. Проверяем RLS на таблице users
SELECT 
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS включён'
        ELSE 'RLS отключён'
    END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'users';

-- 6. Проверяем политики RLS
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




