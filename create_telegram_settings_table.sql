-- SQL скрипт для создания таблицы настроек Telegram
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица настроек Telegram
CREATE TABLE IF NOT EXISTS telegram_settings (
  id BIGSERIAL PRIMARY KEY,
  
  -- Токен бота (получается от @BotFather)
  bot_token VARCHAR(255) NOT NULL UNIQUE,
  
  -- Название бота (для удобства)
  bot_name VARCHAR(255),
  
  -- Активность
  is_active BOOLEAN DEFAULT true,
  
  -- Типы уведомлений (какие события отслеживать)
  notify_low_price BOOLEAN DEFAULT true, -- Цены ниже минимальных
  notify_new_order BOOLEAN DEFAULT true, -- Новые заказы
  notify_new_review BOOLEAN DEFAULT true, -- Новые отзывы
  notify_new_question BOOLEAN DEFAULT true, -- Новые вопросы
  notify_marketplace_sync BOOLEAN DEFAULT false, -- Синхронизация маркетплейсов
  notify_errors BOOLEAN DEFAULT true, -- Ошибки системы
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица чатов (куда отправлять уведомления)
CREATE TABLE IF NOT EXISTS telegram_chats (
  id BIGSERIAL PRIMARY KEY,
  
  -- ID чата в Telegram
  chat_id BIGINT NOT NULL UNIQUE,
  
  -- Тип чата: 'private', 'group', 'supergroup', 'channel'
  chat_type VARCHAR(50) NOT NULL,
  
  -- Название чата (для удобства)
  chat_title VARCHAR(255),
  
  -- Имя пользователя (если личный чат)
  username VARCHAR(255),
  
  -- Активность
  is_active BOOLEAN DEFAULT true,
  
  -- Типы уведомлений для этого чата
  notify_low_price BOOLEAN DEFAULT true,
  notify_new_order BOOLEAN DEFAULT true,
  notify_new_review BOOLEAN DEFAULT true,
  notify_new_question BOOLEAN DEFAULT true,
  notify_marketplace_sync BOOLEAN DEFAULT false,
  notify_errors BOOLEAN DEFAULT true,
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_telegram_settings_active ON telegram_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_active ON telegram_chats(is_active);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_chat_id ON telegram_chats(chat_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_telegram_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_telegram_settings_updated_at ON telegram_settings;
CREATE TRIGGER update_telegram_settings_updated_at
  BEFORE UPDATE ON telegram_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_updated_at_column();

DROP TRIGGER IF EXISTS update_telegram_chats_updated_at ON telegram_chats;
CREATE TRIGGER update_telegram_chats_updated_at
  BEFORE UPDATE ON telegram_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_updated_at_column();

-- RLS политики
ALTER TABLE telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;

-- Администраторы могут управлять настройками Telegram
DROP POLICY IF EXISTS "Admins can manage telegram settings" ON telegram_settings;
CREATE POLICY "Admins can manage telegram settings" ON telegram_settings
  FOR ALL
  USING (true); -- Можно ограничить по роли

DROP POLICY IF EXISTS "Admins can manage telegram chats" ON telegram_chats;
CREATE POLICY "Admins can manage telegram chats" ON telegram_chats
  FOR ALL
  USING (true); -- Можно ограничить по роли




