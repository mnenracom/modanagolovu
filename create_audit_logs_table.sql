-- SQL скрипт для создания таблицы логов действий (audit_logs)
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Создание таблицы audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', etc.
  entity_type VARCHAR(50) NOT NULL, -- 'product', 'category', 'banner', 'order', 'user', etc.
  entity_id BIGINT, -- ID изменяемой сущности
  entity_name VARCHAR(255), -- Название изменяемой сущности (для удобства)
  changes JSONB, -- Изменения (старые и новые значения)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS политики для audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Удаляем ВСЕ существующие политики, если они есть
DROP POLICY IF EXISTS "Админы видят все логи" ON audit_logs;
DROP POLICY IF EXISTS "Пользователи видят свои логи" ON audit_logs;
DROP POLICY IF EXISTS "Админы видят все логи (временная)" ON audit_logs;
DROP POLICY IF EXISTS "temp_see_all_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Публичный доступ: логи" ON audit_logs;
DROP POLICY IF EXISTS "Все могут создавать логи" ON audit_logs;

-- ВРЕМЕННАЯ политика для полного доступа (для тестирования)
-- Позже можно заменить на более строгую
CREATE POLICY "Админы видят все логи" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true); -- Временно разрешаем всем авторизованным видеть логи

-- Политика для создания логов (все авторизованные могут создавать)
CREATE POLICY "Все могут создавать логи" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Функция для автоматического логирования (можно вызывать из триггеров)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_user_email VARCHAR,
  p_action VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id BIGINT DEFAULT NULL,
  p_entity_name VARCHAR DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    entity_name,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_user_email,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_changes,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- Комментарии
COMMENT ON TABLE audit_logs IS 'Таблица для хранения логов действий пользователей в админ-панели';
COMMENT ON COLUMN audit_logs.action IS 'Тип действия: create, update, delete, login, logout, etc.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Тип сущности: product, category, banner, order, user, etc.';
COMMENT ON COLUMN audit_logs.changes IS 'JSON объект с изменениями (old_values и new_values)';

