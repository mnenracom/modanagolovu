-- Ручное исправление отсутствующих пользователей в public.users
-- Выполните этот скрипт, чтобы создать записи для пользователей, которые есть в auth.users, но отсутствуют в public.users

-- Создаём функцию для миграции существующих пользователей
CREATE OR REPLACE FUNCTION migrate_missing_users()
RETURNS TABLE(
    user_id UUID,
    user_email TEXT,
    status TEXT
) AS $$
DECLARE
    auth_user_record RECORD;
BEGIN
    -- Проходим по всем пользователям из auth.users
    FOR auth_user_record IN 
        SELECT 
            au.id,
            au.email AS user_email,
            au.raw_user_meta_data
        FROM auth.users au
        WHERE au.id NOT IN (SELECT pu.id FROM public.users pu)
    LOOP
        BEGIN
            -- Создаём запись в public.users
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
                auth_user_record.id,
                auth_user_record.user_email,
                COALESCE(
                    auth_user_record.raw_user_meta_data->>'full_name',
                    auth_user_record.raw_user_meta_data->>'fullName',
                    ''
                ),
                auth_user_record.raw_user_meta_data->>'phone',
                auth_user_record.raw_user_meta_data->>'address',
                auth_user_record.raw_user_meta_data->>'telegram',
                auth_user_record.raw_user_meta_data->>'whatsapp',
                COALESCE(auth_user_record.raw_user_meta_data->>'role', 'user'),
                'active',
                true
            )
            ON CONFLICT (id) DO NOTHING;
            
            -- Возвращаем информацию о созданном пользователе
            user_id := auth_user_record.id;
            user_email := auth_user_record.user_email;
            status := 'Создан';
            RETURN NEXT;
            
        EXCEPTION WHEN OTHERS THEN
            -- Если ошибка, возвращаем информацию об ошибке
            user_id := auth_user_record.id;
            user_email := auth_user_record.user_email;
            status := 'Ошибка: ' || SQLERRM;
            RETURN NEXT;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Выполняем миграцию
SELECT * FROM migrate_missing_users();

-- Удаляем временную функцию
DROP FUNCTION IF EXISTS migrate_missing_users();

-- Проверяем результат
SELECT 
    COUNT(*) FILTER (WHERE pu.id IS NOT NULL) AS users_in_public_table,
    COUNT(*) FILTER (WHERE pu.id IS NULL) AS missing_users
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

