-- SQL скрипт для исправления RLS политик для audit_logs
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "Админы видят все логи" ON audit_logs;
DROP POLICY IF EXISTS "Пользователи видят свои логи" ON audit_logs;
DROP POLICY IF EXISTS "temp_see_all_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Публичный доступ: логи" ON audit_logs;

-- Включаем RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Временная политика для полного доступа админов (пока не настроена функция check_user_role)
CREATE POLICY "Админы видят все логи" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (true); -- Временно разрешаем всем авторизованным видеть логи

-- Политика для создания логов (все авторизованные могут создавать)
CREATE POLICY "Все могут создавать логи" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Пользователи могут видеть только свои логи (опционально, можно закомментировать)
-- CREATE POLICY "Пользователи видят свои логи" ON audit_logs
--   FOR SELECT
--   TO authenticated
--   USING (user_id = auth.uid());




