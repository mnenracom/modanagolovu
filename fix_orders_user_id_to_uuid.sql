-- SQL скрипт для изменения типа user_id в таблице orders на UUID/TEXT
-- Это нужно для связи с auth.users (где id - UUID)
-- Выполните в Supabase SQL Editor

-- Проверяем текущий тип user_id
DO $$ 
DECLARE
  current_type TEXT;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'user_id';

  IF current_type = 'bigint' THEN
    -- Изменяем тип на TEXT для хранения UUID
    ALTER TABLE orders ALTER COLUMN user_id TYPE TEXT;
    RAISE NOTICE 'Тип user_id изменен с BIGINT на TEXT для поддержки UUID';
  ELSIF current_type IS NULL THEN
    -- Колонка не существует, создаем её
    ALTER TABLE orders ADD COLUMN user_id TEXT;
    RAISE NOTICE 'Колонка user_id добавлена с типом TEXT';
  ELSE
    RAISE NOTICE 'Тип user_id уже правильный: %', current_type;
  END IF;
END $$;

-- Обновляем индекс для user_id (если он существует)
DROP INDEX IF EXISTS idx_orders_user_id;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Комментарий к колонке
COMMENT ON COLUMN orders.user_id IS 'UUID пользователя из auth.users (TEXT для совместимости)';




