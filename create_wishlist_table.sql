-- SQL скрипт для создания таблицы избранного (Wishlist)
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица избранных товаров
CREATE TABLE IF NOT EXISTS wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Индексы для wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_product ON wishlist(user_id, product_id);

-- RLS политики
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои избранные товары
DROP POLICY IF EXISTS "Users can view their own wishlist" ON wishlist;
CREATE POLICY "Users can view their own wishlist" ON wishlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут добавлять товары в избранное
DROP POLICY IF EXISTS "Users can insert their own wishlist items" ON wishlist;
CREATE POLICY "Users can insert their own wishlist items" ON wishlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять свои избранные товары
DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON wishlist;
CREATE POLICY "Users can delete their own wishlist items" ON wishlist
  FOR DELETE
  USING (auth.uid() = user_id);

-- Функция для получения количества товаров в избранном пользователя
CREATE OR REPLACE FUNCTION get_wishlist_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM wishlist WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




