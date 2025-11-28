# Быстрое исправление ошибки RLS

## Проблема
Ошибка "new row violates row-level security policy" при создании товара или загрузке изображений.

## Решение

### Шаг 1: Выполните SQL в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Скопируйте и выполните **ВСЁ** содержимое файла `fix_all_rls.sql`

### Шаг 2: Проверьте Storage Bucket

1. В Supabase Dashboard перейдите в **Storage**
2. Убедитесь, что bucket `product-images` существует
3. Если его нет - создайте:
   - Нажмите **Create a new bucket**
   - Название: `product-images`
   - Выберите **Public bucket** (важно!)
   - Нажмите **Create bucket**

### Шаг 3: Проверьте политики Storage через UI

1. В Storage выберите bucket `product-images`
2. Перейдите в раздел **Policies**
3. Убедитесь, что есть политики для:
   - SELECT (чтение)
   - INSERT (запись)
   - UPDATE (обновление)
   - DELETE (удаление)
4. Если политик нет - создайте их через UI или используйте SQL из `fix_all_rls.sql`

### Шаг 4: Проверьте работу

1. Перезапустите приложение: `npm run dev`
2. Попробуйте создать товар с изображением
3. Если ошибка сохраняется - проверьте консоль браузера

## Альтернативное решение (если SQL не работает)

### Через UI в Supabase:

**Для таблиц:**
1. Database → Tables → выберите таблицу (products, orders)
2. Нажмите на вкладку **Policies**
3. Убедитесь, что RLS отключен или есть публичные политики

**Для Storage:**
1. Storage → `product-images` → Policies
2. Создайте политики вручную:
   - Policy name: "Public access"
   - Allowed operation: SELECT/INSERT/UPDATE/DELETE
   - Target roles: `anon`, `authenticated`
   - Policy definition: `true`

## Проверка результата

После выполнения всех шагов:
- ✅ Товары должны создаваться без ошибок
- ✅ Изображения должны загружаться в Storage
- ✅ Данные должны отображаться в админ-панели

Если проблема сохраняется, проверьте:
1. Правильно ли указаны ключи в `.env`
2. Существует ли bucket `product-images`
3. Публичный ли bucket (важно для anon key)









