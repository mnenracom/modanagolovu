# Миграция на Supabase

## Выполненные изменения

### 1. База данных
- ✅ Создан SQL файл `supabase_schema.sql` с полной схемой таблиц
- ✅ Все таблицы используют PostgreSQL (BIGSERIAL для ID)
- ✅ Формат данных: snake_case вместо camelCase
- ✅ Массивы хранятся как TEXT[] или JSONB
- ✅ Созданы индексы для оптимизации запросов
- ✅ Триггеры для автоматического обновления `updated_at`
- ✅ Функция для автоматической генерации номеров заказов

### 2. API Сервисы
- ✅ Создан `src/lib/supabase.ts` - клиент Supabase
- ✅ Создан `src/services/productsService.ts` - сервис для товаров
- ✅ Создан `src/services/ordersService.ts` - сервис для заказов
- ✅ Создан `src/services/dashboardService.ts` - сервис для статистики
- ✅ Все методы используют `supabase.from('table').select()/insert()/update()/delete()`

### 3. Обновленные компоненты
- ✅ `Dashboard.tsx` - использует `dashboardService` для получения статистики
- ✅ `Products.tsx` - полностью переписан для работы с Supabase
- ✅ `Orders.tsx` - обновлен для работы с Supabase
- ✅ `OrderDetail.tsx` - обновлен для работы с Supabase

### 4. Типы и трансформации
- ✅ Создан `src/types/productSupabase.ts` - типы для Supabase формата
- ✅ Создан `src/types/orderSupabase.ts` - типы для заказов в Supabase
- ✅ Функции трансформации данных (snake_case ↔ camelCase)
- ✅ Автоматическое преобразование при чтении/записи

## Установка

### 1. Установите зависимости
```bash
npm install @supabase/supabase-js
```

### 2. Настройте переменные окружения
Создайте файл `.env` в корне проекта:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Создайте таблицы в Supabase
1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните SQL из файла `supabase_schema.sql`

### 4. Настройте Storage (для изображений)
1. В Supabase Dashboard перейдите в Storage
2. Создайте bucket `product-images`
3. Настройте политики доступа (public read, authenticated write)

## Структура таблиц

### products
```sql
- id (BIGSERIAL PRIMARY KEY)
- name, description, category, subcategory
- price, wholesale_price
- material, sku
- images (TEXT[]), colors (TEXT[]), sizes (TEXT[])
- in_stock, stock_quantity, min_order_quantity
- discount
- price_ranges (JSONB)
- variations (JSONB)
- created_at, updated_at
```

### orders
```sql
- id (BIGSERIAL PRIMARY KEY)
- order_number (VARCHAR UNIQUE)
- user_id (BIGINT)
- customer_* (name, email, phone, address, telegram, whatsapp)
- items (JSONB)
- subtotal, shipping_cost, discount, total_amount
- status, payment_method, payment_status, shipping_method
- tracking_number, notes
- history (JSONB)
- created_at, updated_at
```

### users
```sql
- id (BIGSERIAL PRIMARY KEY)
- email, password_hash, full_name
- phone, address, telegram, whatsapp
- role, status, is_active
- login_history (JSONB)
- created_at, updated_at
```

### categories
```sql
- id (BIGSERIAL PRIMARY KEY)
- name, slug, parent_id
- description, image
- order_index, is_active
- created_at, updated_at
```

## Изменения в коде

### До (MongoDB):
```typescript
const product = await Product.findById(id);
```

### После (Supabase):
```typescript
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', id)
  .single();
```

## Важные замечания

1. **ID теперь числа**: `id: string` → `id: number`
2. **Формат полей**: `inStock` → `in_stock`, `priceRanges` → `price_ranges`
3. **JSONB для сложных данных**: `price_ranges` и `variations` хранятся как JSONB
4. **Массивы**: `images`, `colors`, `sizes` хранятся как TEXT[]
5. **Трансформация**: Автоматическое преобразование при чтении/записи

## Следующие шаги

1. Настроить Row Level Security (RLS) политики в Supabase
2. Настроить Storage bucket для загрузки изображений
3. Добавить реальную аутентификацию через Supabase Auth (опционально)
4. Настроить триггеры для обновления статистики
5. Добавить валидацию данных на уровне базы









