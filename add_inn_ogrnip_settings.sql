-- Добавление настроек ИНН и ОГРНИП для страницы контактов
-- Эти настройки будут отображаться на странице контактов и могут быть изменены в админ-панели

INSERT INTO settings (key, value, description) VALUES
  ('contacts_inn', '42020028583', 'ИНН для отображения на странице контактов'),
  ('contacts_ogrnip', '304420213300029', 'ОГРНИП для отображения на странице контактов')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

