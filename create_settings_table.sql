-- SQL скрипт для создания таблицы settings в Supabase
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Создание таблицы settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по ключу
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at_column();

-- Вставка начальных значений
INSERT INTO settings (key, value, description) VALUES
  ('min_retail_order', '1500', 'Минимальная сумма розничного заказа (в рублях)'),
  ('min_wholesale_order', '5000', 'Минимальная сумма оптового заказа (в рублях)')
ON CONFLICT (key) DO NOTHING;

-- RLS политики (если RLS включен)
-- Удаляем существующие политики, если они есть
DROP POLICY IF EXISTS "Public can read settings" ON settings;
DROP POLICY IF EXISTS "Admins and managers can update settings" ON settings;
DROP POLICY IF EXISTS "Admins and managers can insert settings" ON settings;

-- Публичный доступ на чтение
CREATE POLICY "Public can read settings" ON settings
  FOR SELECT
  USING (true);

-- Только админы и менеджеры могут изменять
CREATE POLICY "Admins and managers can update settings" ON settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN users usr ON u.id = usr.id
      WHERE u.id = auth.uid()
      AND usr.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can insert settings" ON settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      JOIN users usr ON u.id = usr.id
      WHERE u.id = auth.uid()
      AND usr.role IN ('admin', 'manager')
    )
  );

