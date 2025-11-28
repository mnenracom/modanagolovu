-- SQL скрипт для обновления таблицы orders для отслеживания
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавляем поля для отслеживания доставки
DO $$ 
BEGIN
  -- Служба доставки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivery_service_id') THEN
    ALTER TABLE orders ADD COLUMN delivery_service_id BIGINT REFERENCES delivery_services(id);
  END IF;

  -- Номер отслеживания
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
    ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(255);
  END IF;

  -- Статус доставки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivery_status') THEN
    ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(100) DEFAULT 'pending';
  END IF;

  -- История доставки (JSON массив статусов)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivery_history') THEN
    ALTER TABLE orders ADD COLUMN delivery_history JSONB DEFAULT '[]';
  END IF;

  -- Дата последнего обновления статуса доставки
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivery_status_updated_at') THEN
    ALTER TABLE orders ADD COLUMN delivery_status_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Адрес доставки (детализированный)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'delivery_address_full') THEN
    ALTER TABLE orders ADD COLUMN delivery_address_full JSONB;
  END IF;

  -- Платежная система
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_gateway_id') THEN
    ALTER TABLE orders ADD COLUMN payment_gateway_id BIGINT REFERENCES payment_gateways(id);
  END IF;

  -- ID платежа в платежной системе
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_external_id') THEN
    ALTER TABLE orders ADD COLUMN payment_external_id VARCHAR(255);
  END IF;

  -- URL для оплаты (если нужен)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'orders' AND column_name = 'payment_url') THEN
    ALTER TABLE orders ADD COLUMN payment_url VARCHAR(500);
  END IF;
END $$;

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_service ON orders(delivery_service_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_gateway ON orders(payment_gateway_id);

-- Комментарии к полям
COMMENT ON COLUMN orders.delivery_service_id IS 'ID службы доставки из таблицы delivery_services';
COMMENT ON COLUMN orders.tracking_number IS 'Номер отслеживания посылки';
COMMENT ON COLUMN orders.delivery_status IS 'Текущий статус доставки (pending, in_transit, delivered, etc.)';
COMMENT ON COLUMN orders.delivery_history IS 'История изменения статусов доставки в формате JSON';
COMMENT ON COLUMN orders.payment_gateway_id IS 'ID платежной системы из таблицы payment_gateways';
COMMENT ON COLUMN orders.payment_external_id IS 'ID платежа в платежной системе';




