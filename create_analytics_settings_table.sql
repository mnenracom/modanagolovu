-- SQL скрипт для создания таблицы настроек аналитики
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица настроек аналитики
CREATE TABLE IF NOT EXISTS analytics_settings (
  id BIGSERIAL PRIMARY KEY,
  
  -- Яндекс.Метрика
  yandex_metrika_enabled BOOLEAN DEFAULT false,
  yandex_metrika_counter_id VARCHAR(50), -- ID счетчика Яндекс.Метрики
  yandex_metrika_token VARCHAR(500), -- OAuth токен для API
  
  -- Google Analytics
  google_analytics_enabled BOOLEAN DEFAULT false,
  google_analytics_tracking_id VARCHAR(100), -- Tracking ID (например, G-XXXXXXXXXX или UA-XXXXXXXXX-X)
  google_analytics_measurement_id VARCHAR(100), -- Measurement ID для GA4
  google_analytics_api_key VARCHAR(500), -- API ключ для Google Analytics Reporting API
  google_analytics_view_id VARCHAR(100), -- View ID для Universal Analytics
  
  -- Дополнительные настройки
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_analytics_settings_enabled ON analytics_settings(yandex_metrika_enabled, google_analytics_enabled);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_analytics_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_analytics_settings_updated_at ON analytics_settings;
CREATE TRIGGER update_analytics_settings_updated_at
  BEFORE UPDATE ON analytics_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_settings_updated_at_column();

-- Создаем одну запись по умолчанию
INSERT INTO analytics_settings (id, yandex_metrika_enabled, google_analytics_enabled)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;

-- RLS политики
ALTER TABLE analytics_settings ENABLE ROW LEVEL SECURITY;

-- Администраторы могут управлять настройками аналитики
DROP POLICY IF EXISTS "Admins can manage analytics settings" ON analytics_settings;
CREATE POLICY "Admins can manage analytics settings" ON analytics_settings
  FOR ALL
  USING (true); -- Можно ограничить по роли

-- Таблица для хранения статистики просмотров страниц (опционально, для внутренней аналитики)
CREATE TABLE IF NOT EXISTS page_views (
  id BIGSERIAL PRIMARY KEY,
  
  -- Информация о странице
  page_path VARCHAR(500) NOT NULL, -- Путь страницы (например, /product/123)
  page_title VARCHAR(500), -- Заголовок страницы
  referrer VARCHAR(500), -- Откуда пришел пользователь
  
  -- Информация о пользователе
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- ID сессии
  
  -- Техническая информация
  user_agent TEXT,
  ip_address VARCHAR(45), -- IPv4 или IPv6
  device_type VARCHAR(50), -- desktop, mobile, tablet
  browser VARCHAR(100),
  os VARCHAR(100),
  
  -- География (если доступно)
  country VARCHAR(100),
  city VARCHAR(100),
  
  -- Метаданные
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для page_views
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);

-- RLS политики для page_views
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Администраторы могут видеть все просмотры
DROP POLICY IF EXISTS "Admins can view all page views" ON page_views;
CREATE POLICY "Admins can view all page views" ON page_views
  FOR SELECT
  USING (true); -- Можно ограничить по роли

-- Все могут создавать просмотры (для трекинга)
DROP POLICY IF EXISTS "Anyone can create page views" ON page_views;
CREATE POLICY "Anyone can create page views" ON page_views
  FOR INSERT
  WITH CHECK (true);

-- Функция для получения статистики просмотров страниц
CREATE OR REPLACE FUNCTION get_page_views_stats(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  page_path VARCHAR(500),
  page_title VARCHAR(500),
  views_count BIGINT,
  unique_visitors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.page_path,
    MAX(pv.page_title) as page_title,
    COUNT(*)::BIGINT as views_count,
    COUNT(DISTINCT COALESCE(pv.user_id::TEXT, pv.session_id))::BIGINT as unique_visitors
  FROM page_views pv
  WHERE pv.created_at >= start_date AND pv.created_at <= end_date
  GROUP BY pv.page_path
  ORDER BY views_count DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;




