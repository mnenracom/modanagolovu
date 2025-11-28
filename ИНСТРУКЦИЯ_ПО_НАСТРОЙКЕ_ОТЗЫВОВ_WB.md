# Инструкция по настройке синхронизации отзывов WildBerries

## Проблема
Отзывы не синхронизируются из WildBerries, потому что для получения отзывов нужен **Content API**, а не Statistics API.

## Решение

### 1. Обновлен код для поддержки Content API

✅ Обновлен метод `getReviews` в `wildberriesApiService.ts`:
- Теперь использует базовый URL `https://content-api.wildberries.ru`
- Endpoint: `/content/v1/feedbacks`
- Поддерживает отдельный токен Content API

✅ Добавлено поле `contentApiKey` в настройки маркетплейсов

✅ Обновлена синхронизация отзывов для использования токена Content API

### 2. Настройка токенов в админ-панели

1. Перейдите в **Админ-панель → Маркетплейсы → Настройки**
2. Найдите или создайте аккаунт WildBerries
3. Заполните поля:
   - **API ключ (Statistics API)** - основной токен для статистики и цен
   - **API ключ Content API (для отзывов)** - токен с правами "ЦЕНЫ ОТЗЫВЫ"
   - **Название аккаунта** - например, "WB OAC" или "WB EMC"
   - **Seller ID** (опционально)

### 3. Токены, которые вы предоставили

**Аккаунт 1: WB OAC**
- Токен: `eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjUwOTA0djEiLCJ0eXAiOiJKV1QifQ.eyJhY2MiOjEsImVudCI6MSwiZXhwIjoxNzc4Njg4MDg5LCJpZCI6IjAxOWE3NjM5LWM4ODUtNzVmNC05ODEzLTRlNDM1ODVkMTNkMSIsImlpZCI6NjQzODYwNzcsIm9pZCI6MjUwMDUxMzAxLCJzIjoxMzYsInNpZCI6Ijg3YjBjMzRjLTcxMWItNDQzZS1iOTg3LWJhNDBmOWRmODRlYSIsInQiOmZhbHNlLCJ1aWQiOjY0Mzg2MDc3fQ.ky88VozB08YlE4qwX74bcl6-teUATYp9MZH3-mpqNRs6pWOuasN3sWqHr0r12ic3u8FUsajiDZ0TZCLpxtaYew`

**Аккаунт 2: WB EMC**
- Токен: `eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjUwOTA0djEiLCJ0eXAiOiJKV1QifQ.eyJhY2MiOjEsImVudCI6MSwiZXhwIjoxNzc4Njg4MzY0LCJpZCI6IjAxOWE3NjNkLWY4MTctNzFkZC05ZWIyLWJmNWEwYzQxMzk4ZSIsImlpZCI6Mzc3OTg3NjcsIm9pZCI6Mjg1NTQ5LCJzIjoxMzYsInNpZCI6Ijg2YzM1MTg1LThhMTYtNDU2Ny1iNjYyLWY4NDMwN2U5ZThhZiIsInQiOmZhbHNlLCJ1aWQiOjM3Nzk4NzY3fQ.Jx3nexshw_MuONN_WrnRreqX3jKnWIRdwmT-Ij8cQPQWgDH9xQt3wTUshvgUXk2Wv_SnVpicfzUn4Z905Ksa3w`

### 4. Как добавить токены

1. В админ-панели перейдите в **Маркетплейсы → Настройки**
2. Выберите вкладку **WildBerries**
3. Для каждого аккаунта:
   - **Название аккаунта**: "WB OAC" (для первого) или "WB EMC" (для второго)
   - **API ключ (Statistics API)**: основной токен (если есть отдельный для статистики)
   - **API ключ Content API (для отзывов)**: вставьте соответствующий токен из списка выше
   - Нажмите **Сохранить**

### 5. Синхронизация отзывов

После настройки токенов:

1. Перейдите в **Отзывы → Модерация**
2. Нажмите кнопку **"Синхронизировать отзывы"**
3. Система автоматически:
   - Найдет все товары из маркетплейсов
   - Сопоставит их с товарами в вашей базе по SKU
   - Загрузит отзывы через Content API
   - Сохранит их в базу данных со статусом "pending" (требует модерации)

### 6. Проверка работы

После синхронизации:
- Откройте консоль браузера (F12)
- Проверьте логи - должны быть сообщения типа:
  - `Синхронизация отзывов WB для товара {nmId} (аккаунт: {accountName})`
  - `Синхронизировано {количество} отзывов для WB товара {nmId}`

### 7. Важные замечания

⚠️ **Токены Content API отличаются от токенов Statistics API**
- Statistics API используется для остатков, цен, продаж
- Content API используется для отзывов и контента

⚠️ **Если токен Content API не указан**
- Система попытается использовать основной API ключ
- Это может не сработать, если основной ключ не имеет прав Content API

⚠️ **Сопоставление товаров**
- Отзывы синхронизируются только для товаров, которые найдены в таблице `marketplace_products`
- Товары сопоставляются по SKU (артикулу)
- Убедитесь, что SKU в вашей базе совпадает с SKU на маркетплейсе

### 8. Обновление Edge Function (если используется прокси)

Если вы используете Supabase Edge Function для прокси, убедитесь, что она поддерживает параметр `baseUrl`:

```typescript
// В Edge Function должен быть параметр baseUrl
const baseUrl = body.baseUrl || 'https://statistics-api.wildberries.ru';
```

---

## Если отзывы все еще не синхронизируются

1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что токены вставлены правильно (без лишних пробелов)
3. Проверьте, что товары есть в таблице `marketplace_products`
4. Убедитесь, что SKU товаров совпадают
5. Проверьте логи Edge Function (если используется прокси)

---

**Дата обновления:** 2025-01-11



