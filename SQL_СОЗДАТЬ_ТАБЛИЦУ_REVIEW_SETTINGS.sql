-- Создание отдельной таблицы для настроек отзывов
-- Выполните в Supabase SQL Editor

-- Создаем таблицу для настроек отзывов
CREATE TABLE IF NOT EXISTS review_settings (
  id BIGSERIAL PRIMARY KEY,
  marketplace_type VARCHAR(20) NOT NULL CHECK (marketplace_type IN ('wildberries', 'ozon')),
  account_name VARCHAR(255) NOT NULL,
  reviews_api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один токен для отзывов на аккаунт
  UNIQUE(marketplace_type, account_name)
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_review_settings_marketplace_type ON review_settings(marketplace_type);
CREATE INDEX IF NOT EXISTS idx_review_settings_account_name ON review_settings(account_name);
CREATE INDEX IF NOT EXISTS idx_review_settings_active ON review_settings(is_active) WHERE is_active = true;

-- Комментарии к таблице и колонкам
COMMENT ON TABLE review_settings IS 'Настройки токенов для получения отзывов с маркетплейсов';
COMMENT ON COLUMN review_settings.marketplace_type IS 'Тип маркетплейса: wildberries или ozon';
COMMENT ON COLUMN review_settings.account_name IS 'Название аккаунта (должно совпадать с account_name в marketplace_settings)';
COMMENT ON COLUMN review_settings.reviews_api_key IS 'API ключ с правами на отзывы (например, токен с правами "ЦЕНЫ ОТЗЫВЫ" для WB)';
COMMENT ON COLUMN review_settings.is_active IS 'Активна ли настройка';

-- Включаем RLS (Row Level Security)
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, если они существуют
DROP POLICY IF EXISTS "Users can view review settings" ON review_settings;
DROP POLICY IF EXISTS "Users can insert review settings" ON review_settings;
DROP POLICY IF EXISTS "Users can update review settings" ON review_settings;
DROP POLICY IF EXISTS "Users can delete review settings" ON review_settings;

-- Политика: все авторизованные пользователи могут читать и изменять настройки отзывов
-- Используем auth.uid() IS NOT NULL для более надежной проверки авторизации
CREATE POLICY "Users can view review settings" ON review_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert review settings" ON review_settings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update review settings" ON review_settings
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete review settings" ON review_settings
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_review_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем триггер, если он уже существует
DROP TRIGGER IF EXISTS review_settings_updated_at ON review_settings;

CREATE TRIGGER review_settings_updated_at
  BEFORE UPDATE ON review_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_settings_updated_at();

-- Показываем статистику
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'review_settings'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE 'Таблица review_settings успешно создана';
  ELSE
    RAISE NOTICE 'Ошибка создания таблицы review_settings';
  END IF;
END $$;

