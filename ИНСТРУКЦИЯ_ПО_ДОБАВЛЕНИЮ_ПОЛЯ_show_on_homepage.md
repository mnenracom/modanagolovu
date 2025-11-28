# Инструкция по добавлению поля show_on_homepage в таблицу categories

## Ошибка
Если вы видите ошибку: "Could not find the 'show_on_homepage' column of 'categories' in the schema cache"

Это означает, что поле `show_on_homepage` еще не добавлено в базу данных.

## Решение

1. Откройте Supabase Dashboard
2. Перейдите в **SQL Editor**
3. Скопируйте и выполните SQL-скрипт из файла `add_show_on_homepage_to_categories.sql`:

```sql
-- Добавление поля show_on_homepage в таблицу categories

-- Добавляем колонку show_on_homepage, если её еще нет
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN DEFAULT false;

-- Создаем индекс для быстрого поиска категорий для главной страницы
CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage 
ON categories(show_on_homepage) 
WHERE show_on_homepage = true;

-- Комментарий к колонке
COMMENT ON COLUMN categories.show_on_homepage IS 'Отображать категорию на главной странице';
```

4. Нажмите **Run** для выполнения скрипта
5. После успешного выполнения обновите страницу в браузере

## Проверка

После выполнения SQL-скрипта:
- Поле `show_on_homepage` будет добавлено в таблицу `categories`
- Все существующие категории будут иметь значение `false` по умолчанию
- В админ панели появится возможность выбирать категории для отображения на главной странице

## Примечание

Код приложения уже настроен на работу с этим полем. После добавления поля в БД всё будет работать автоматически.




