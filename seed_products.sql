-- SQL скрипт для добавления старых товаров в Supabase
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Добавление старых товаров в Supabase
INSERT INTO products (name, description, category, price, wholesale_price, material, colors, sizes, in_stock, stock_quantity, min_order_quantity, discount, price_ranges) VALUES
('Шелковый платок "Бордо"', 'Роскошный шелковый платок премиум качества', 'scarves', 450, 450, 'Натуральный шелк', ARRAY['Бордовый', 'Золотой', 'Черный', 'Синий'], ARRAY['70x70', '90x90'], true, 100, 10, 0, '[{"min_quantity": 10, "max_quantity": 49, "price": 450}, {"min_quantity": 50, "max_quantity": 99, "price": 420}, {"min_quantity": 100, "max_quantity": null, "price": 380}]'::jsonb),
('Бандана классическая', 'Яркие банданы из качественного хлопка', 'bandanas', 180, 180, 'Хлопок 100%', ARRAY['Красный', 'Синий', 'Желтый', 'Зеленый', 'Розовый'], ARRAY['55x55'], true, 200, 20, 0, '[{"min_quantity": 20, "max_quantity": 99, "price": 180}, {"min_quantity": 100, "max_quantity": 249, "price": 160}, {"min_quantity": 250, "max_quantity": null, "price": 140}]'::jsonb),
('Капор зимний', 'Теплый зимний капор из шерсти', 'capor', 890, 890, 'Шерсть 80%, акрил 20%', ARRAY['Бордовый', 'Черный', 'Серый'], ARRAY['Универсальный'], true, 50, 10, 0, '[{"min_quantity": 10, "max_quantity": 29, "price": 890}, {"min_quantity": 30, "max_quantity": 59, "price": 850}, {"min_quantity": 60, "max_quantity": null, "price": 790}]'::jsonb),
('Косынка народная', 'Традиционная косынка с узором', 'kosinka', 320, 320, 'Вискоза', ARRAY['Красный', 'Синий', 'Бежевый', 'Зеленый'], ARRAY['80x80', '90x90'], true, 150, 15, 0, '[{"min_quantity": 15, "max_quantity": 49, "price": 320}, {"min_quantity": 50, "max_quantity": 99, "price": 290}, {"min_quantity": 100, "max_quantity": null, "price": 260}]'::jsonb),
('Шелковый платок "Элегант"', 'Изысканный платок с принтом', 'scarves', 480, 480, 'Натуральный шелк', ARRAY['Черный', 'Изумрудный', 'Фиолетовый'], ARRAY['90x90'], true, 80, 10, 0, '[{"min_quantity": 10, "max_quantity": 49, "price": 480}, {"min_quantity": 50, "max_quantity": 99, "price": 450}, {"min_quantity": 100, "max_quantity": null, "price": 410}]'::jsonb),
('Бандана спортивная', 'Функциональная бандана для активного отдыха', 'bandanas', 200, 200, 'Микрофибра', ARRAY['Черный', 'Камуфляж', 'Оранжевый'], ARRAY['55x55'], true, 120, 20, 0, '[{"min_quantity": 20, "max_quantity": 99, "price": 200}, {"min_quantity": 100, "max_quantity": 249, "price": 180}, {"min_quantity": 250, "max_quantity": null, "price": 160}]'::jsonb);









