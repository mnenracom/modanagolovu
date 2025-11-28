# Инструкция по развертыванию Edge Function для ЮКассы

## Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ - самый простой)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Edge Functions** в левом меню
4. Нажмите **Create a new function**
5. Назовите функцию: `create-yookassa-payment`
6. Скопируйте содержимое файла `supabase/functions/create-yookassa-payment/index.ts`
7. Вставьте код в редактор
8. Нажмите **Deploy**

**Готово!** Функция будет доступна по адресу:
`https://ваш-project-ref.supabase.co/functions/v1/create-yookassa-payment`

---

## Способ 2: Через Supabase CLI

### Шаг 1: Установка CLI

```bash
npm install -g supabase
```

### Шаг 2: Авторизация

```bash
supabase login
```

Следуйте инструкциям в браузере для авторизации.

### Шаг 3: Связывание проекта

```bash
supabase link --project-ref vielcegrqrgkhsvudrga
```

Где `vielcegrqrgkhsvudrga` - это ваш project reference (из URL вашего проекта).

### Шаг 4: Развертывание функции

```bash
supabase functions deploy create-yookassa-payment
```

---

## Проверка работы функции

После развертывания функция должна быть доступна по адресу:
```
https://vielcegrqrgkhsvudrga.supabase.co/functions/v1/create-yookassa-payment
```

Вы можете протестировать её через Supabase Dashboard → Edge Functions → create-yookassa-payment → Invoke Function

---

## Настройка прав доступа (опционально)

Если функция требует авторизацию, добавьте в Supabase SQL Editor:

```sql
-- Разрешить всем вызывать функцию (для публичного доступа)
-- Это уже настроено через verify_jwt = false в config.toml
```

---

## Важно

- После развертывания функция автоматически получает CORS заголовки
- Функция будет доступна по адресу: `https://ваш-project-ref.supabase.co/functions/v1/create-yookassa-payment`
- Клиентский код уже обновлен для использования этой функции

