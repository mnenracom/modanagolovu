-- SQL скрипт для создания таблицы уведомлений о поступлении товара
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица подписок на уведомления о поступлении товара
CREATE TABLE IF NOT EXISTS product_notifications (
  id BIGSERIAL PRIMARY KEY,
  
  -- Пользователь (может быть NULL для неавторизованных)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Товар
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Контакты для уведомления
  email VARCHAR(255) NOT NULL,
  telegram_chat_id BIGINT, -- Если пользователь хочет получать в Telegram
  
  -- Статус подписки
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMP WITH TIME ZONE, -- Когда было отправлено последнее уведомление
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Один пользователь может подписаться на один товар только один раз
  UNIQUE(user_id, product_id),
  -- Или по email, если пользователь не авторизован
  UNIQUE(email, product_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_product_notifications_product_id ON product_notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_product_notifications_user_id ON product_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_product_notifications_email ON product_notifications(email);
CREATE INDEX IF NOT EXISTS idx_product_notifications_active ON product_notifications(is_active);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_product_notifications_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_product_notifications_updated_at ON product_notifications;
CREATE TRIGGER update_product_notifications_updated_at
  BEFORE UPDATE ON product_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_product_notifications_updated_at_column();

-- Триггер для отправки уведомлений при изменении статуса товара
CREATE OR REPLACE FUNCTION notify_product_in_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Если товар стал в наличии (in_stock изменился с false на true)
  IF NEW.in_stock = true AND (OLD.in_stock IS NULL OR OLD.in_stock = false) THEN
    -- Помечаем все активные подписки для отправки уведомлений
    -- Сама отправка будет обрабатываться в приложении
    UPDATE product_notifications
    SET notified_at = NULL
    WHERE product_id = NEW.id 
      AND is_active = true 
      AND (notified_at IS NULL OR notified_at < NEW.updated_at);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для отслеживания изменений статуса товара
DROP TRIGGER IF EXISTS trigger_notify_product_in_stock ON products;
CREATE TRIGGER trigger_notify_product_in_stock
  AFTER UPDATE OF in_stock ON products
  FOR EACH ROW
  WHEN (NEW.in_stock IS DISTINCT FROM OLD.in_stock)
  EXECUTE FUNCTION notify_product_in_stock();

-- RLS политики
ALTER TABLE product_notifications ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои подписки
DROP POLICY IF EXISTS "Users can view their own notifications" ON product_notifications;
CREATE POLICY "Users can view their own notifications" ON product_notifications
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Пользователи могут создавать подписки
DROP POLICY IF EXISTS "Users can create notifications" ON product_notifications;
CREATE POLICY "Users can create notifications" ON product_notifications
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR (user_id IS NULL AND email IS NOT NULL)
  );

-- Пользователи могут обновлять свои подписки
DROP POLICY IF EXISTS "Users can update their own notifications" ON product_notifications;
CREATE POLICY "Users can update their own notifications" ON product_notifications
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Пользователи могут удалять свои подписки
DROP POLICY IF EXISTS "Users can delete their own notifications" ON product_notifications;
CREATE POLICY "Users can delete their own notifications" ON product_notifications
  FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);




