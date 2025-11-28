-- Добавление поля mobile_image_url в таблицу banners
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Добавляем колонку mobile_image_url, если её еще нет
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;

-- Комментарий к колонке
COMMENT ON COLUMN banners.mobile_image_url IS 'URL изображения баннера для мобильных устройств (опционально)';




