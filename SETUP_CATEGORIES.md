# Настройка категорий в Supabase

## Шаг 1: Создание таблицы categories

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor** (в левом меню)
4. Скопируйте содержимое файла `create_categories_table.sql`
5. Вставьте в SQL Editor
6. Нажмите **RUN** (или F5)

## Шаг 2: Проверка

После выполнения SQL:
1. Откройте **Table Editor** → **categories** - должны появиться 4 категории:
   - Колпаки (slug: kolpaki)
   - Платки (slug: platki)
   - Косынки (slug: kosynki)
   - Капоры (slug: kapory)

## Шаг 3: Связь товаров с категориями

**ВАЖНО:** Если у вас уже есть товары с категориями:
- `scarves` → нужно изменить на `platki` (Платки)
- `kosinka` → нужно изменить на `kosynki` (Косынки)
- `bandanas` → можно оставить или создать новую категорию
- `capor` → нужно изменить на `kapory` (Капоры)

### SQL для обновления категорий в товарах:

```sql
-- Обновление категорий в товарах
UPDATE products 
SET category = 'platki' 
WHERE category = 'scarves';

UPDATE products 
SET category = 'kosynki' 
WHERE category = 'kosinka';

UPDATE products 
SET category = 'kapory' 
WHERE category = 'capor';

-- Если нужно создать категорию для бандан:
INSERT INTO categories (name, slug, description, order_index, is_active) 
VALUES ('Банданы', 'bandanas', 'Яркие и стильные банданы', 5, true)
ON CONFLICT (slug) DO NOTHING;
```

## Шаг 4: Использование

После настройки:
1. **Админ-панель**: `/admin/categories` - управление категориями
2. **Главная страница**: Категории загружаются автоматически из Supabase
3. **Каталог**: Фильтр по категориям работает с данными из Supabase
4. **Страница категории**: `/category/:slug` - показывает товары выбранной категории

## Функции

- ✅ Добавление категорий с названием, slug, описанием
- ✅ Загрузка изображений категорий
- ✅ Редактирование всех полей
- ✅ Удаление категорий
- ✅ Родительские категории (иерархия)
- ✅ Порядок сортировки
- ✅ Включение/отключение активности
- ✅ Автогенерация slug из названия









