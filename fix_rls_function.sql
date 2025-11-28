-- SQL скрипт для исправления функции check_user_role
-- Ошибка "operator does not exist: text ->> unknown" возникает из-за неправильного синтаксиса
-- 
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Исправляем функцию check_user_role
CREATE OR REPLACE FUNCTION check_user_role(allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  jwt_claims json;
  user_role text;
BEGIN
  -- Получаем JWT claims
  jwt_claims := current_setting('request.jwt.claims', true)::json;
  
  -- Проверяем, что claims не пустые
  IF jwt_claims IS NULL THEN
    RETURN false;
  END IF;
  
  -- Извлекаем роль из user_metadata (правильный синтаксис: -> для JSON, ->> для TEXT)
  IF jwt_claims->'user_metadata' IS NOT NULL THEN
    user_role := jwt_claims->'user_metadata'->>'role';
    IF user_role = ANY(allowed_roles) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Извлекаем роль из app_metadata (правильный синтаксис)
  IF jwt_claims->'app_metadata' IS NOT NULL THEN
    user_role := jwt_claims->'app_metadata'->>'role';
    IF user_role = ANY(allowed_roles) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Проверяем, что функция работает
SELECT check_user_role(ARRAY['admin', 'manager', 'content']) as test_result;




