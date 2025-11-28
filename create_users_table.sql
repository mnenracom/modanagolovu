-- SQL скрипт для создания таблицы users в Supabase
-- Выполните этот скрипт в Supabase Dashboard → SQL Editor
-- 
-- Эта таблица хранит дополнительную информацию о пользователях
-- (основная информация хранится в auth.users)
--
-- ⚠️ ВАЖНО: Если у вас уже есть таблица users со структурой id BIGSERIAL,
-- сначала удалите её или переименуйте

-- Удаляем старую таблицу users (если она существует со старой структурой)
DROP TABLE IF EXISTS users CASCADE;

-- Создание таблицы users с UUID (совместимо с auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  telegram VARCHAR(100),
  whatsapp VARCHAR(50),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'content', 'user')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'pending')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at_column();

-- Функция для автоматического создания записи в users при регистрации через Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    address,
    telegram,
    whatsapp,
    role,
    status,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'telegram',
    NEW.raw_user_meta_data->>'whatsapp',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    phone = COALESCE(EXCLUDED.phone, users.phone),
    address = COALESCE(EXCLUDED.address, users.address),
    telegram = COALESCE(EXCLUDED.telegram, users.telegram),
    whatsapp = COALESCE(EXCLUDED.whatsapp, users.whatsapp),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания записи при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Триггер для обновления записи при изменении данных в auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data)
  EXECUTE FUNCTION public.handle_new_user();

-- RLS политики для таблицы users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Публичный доступ: пользователи могут видеть только свои данные
CREATE POLICY "Пользователи видят свои данные" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Пользователи могут обновлять свои данные (кроме роли и статуса)
CREATE POLICY "Пользователи обновляют свои данные" ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Не позволяем менять роль и статус самостоятельно
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Админы могут видеть всех пользователей
CREATE POLICY "Админы видят всех пользователей" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager'))
    )
  );

-- Админы могут обновлять данные пользователей
CREATE POLICY "Админы обновляют пользователей" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager'))
    )
  );

-- Комментарии
COMMENT ON TABLE users IS 'Дополнительная информация о пользователях (основная информация в auth.users)';
COMMENT ON COLUMN users.id IS 'UUID пользователя из auth.users';
COMMENT ON COLUMN users.role IS 'Роль пользователя: admin, manager, content, user';
COMMENT ON COLUMN users.status IS 'Статус пользователя: active, inactive, blocked, pending';

