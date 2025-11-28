-- Добавление RLS политик для отзывов с маркетплейсов
-- Выполните в Supabase SQL Editor

-- Удаляем старые политики, если они существуют
DROP POLICY IF EXISTS "Users can insert marketplace reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update marketplace reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete marketplace reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view all reviews" ON public.reviews;

-- Политика: авторизованные пользователи могут вставлять отзывы с маркетплейсов
-- (для синхронизации отзывов из WildBerries и OZON)
CREATE POLICY "Users can insert marketplace reviews" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (source IN ('wildberries', 'ozon') AND auth.uid() IS NOT NULL)
  );

-- Политика: авторизованные пользователи могут обновлять отзывы с маркетплейсов
-- (для обновления статуса модерации, ответов и т.д.)
CREATE POLICY "Users can update marketplace reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    (source IN ('wildberries', 'ozon') AND auth.uid() IS NOT NULL)
  )
  WITH CHECK (
    (source IN ('wildberries', 'ozon') AND auth.uid() IS NOT NULL)
  );

-- Политика: авторизованные пользователи могут удалять отзывы с маркетплейсов
-- (для удаления дубликатов или некорректных отзывов)
CREATE POLICY "Users can delete marketplace reviews" ON public.reviews
  FOR DELETE
  TO authenticated
  USING (
    (source IN ('wildberries', 'ozon') AND auth.uid() IS NOT NULL)
  );

-- Политика: авторизованные пользователи могут читать все отзывы (включая pending)
-- (для админ-панели модерации отзывов)
CREATE POLICY "Users can view all reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Исправляем политику UPDATE для website отзывов, чтобы она не обращалась к auth.users
-- Это предотвращает ошибку "permission denied for table users"
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;

-- Создаем новую политику, которая не обращается к auth.users напрямую
-- Используем функцию auth.jwt() для получения email из токена
CREATE POLICY "Users can update their own reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    source = 'website' AND 
    author_email = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    source = 'website' AND 
    author_email = (auth.jwt() ->> 'email')
  );

-- Показываем результат
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'reviews' AND schemaname = 'public';
  
  RAISE NOTICE 'Всего политик для таблицы reviews: %', policy_count;
  RAISE NOTICE 'Политики для маркетплейсов успешно добавлены!';
  RAISE NOTICE 'Политика UPDATE для website отзывов исправлена!';
END $$;

