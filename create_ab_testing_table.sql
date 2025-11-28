-- Создание таблицы для A/B тестирования порогов оптовых цен
CREATE TABLE IF NOT EXISTS ab_testing_thresholds (
  id BIGSERIAL PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  control_threshold INTEGER NOT NULL, -- Контрольный порог (текущий)
  variant_threshold INTEGER NOT NULL, -- Вариант для тестирования
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  traffic_split DECIMAL(5, 2) DEFAULT 50.00, -- Процент трафика на вариант (0-100)
  conversion_rate_control DECIMAL(5, 2) DEFAULT 0, -- Конверсия в опт для контроля
  conversion_rate_variant DECIMAL(5, 2) DEFAULT 0, -- Конверсия в опт для варианта
  total_visitors_control INTEGER DEFAULT 0,
  total_visitors_variant INTEGER DEFAULT 0,
  total_conversions_control INTEGER DEFAULT 0,
  total_conversions_variant INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ab_testing_product_id ON ab_testing_thresholds(product_id);
CREATE INDEX IF NOT EXISTS idx_ab_testing_status ON ab_testing_thresholds(status);
CREATE INDEX IF NOT EXISTS idx_ab_testing_dates ON ab_testing_thresholds(start_date, end_date);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ab_testing_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_ab_testing_updated_at ON ab_testing_thresholds;
CREATE TRIGGER update_ab_testing_updated_at
  BEFORE UPDATE ON ab_testing_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_testing_updated_at_column();

-- RLS политики (если используется RLS)
DO $$ 
BEGIN
  -- Удаляем существующие политики, если они есть
  DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON ab_testing_thresholds;
  
  -- Создаём политики для чтения и записи (адаптируйте под вашу систему авторизации)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_testing_thresholds') THEN
    -- Политики уже существуют, пропускаем
    NULL;
  ELSE
    -- Если RLS включен, создаём политики
    IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'ab_testing_thresholds') THEN
      CREATE POLICY "Allow all operations for authenticated users" ON ab_testing_thresholds
        FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END $$;


