-- SQL скрипт для создания таблицы ценовых правил
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица ценовых правил для маркетплейсов
CREATE TABLE IF NOT EXISTS price_rules (
  id BIGSERIAL PRIMARY KEY,
  
  -- Идентификация товара
  sku VARCHAR(255) NOT NULL, -- Артикул товара
  barcode VARCHAR(255), -- Штрихкод
  marketplace_type VARCHAR(50) NOT NULL, -- 'wildberries' или 'ozon'
  account_name VARCHAR(255) NOT NULL, -- Название аккаунта
  
  -- Ценовые ограничения
  min_price DECIMAL(10, 2) NOT NULL, -- Минимальная цена
  max_price DECIMAL(10, 2) NOT NULL, -- Максимальная цена
  cost_price DECIMAL(10, 2) NOT NULL, -- Себестоимость
  target_margin_percent DECIMAL(5, 2) DEFAULT 20.00, -- Целевая маржа в процентах
  
  -- Текущее состояние
  current_price DECIMAL(10, 2), -- Текущая цена на маркетплейсе
  competitor_min_price DECIMAL(10, 2), -- Минимальная цена конкурентов
  competitor_avg_price DECIMAL(10, 2), -- Средняя цена конкурентов
  competitor_max_price DECIMAL(10, 2), -- Максимальная цена конкурентов
  
  -- Статус маржинальности
  margin_status VARCHAR(50) DEFAULT 'ok', -- 'ok', 'low_margin', 'below_min', 'above_max', 'no_competitors'
  calculated_margin DECIMAL(5, 2), -- Рассчитанная маржа в процентах
  calculated_profit DECIMAL(10, 2), -- Рассчитанная прибыль
  
  -- Рекомендации
  recommended_price DECIMAL(10, 2), -- Рекомендуемая цена
  price_change_needed BOOLEAN DEFAULT false, -- Требуется ли изменение цены
  
  -- Метаданные
  product_name VARCHAR(500), -- Название товара
  category VARCHAR(255), -- Категория
  notes TEXT, -- Заметки
  
  -- Связь с товаром на маркетплейсе
  marketplace_product_id VARCHAR(255), -- ID товара на маркетплейсе
  
  -- Временные метки
  last_checked_at TIMESTAMP WITH TIME ZONE, -- Когда последний раз проверяли
  last_updated_at TIMESTAMP WITH TIME ZONE, -- Когда последний раз обновляли цену
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(marketplace_type, account_name, sku)
);

-- Индексы для price_rules
CREATE INDEX IF NOT EXISTS idx_price_rules_marketplace ON price_rules(marketplace_type, account_name);
CREATE INDEX IF NOT EXISTS idx_price_rules_sku ON price_rules(sku);
CREATE INDEX IF NOT EXISTS idx_price_rules_status ON price_rules(margin_status);
CREATE INDEX IF NOT EXISTS idx_price_rules_change_needed ON price_rules(price_change_needed);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_price_rules_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_price_rules_updated_at ON price_rules;
CREATE TRIGGER update_price_rules_updated_at
  BEFORE UPDATE ON price_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_price_rules_updated_at_column();

-- RLS политики
DROP POLICY IF EXISTS "Admins can read price rules" ON price_rules;
DROP POLICY IF EXISTS "Admins can manage price rules" ON price_rules;

CREATE POLICY "Admins can read price rules" ON price_rules
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage price rules" ON price_rules
  FOR ALL
  USING (true);




