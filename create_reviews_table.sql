-- SQL скрипт для создания таблицы отзывов
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  
  -- Связь с товаром
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Источник отзыва
  source VARCHAR(50) NOT NULL, -- 'website', 'wildberries', 'ozon'
  marketplace_type VARCHAR(50), -- 'wildberries' или 'ozon' (если с маркетплейса)
  external_review_id VARCHAR(255), -- ID отзыва на маркетплейсе (для связи)
  
  -- Автор отзыва
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255), -- Только для отзывов с сайта
  author_avatar_url TEXT, -- URL аватара (если есть)
  
  -- Содержание отзыва
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Рейтинг от 1 до 5
  title VARCHAR(500), -- Заголовок отзыва
  text TEXT NOT NULL, -- Текст отзыва
  pros TEXT, -- Плюсы товара
  cons TEXT, -- Минусы товара
  
  -- Медиа
  photos TEXT[], -- Массив URL фотографий
  
  -- Модерация
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'hidden'
  moderation_notes TEXT, -- Заметки модератора
  moderated_by UUID REFERENCES auth.users(id), -- Кто модерировал
  moderated_at TIMESTAMP WITH TIME ZONE, -- Когда модерировали
  
  -- Метаданные
  verified_purchase BOOLEAN DEFAULT false, -- Подтвержденная покупка
  helpful_count INTEGER DEFAULT 0, -- Количество "Полезно"
  reply_text TEXT, -- Ответ продавца
  reply_date TIMESTAMP WITH TIME ZONE, -- Дата ответа
  
  -- Дополнительные данные с маркетплейсов
  metadata JSONB DEFAULT '{}', -- Дополнительные данные (дата покупки, размер и т.д.)
  
  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_created_at TIMESTAMP WITH TIME ZONE, -- Дата создания на маркетплейсе
  
  -- Уникальность: один отзыв с маркетплейса = одна запись
  UNIQUE(source, external_review_id)
);

-- Индексы для reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at_column();

-- RLS политики
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Все могут читать одобренные отзывы
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
CREATE POLICY "Anyone can view approved reviews" ON reviews
  FOR SELECT
  USING (status = 'approved');

-- Пользователи могут создавать отзывы (только для source = 'website')
DROP POLICY IF EXISTS "Users can create website reviews" ON reviews;
CREATE POLICY "Users can create website reviews" ON reviews
  FOR INSERT
  WITH CHECK (
    source = 'website' AND 
    (auth.uid() IS NOT NULL) -- Только авторизованные пользователи
  );

-- Пользователи могут обновлять свои отзывы (только для source = 'website')
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE
  USING (
    source = 'website' AND 
    author_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Администраторы могут управлять всеми отзывами
-- (Это будет обрабатываться через сервисный ключ Supabase в админке)

-- Функция для расчета среднего рейтинга товара
CREATE OR REPLACE FUNCTION calculate_product_rating(product_id_param BIGINT)
RETURNS TABLE (
  average_rating DECIMAL(3, 2),
  total_reviews INTEGER,
  rating_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(AVG(rating)::DECIMAL(3, 2), 0) as average_rating,
    COUNT(*)::INTEGER as total_reviews,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution
  FROM reviews
  WHERE product_id = product_id_param AND status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для увеличения счетчика "Полезно"
CREATE OR REPLACE FUNCTION increment_helpful_count(review_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE reviews
  SET helpful_count = COALESCE(helpful_count, 0) + 1
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

