-- SQL скрипт для настройки хранилища изображений баннеров
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Создание bucket для изображений баннеров (если еще не создан)
-- Примечание: Bucket создается через Storage в Supabase Dashboard, но можно создать через SQL:

-- Вставьте следующие команды в SQL Editor:

-- 1. Создайте bucket "banner-images" через Supabase Dashboard → Storage → New bucket
--    Или используйте эту команду (может потребоваться права суперпользователя):
--    INSERT INTO storage.buckets (id, name, public) VALUES ('banner-images', 'banner-images', true);

-- 2. Настройте политики доступа для bucket (выполните в SQL Editor):

-- Политика для публичного чтения
CREATE POLICY "Публичное чтение изображений баннеров"
ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

-- Политика для загрузки изображений (для авторизованных пользователей)
-- В реальном приложении добавьте проверку роли пользователя
CREATE POLICY "Загрузка изображений баннеров"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banner-images');

-- Политика для обновления изображений
CREATE POLICY "Обновление изображений баннеров"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banner-images');

-- Политика для удаления изображений
CREATE POLICY "Удаление изображений баннеров"
ON storage.objects FOR DELETE
USING (bucket_id = 'banner-images');

-- Примечание: Если у вас RLS отключен для таблицы banners, 
-- вы можете также отключить RLS для storage.objects или настроить более открытые политики.








