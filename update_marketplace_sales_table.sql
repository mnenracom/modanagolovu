-- Обновление таблицы marketplace_sales для добавления полей расходов и прибыли
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем новые колонки для детального учета расходов
DO $$ 
BEGIN
  -- Логистика
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'logistics') THEN
    ALTER TABLE marketplace_sales ADD COLUMN logistics DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Хранение
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'storage') THEN
    ALTER TABLE marketplace_sales ADD COLUMN storage DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Штрафы
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'penalties') THEN
    ALTER TABLE marketplace_sales ADD COLUMN penalties DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Возвраты
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'returns') THEN
    ALTER TABLE marketplace_sales ADD COLUMN returns DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Все расходы
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'total_expenses') THEN
    ALTER TABLE marketplace_sales ADD COLUMN total_expenses DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Реальная прибыль
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'marketplace_sales' AND column_name = 'profit') THEN
    ALTER TABLE marketplace_sales ADD COLUMN profit DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Обновляем существующие записи: считаем profit и total_expenses
UPDATE marketplace_sales
SET 
  total_expenses = COALESCE(commission, 0) + COALESCE(logistics, 0) + COALESCE(storage, 0) + COALESCE(penalties, 0) + COALESCE(returns, 0),
  profit = COALESCE(revenue, 0) - (COALESCE(commission, 0) + COALESCE(logistics, 0) + COALESCE(storage, 0) + COALESCE(penalties, 0) + COALESCE(returns, 0))
WHERE total_expenses = 0 OR profit = 0;

-- Обновляем net_revenue для обратной совместимости
UPDATE marketplace_sales
SET net_revenue = COALESCE(profit, net_revenue, revenue - commission)
WHERE net_revenue IS NULL OR net_revenue = 0;


