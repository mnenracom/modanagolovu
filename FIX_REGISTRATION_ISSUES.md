# Исправление проблем с регистрацией

## Проблема
Регистрация прошла, но:
1. Пользователь не появился в Supabase (в таблице `public.users`)
2. Код подтверждения не пришёл на почту

## Решения

### 1. Проверьте, создаётся ли пользователь в auth.users

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Authentication** → **Users**
4. Проверьте, появился ли новый пользователь

**Если пользователь ЕСТЬ в auth.users:**
- Триггер должен автоматически создать запись в `public.users`
- Проверьте, сработал ли триггер (см. ниже)

**Если пользователя НЕТ в auth.users:**
- Регистрация не прошла
- Проверьте консоль браузера на ошибки
- Проверьте настройки Supabase (см. ниже)

---

### 2. Проверьте триггер для создания пользователя

Триггер `handle_new_user` должен автоматически создавать запись в таблице `public.users` при регистрации.

**Проверка триггера:**

1. В Supabase Dashboard перейдите в **SQL Editor**
2. Выполните запрос:

```sql
-- Проверить, существует ли триггер
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Если триггера нет, создайте его:**

Выполните SQL скрипт из файла `create_users_table.sql` (функция `handle_new_user` и триггер `on_auth_user_created`).

---

### 3. Настройки Email в Supabase

**Проверьте настройки подтверждения email:**

1. В Supabase Dashboard перейдите в **Authentication** → **Settings**
2. Найдите раздел **User Signups**
3. Проверьте настройку **Confirm email**:
   - **Включено** - требуется подтверждение email, письмо должно прийти
   - **Выключено** - пользователь автоматически подтверждён

**Если письма не приходят:**

#### Вариант A: Отключить подтверждение email (для тестирования)

1. В **Authentication** → **Settings** → **User Signups**
2. Выключите **Confirm email**
3. Сохраните изменения
4. Теперь пользователи будут регистрироваться без подтверждения email

#### Вариант B: Настроить отправку email (для продакшена)

1. В **Authentication** → **Settings** → **Email Templates**
2. Проверьте шаблоны писем
3. В **Project Settings** → **Auth** → **SMTP Settings**:
   - Настройте SMTP сервер (для отправки писем)
   - Или используйте встроенный email от Supabase (ограничен)

**Встроенный email от Supabase:**
- Работает только для проектов на Free плане
- Ограничение: 4 письма в час, 100 писем в день
- Письма могут попадать в спам

**Рекомендация:**
Для продакшена используйте SMTP (SendGrid, Mailgun, и т.д.)

---

### 4. Проверьте логи Supabase

**Проверьте логи триггеров:**

1. В Supabase Dashboard перейдите в **Database** → **Logs**
2. Найдите ошибки, связанные с триггером `handle_new_user`

**Проверьте логи Authentication:**

1. В **Authentication** → **Logs**
2. Найдите события регистрации
3. Проверьте, нет ли ошибок

---

### 5. Проверьте RLS политики для таблицы users

**Если триггер не может создать запись из-за RLS:**

1. В Supabase Dashboard перейдите в **Authentication** → **Policies**
2. Найдите таблицу `users`
3. Убедитесь, что есть политика для INSERT операций от имени триггера

**Или временно отключите RLS для тестирования:**

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

**⚠️ Внимание:** Отключайте RLS только для тестирования!

---

### 6. Ручное создание пользователя (временное решение)

Если триггер не работает, можно создать запись вручную:

1. В Supabase Dashboard перейдите в **Authentication** → **Users**
2. Найдите зарегистрированного пользователя
3. Скопируйте его `id` (UUID)
4. В **SQL Editor** выполните:

```sql
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  status,
  is_active
)
VALUES (
  'UUID_ПОЛЬЗОВАТЕЛЯ',  -- Замените на реальный UUID
  'email@example.com',  -- Замените на реальный email
  'Имя Фамилия',        -- Замените на реальное имя
  'user',
  'active',
  true
)
ON CONFLICT (id) DO NOTHING;
```

---

### 7. Проверьте консоль браузера

Откройте DevTools (F12) → Console и проверьте:
- Есть ли ошибки при регистрации
- Что показывает `console.log` о создании пользователя
- Есть ли предупреждения о триггере

---

## Быстрая проверка

### Шаг 1: Проверьте настройки

1. ✅ **Confirm email** - включено или выключено?
2. ✅ **Email Signup** - включено?
3. ✅ Триггер `on_auth_user_created` существует?

### Шаг 2: Проверьте пользователя

```sql
-- Проверить пользователей в auth.users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Проверить пользователей в public.users
SELECT id, email, full_name, role, created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
```

### Шаг 3: Проверьте логи

В Supabase Dashboard → **Database** → **Logs** → найдите ошибки

---

## Рекомендуемые настройки для тестирования

1. **Отключить Confirm email** (временно)
2. **Убедиться, что триггер существует**
3. **Проверить RLS политики**

После этого регистрация должна работать без подтверждения email.




