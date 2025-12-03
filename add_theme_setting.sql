-- SQL скрипт для добавления настройки активной темы оформления
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавляем настройку активной темы (если её еще нет)
INSERT INTO settings (key, value, description) 
VALUES ('active_theme', 'none', 'Активная тема оформления сайта (none, newyear, spring)')
ON CONFLICT (key) DO UPDATE 
SET 
  description = EXCLUDED.description,
  updated_at = NOW();

-- Проверяем результат
SELECT key, value, description, updated_at 
FROM settings 
WHERE key = 'active_theme';


