# Настройка Supabase для проекта

## Шаг 1: Создайте файл .env

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
VITE_SUPABASE_URL=https://vielcegrqrgkhsvudrga.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZWxjZWdycXJna2hzdnVkcmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyODA5MzksImV4cCI6MjA3Nzg1NjkzOX0.aI0p9mQlMFI6wazHPTUmEl-xHb7aMssKx4na0PI-rsU
```

## Шаг 2: Создайте таблицы в Supabase

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте содержимое файла `supabase_schema.sql`
5. Вставьте в SQL Editor и выполните запрос

## Шаг 3: Отключите Row Level Security

**ВАЖНО:** Для работы админ-панели нужно отключить RLS или настроить политики.

### Вариант 1: Отключить RLS (рекомендуется для админ-панели)

1. В Supabase Dashboard перейдите в **SQL Editor**
2. Выполните SQL из файла `disable_rls.sql`:

```sql
-- Отключить RLS для таблиц
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
```

### Вариант 2: Настроить политики (если нужна безопасность)

Если вы хотите оставить RLS включенным, создайте политики:

```sql
-- Включить RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (публичный доступ)
CREATE POLICY "Public read access" ON products FOR SELECT
USING (true);

-- Политика для вставки
CREATE POLICY "Public insert access" ON products FOR INSERT
WITH CHECK (true);

-- Политика для обновления
CREATE POLICY "Public update access" ON products FOR UPDATE
USING (true);

-- Политика для удаления
CREATE POLICY "Public delete access" ON products FOR DELETE
USING (true);

-- Аналогично для orders, users, categories
```

## Шаг 4: Настройте Storage для изображений

### Создание bucket

1. В Supabase Dashboard перейдите в **Storage**
2. Нажмите **Create a new bucket**
3. Название: `product-images`
4. Выберите **Public bucket** (чтобы изображения были доступны публично)
5. Нажмите **Create bucket**

### Настройка политик доступа

1. В Storage перейдите в **Policies** для bucket `product-images`
2. Создайте политику для чтения (Select):
   - Policy name: `Public read access`
   - Allowed operation: `SELECT`
   - Target roles: `anon`, `authenticated`
   - Policy definition: `true` (разрешить всем)

3. Создайте политику для записи (Insert):
   - Policy name: `Authenticated insert`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated` (или `anon` если нужен публичный доступ)
   - Policy definition: `true`

4. Создайте политику для обновления (Update):
   - Policy name: `Authenticated update`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated` (или `anon`)
   - Policy definition: `true`

5. Создайте политику для удаления (Delete):
   - Policy name: `Authenticated delete`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated` (или `anon`)
   - Policy definition: `true`

**Или используйте SQL для быстрой настройки:**

```sql
-- Разрешить публичное чтение
CREATE POLICY "Public read access" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Разрешить публичную запись (для анонимных пользователей)
CREATE POLICY "Public insert access" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

-- Разрешить публичное обновление
CREATE POLICY "Public update access" ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

-- Разрешить публичное удаление
CREATE POLICY "Public delete access" ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');
```

## Шаг 5: Настройте Storage политики

1. В Supabase Dashboard перейдите в **SQL Editor**
2. Выполните SQL из файла `setup_storage_policies.sql` для настройки доступа к Storage

Или выполните команды вручную через SQL Editor или через UI в Storage → Policies.

## Шаг 6: Проверьте подключение

1. Запустите проект: `npm run dev`
2. Откройте админ-панель
3. Попробуйте создать товар с изображением
4. Проверьте консоль браузера на наличие ошибок

## Решение проблем

### Ошибка "new row violates row-level security policy"

**Решение:** Отключите RLS для таблиц или настройте политики.

1. Выполните SQL из файла `disable_rls.sql` в Supabase SQL Editor
2. Или настройте политики (см. Шаг 3, Вариант 2)

### Ошибка "Bucket not found"

Убедитесь, что:
1. Bucket `product-images` создан
2. Bucket публичный (если используете anon key)

### Изображения не загружаются

Проверьте:
1. Политики Storage настроены правильно
2. Bucket существует и публичный
3. В консоли браузера нет ошибок CORS

## Структура данных

### Таблица products
- Все поля из схемы `supabase_schema.sql`
- `images` хранится как массив TEXT[] с URL изображений
- `price_ranges` и `variations` хранятся как JSONB

### Storage
- Путь: `products/{productId}_{random}.{ext}`
- URL формируется автоматически через `getPublicUrl()`

## Дополнительные настройки

### Row Level Security (RLS)

Если нужна дополнительная защита, можно настроить RLS политики:

```sql
-- Включить RLS для таблицы products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (публичный доступ)
CREATE POLICY "Public read access" ON products FOR SELECT
USING (true);

-- Политика для вставки (только для аутентифицированных)
CREATE POLICY "Authenticated insert" ON products FOR INSERT
WITH CHECK (true);

-- Политика для обновления
CREATE POLICY "Authenticated update" ON products FOR UPDATE
USING (true);

-- Политика для удаления
CREATE POLICY "Authenticated delete" ON products FOR DELETE
USING (true);
```

**Важно:** Если используете только anon key без аутентификации, используйте `WITH CHECK (true)` и `USING (true)` для всех политик.

