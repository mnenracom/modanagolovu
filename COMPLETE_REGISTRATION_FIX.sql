-- ============================================================================
-- ПОЛНАЯ НАСТРОЙКА РЕГИСТРАЦИИ ПОЛЬЗОВАТЕЛЕЙ
-- Этот скрипт объединяет все необходимые настройки:
-- 1. RLS политики для таблицы users (для прямого доступа из клиента)
-- 2. Триггер для автоматического создания записей при регистрации
-- ============================================================================

-- ============================================================================
-- ШАГ 1: Настройка RLS политик для таблицы users
-- ============================================================================

-- Включаем RLS для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Удаляем все старые политики, чтобы избежать конфликтов
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Пользователи видят свои данные" ON users;
DROP POLICY IF EXISTS "Пользователи создают свои записи" ON users;
DROP POLICY IF EXISTS "Пользователи обновляют свои данные" ON users;

-- 1. Политика для чтения - пользователи могут видеть только свои данные
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- 2. Политика для вставки - пользователи могут создавать только свои записи
-- ВАЖНО: Триггер обходит RLS благодаря SECURITY DEFINER, 
-- но эта политика нужна для прямого доступа из клиента
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. Политика для обновления - пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- ШАГ 2: Создание/обновление функции триггера
-- ============================================================================

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

-- ============================================================================
-- ШАГ 3: Создание/обновление триггера
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ШАГ 4: Проверка настроек
-- ============================================================================

DO $$
DECLARE
    trigger_exists BOOLEAN;
    func_exists BOOLEAN;
    func_security_definer BOOLEAN;
BEGIN
    -- Проверяем триггер
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'auth'
        AND event_object_table = 'users'
        AND trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Проверяем функцию
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
    ) INTO func_exists;
    
    -- Проверяем SECURITY DEFINER
    SELECT prosecdef INTO func_security_definer
    FROM pg_proc
    WHERE proname = 'handle_new_user' 
    AND pronamespace = 'public'::regnamespace;
    
    -- Выводим результаты
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'РЕЗУЛЬТАТЫ НАСТРОЙКИ:';
    RAISE NOTICE '========================================';
    
    IF trigger_exists THEN
        RAISE NOTICE '✅ Триггер on_auth_user_created: СОЗДАН';
    ELSE
        RAISE NOTICE '❌ Триггер on_auth_user_created: НЕ НАЙДЕН';
    END IF;
    
    IF func_exists THEN
        RAISE NOTICE '✅ Функция handle_new_user: СУЩЕСТВУЕТ';
    ELSE
        RAISE NOTICE '❌ Функция handle_new_user: НЕ НАЙДЕНА';
    END IF;
    
    IF func_security_definer THEN
        RAISE NOTICE '✅ SECURITY DEFINER: ВКЛЮЧЁН';
    ELSE
        RAISE NOTICE '❌ SECURITY DEFINER: НЕ ВКЛЮЧЁН';
    END IF;
    
    RAISE NOTICE '========================================';
    
    IF trigger_exists AND func_exists AND func_security_definer THEN
        RAISE NOTICE '✅ ВСЁ НАСТРОЕНО ПРАВИЛЬНО!';
        RAISE NOTICE 'Теперь при регистрации нового пользователя триггер автоматически создаст запись в public.users';
    ELSE
        RAISE WARNING '⚠️ ЧТО-ТО НАСТРОЕНО НЕПРАВИЛЬНО!';
        RAISE NOTICE 'Проверьте сообщения выше и исправьте ошибки.';
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- Показываем все политики RLS
SELECT 
    policyname AS "Политика",
    cmd AS "Операция",
    CASE 
        WHEN qual IS NOT NULL THEN LEFT(qual, 50) || '...'
        ELSE NULL
    END AS "Условие USING"
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- ============================================================================
-- ВАЖНЫЕ ЗАМЕЧАНИЯ:
-- ============================================================================
-- 
-- 1. ТРИГГЕР ОБХОДИТ RLS:
--    Функция handle_new_user создана с SECURITY DEFINER, что означает,
--    что она выполняется с правами создателя функции (обычно postgres).
--    При выполнении триггера RLS НЕ ПРИМЕНЯЕТСЯ, поэтому триггер может
--    создавать записи даже если политика не позволяет это делать напрямую.
--
-- 2. ПОЛИТИКИ RLS НУЖНЫ ДЛЯ:
--    - Прямого доступа из клиентского кода (чтение, обновление)
--    - Резервного способа создания записи, если триггер не сработал
--
-- 3. ПРОВЕРКА РАБОТЫ:
--    После выполнения этого скрипта зарегистрируйте нового пользователя
--    и проверьте, что он появился в public.users автоматически.
--
-- ============================================================================



