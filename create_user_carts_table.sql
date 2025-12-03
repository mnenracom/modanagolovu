-- SQL скрипт для создания таблицы корзины пользователей
-- Выполните в Supabase SQL Editor

-- Создание таблицы user_carts для сохранения корзины пользователей
CREATE TABLE IF NOT EXISTS user_carts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL, -- UUID пользователя из auth.users
  cart_items JSONB NOT NULL DEFAULT '[]', -- Массив товаров в корзине
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- У каждого пользователя только одна корзина
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_carts_updated_at ON user_carts(updated_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_user_carts_updated_at_trigger ON user_carts;
CREATE TRIGGER update_user_carts_updated_at_trigger
  BEFORE UPDATE ON user_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_carts_updated_at();

-- Отключаем RLS для упрощения (можно включить позже для безопасности)
ALTER TABLE user_carts DISABLE ROW LEVEL SECURITY;

-- Или создаем политику RLS, если нужно (раскомментируйте, если используете RLS):
-- ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
-- 
-- -- Политика: пользователь может видеть только свою корзину
-- CREATE POLICY "Users can view own cart"
--   ON user_carts FOR SELECT
--   USING (auth.uid()::text = user_id);
-- 
-- -- Политика: пользователь может обновлять только свою корзину
-- CREATE POLICY "Users can update own cart"
--   ON user_carts FOR UPDATE
--   USING (auth.uid()::text = user_id);
-- 
-- -- Политика: пользователь может создавать только свою корзину
-- CREATE POLICY "Users can insert own cart"
--   ON user_carts FOR INSERT
--   WITH CHECK (auth.uid()::text = user_id);




