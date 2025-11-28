-- SQL скрипт для создания таблицы banners
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Создание таблицы banners
CREATE TABLE IF NOT EXISTS banners (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255),
  subtitle TEXT,
  button_text VARCHAR(100),
  button_link VARCHAR(500),
  image_url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Отключение RLS для админ-панели
ALTER TABLE banners DISABLE ROW LEVEL SECURITY;

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_order_index ON banners(order_index);
CREATE INDEX IF NOT EXISTS idx_banners_created_at ON banners(created_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_banners_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_banners_updated_at ON banners;
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_banners_updated_at_column();

-- Комментарии к таблице и полям
COMMENT ON TABLE banners IS 'Таблица для хранения баннеров главной страницы';
COMMENT ON COLUMN banners.title IS 'Заголовок баннера';
COMMENT ON COLUMN banners.subtitle IS 'Подзаголовок/описание баннера';
COMMENT ON COLUMN banners.button_text IS 'Текст кнопки (например: "Смотреть каталог")';
COMMENT ON COLUMN banners.button_link IS 'Ссылка кнопки (например: "/catalog")';
COMMENT ON COLUMN banners.image_url IS 'URL изображения баннера';
COMMENT ON COLUMN banners.order_index IS 'Порядок отображения баннеров (меньше = выше)';
COMMENT ON COLUMN banners.is_active IS 'Активен ли баннер для отображения';








