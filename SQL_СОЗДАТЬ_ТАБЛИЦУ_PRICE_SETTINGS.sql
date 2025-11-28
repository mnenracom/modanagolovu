-- Создание отдельной таблицы для настроек API цен
-- Выполните в Supabase SQL Editor

-- Создаем таблицу для настроек API цен
CREATE TABLE IF NOT EXISTS price_settings (
  id BIGSERIAL PRIMARY KEY,
  marketplace_type VARCHAR(20) NOT NULL CHECK (marketplace_type IN ('wildberries', 'ozon')),
  account_name VARCHAR(255) NOT NULL,
  prices_api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один токен для цен на аккаунт
  UNIQUE(marketplace_type, account_name)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_price_settings_marketplace_type ON price_settings(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_price_settings_account_name ON price_settings(account_name);
CREATE INDEX IF NOT EXISTS idx_price_settings_active ON price_settings(is_active) WHERE is_active = true;

-- Комментарии к таблице и колонкам
COMMENT ON TABLE price_settings IS 'Настройки токенов для управления ценами на маркетплейсах';
COMMENT ON COLUMN price_settings.marketplace_type IS 'Тип маркетплейса: wildberries или ozon';
COMMENT ON COLUMN price_settings.account_name IS 'Название аккаунта (должно совпадать с account_name в marketplace_settings)';
COMMENT ON COLUMN price_settings.prices_api_key IS 'API ключ с правами на управление ценами (например, токен с правами "ЦЕНЫ ОТЗЫВЫ" для WB)';
COMMENT ON COLUMN price_settings.is_active IS 'Активна ли настройка';

-- Включаем RLS (Row Level Security)
ALTER TABLE price_settings ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, если они существуют
DROP POLICY IF EXISTS "Users can view price settings" ON price_settings;
DROP POLICY IF EXISTS "Users can insert price settings" ON price_settings;
DROP POLICY IF EXISTS "Users can update price settings" ON price_settings;
DROP POLICY IF EXISTS "Users can delete price settings" ON price_settings;

-- Политика: все авторизованные пользователи могут читать и изменять настройки цен
CREATE POLICY "Users can view price settings" ON price_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert price settings" ON price_settings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update price settings" ON price_settings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete price settings" ON price_settings
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_price_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем триггер, если он уже существует
DROP TRIGGER IF EXISTS price_settings_updated_at ON price_settings;

CREATE TRIGGER price_settings_updated_at
  BEFORE UPDATE ON price_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_price_settings_updated_at();

-- Показываем статистику
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'price_settings'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Таблица price_settings успешно создана';
  ELSE
    RAISE NOTICE 'Ошибка создания таблицы price_settings';
  END IF;
END $$;



