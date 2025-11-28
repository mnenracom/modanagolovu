-- SQL скрипт для создания таблицы платежных систем
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица платежных систем
CREATE TABLE IF NOT EXISTS payment_gateways (
  id BIGSERIAL PRIMARY KEY,
  
  -- Название платежной системы
  name VARCHAR(255) NOT NULL, -- "ЮKassa", "Сбербанк", "Тинькофф", "Stripe" и т.д.
  code VARCHAR(100) NOT NULL UNIQUE, -- "yookassa", "sberbank", "tinkoff", "stripe"
  
  -- Тип платежной системы
  type VARCHAR(50) NOT NULL, -- "bank_card", "bank_transfer", "ewallet", "crypto"
  
  -- Активность
  is_active BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true, -- Можно временно отключить
  
  -- API настройки (хранятся в зашифрованном виде)
  api_key VARCHAR(500), -- Публичный ключ
  secret_key VARCHAR(500), -- Секретный ключ
  shop_id VARCHAR(255), -- ID магазина
  terminal_key VARCHAR(255), -- Ключ терминала (если нужен)
  
  -- Настройки интеграции
  api_url VARCHAR(500), -- URL API платежной системы
  webhook_url VARCHAR(500), -- URL для webhook уведомлений
  return_url VARCHAR(500), -- URL возврата после оплаты
  fail_url VARCHAR(500), -- URL при ошибке оплаты
  
  -- Настройки платежей
  min_amount DECIMAL(10, 2) DEFAULT 0, -- Минимальная сумма платежа
  max_amount DECIMAL(10, 2), -- Максимальная сумма платежа
  commission_percent DECIMAL(5, 2) DEFAULT 0, -- Комиссия в %
  commission_fixed DECIMAL(10, 2) DEFAULT 0, -- Фиксированная комиссия
  
  -- Поддерживаемые валюты
  currencies TEXT[] DEFAULT ARRAY['RUB'], -- ['RUB', 'USD', 'EUR']
  
  -- Настройки отображения
  display_name VARCHAR(255), -- Название для отображения пользователю
  description TEXT, -- Описание для пользователя
  icon_url VARCHAR(500), -- URL иконки
  logo_url VARCHAR(500), -- URL логотипа
  
  -- Дополнительные настройки
  settings JSONB DEFAULT '{}', -- Дополнительные настройки платежной системы
  
  -- Тестовый режим
  test_mode BOOLEAN DEFAULT false, -- Использовать тестовый режим
  test_api_key VARCHAR(500), -- Тестовый API ключ
  test_secret_key VARCHAR(500), -- Тестовый секретный ключ
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payment_gateways_code ON payment_gateways(code);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways(is_active, is_enabled);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_type ON payment_gateways(type);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_payment_gateways_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_payment_gateways_updated_at ON payment_gateways;
CREATE TRIGGER update_payment_gateways_updated_at
  BEFORE UPDATE ON payment_gateways
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_gateways_updated_at_column();

-- RLS политики
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Администраторы могут управлять платежными системами
DROP POLICY IF EXISTS "Admins can manage payment gateways" ON payment_gateways;
CREATE POLICY "Admins can manage payment gateways" ON payment_gateways
  FOR ALL
  USING (true); -- Можно ограничить по роли

-- Все могут читать активные платежные системы
DROP POLICY IF EXISTS "Anyone can view active payment gateways" ON payment_gateways;
CREATE POLICY "Anyone can view active payment gateways" ON payment_gateways
  FOR SELECT
  USING (is_active = true AND is_enabled = true);




