-- SQL скрипт для создания таблицы служб доставки
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица служб доставки
CREATE TABLE IF NOT EXISTS delivery_services (
  id BIGSERIAL PRIMARY KEY,
  
  -- Название службы
  name VARCHAR(255) NOT NULL, -- "СДЭК", "Почта России", "Яндекс Доставка" и т.д.
  code VARCHAR(100) NOT NULL UNIQUE, -- "cdek", "russian_post", "yandex_delivery"
  
  -- Активность
  is_active BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true, -- Можно временно отключить
  
  -- API настройки (хранятся в зашифрованном виде или через переменные окружения)
  api_key VARCHAR(500), -- API ключ для службы
  api_secret VARCHAR(500), -- Секретный ключ (если нужен)
  account_id VARCHAR(255), -- ID аккаунта
  sender_city_id VARCHAR(100), -- ID города отправителя
  sender_address VARCHAR(500), -- Адрес отправителя
  
  -- Настройки интеграции
  api_url VARCHAR(500), -- URL API службы
  webhook_url VARCHAR(500), -- URL для webhook уведомлений
  
  -- Типы доставки, которые поддерживает служба
  delivery_types JSONB DEFAULT '[]', -- ["standard", "express", "pickup"]
  
  -- Настройки расчета стоимости
  calculate_cost BOOLEAN DEFAULT true, -- Рассчитывать стоимость автоматически
  default_cost DECIMAL(10, 2), -- Стоимость по умолчанию, если не удалось рассчитать
  free_delivery_threshold DECIMAL(10, 2), -- Бесплатная доставка от суммы
  
  -- Настройки отслеживания
  tracking_enabled BOOLEAN DEFAULT true, -- Включено ли отслеживание
  tracking_api_endpoint VARCHAR(500), -- Endpoint для получения статуса
  tracking_update_interval INTEGER DEFAULT 3600, -- Интервал обновления в секундах
  
  -- Маппинг статусов (статусы службы → наши статусы)
  status_mapping JSONB DEFAULT '{}', -- {"delivered": "delivered", "in_transit": "shipped"}
  
  -- Дополнительные настройки
  settings JSONB DEFAULT '{}', -- Дополнительные настройки службы
  
  -- Метаданные
  description TEXT,
  icon_url VARCHAR(500), -- URL иконки службы
  website_url VARCHAR(500), -- Сайт службы
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_delivery_services_code ON delivery_services(code);
CREATE INDEX IF NOT EXISTS idx_delivery_services_active ON delivery_services(is_active, is_enabled);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_delivery_services_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_delivery_services_updated_at ON delivery_services;
CREATE TRIGGER update_delivery_services_updated_at
  BEFORE UPDATE ON delivery_services
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_services_updated_at_column();

-- RLS политики
ALTER TABLE delivery_services ENABLE ROW LEVEL SECURITY;

-- Администраторы могут управлять службами доставки
DROP POLICY IF EXISTS "Admins can manage delivery services" ON delivery_services;
CREATE POLICY "Admins can manage delivery services" ON delivery_services
  FOR ALL
  USING (true); -- Можно ограничить по роли

-- Все могут читать активные службы доставки
DROP POLICY IF EXISTS "Anyone can view active delivery services" ON delivery_services;
CREATE POLICY "Anyone can view active delivery services" ON delivery_services
  FOR SELECT
  USING (is_active = true AND is_enabled = true);




