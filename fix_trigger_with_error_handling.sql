-- Исправление триггера с улучшенной обработкой ошибок
-- Этот скрипт добавляет логирование ошибок и улучшает функцию триггера

-- Создаём функцию с обработкой ошибок и логированием
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    
    -- Логируем успешное создание
    RAISE NOTICE 'Пользователь создан в public.users: % (%)', NEW.email, NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Логируем ошибку, но не прерываем регистрацию
    RAISE WARNING 'Ошибка при создании пользователя в public.users: %. Email: %, ID: %', 
      SQLERRM, NEW.email, NEW.id;
    
    -- Не выбрасываем исключение, чтобы не блокировать регистрацию в auth.users
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем, что функция создана правильно
DO $$
DECLARE
    func_exists BOOLEAN;
    func_owner TEXT;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
    ) INTO func_exists;
    
    IF func_exists THEN
        SELECT pg_get_userbyid(proowner) INTO func_owner
        FROM pg_proc
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace;
        
        RAISE NOTICE 'Функция handle_new_user существует ✓';
        RAISE NOTICE 'Владелец функции: %', func_owner;
        RAISE NOTICE 'SECURITY DEFINER: %', (
            SELECT prosecdef FROM pg_proc 
            WHERE proname = 'handle_new_user' 
            AND pronamespace = 'public'::regnamespace
        );
    ELSE
        RAISE EXCEPTION 'Функция handle_new_user не существует!';
    END IF;
END $$;

-- Пересоздаём триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  RAISE NOTICE 'Триггер on_auth_user_created пересоздан ✓';
END $$;

-- Проверяем, что триггер создан
DO $$
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'auth'
        AND event_object_table = 'users'
        AND trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        RAISE NOTICE 'Триггер on_auth_user_created существует ✓';
    ELSE
        RAISE WARNING 'Триггер on_auth_user_created не найден!';
    END IF;
END $$;

