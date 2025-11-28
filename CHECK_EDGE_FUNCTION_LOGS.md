# Проверка логов Edge Function

## Как проверить логи функции

1. Откройте Supabase Dashboard:
   https://supabase.com/dashboard/project/vielcegrqrgkhsvudrga/functions

2. Нажмите на функцию `wildberries-proxy`

3. Перейдите на вкладку **Logs**

4. Там вы увидите все логи выполнения функции, включая:
   - Запросы к функции
   - Ошибки
   - Ответы от WB API

## Что искать в логах

- **"Request received"** - показывает, какие параметры получила функция
- **"Making request to WB API"** - показывает URL запроса к WB API
- **"WB API response status"** - статус ответа от WB API
- **"Error in wildberries-proxy"** - любые ошибки в функции

## Если видите ошибку

Скопируйте текст ошибки из логов и сообщите мне - я помогу исправить проблему.


