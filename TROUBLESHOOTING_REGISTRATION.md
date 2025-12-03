# Решение проблем с регистрацией

## Ошибка "Failed to fetch"

Эта ошибка означает, что приложение не может подключиться к Supabase. Возможные причины и решения:

### 1. Проверьте переменные окружения

Убедитесь, что файл `.env` существует в корне проекта и содержит:

```env
VITE_SUPABASE_URL=https://ваш-проект.supabase.co
VITE_SUPABASE_ANON_KEY=ваш_anon_key
```

**ВАЖНО:** После изменения `.env` файла:
- Остановите dev-сервер (Ctrl+C)
- Запустите снова: `npm run dev`

Переменные окружения загружаются только при старте сервера!

### 2. Проверьте доступность Supabase

Откройте в браузере ваш Supabase URL:
```
https://ваш-проект.supabase.co
```

Если страница не загружается, возможно:
- Проблема с интернет-соединением
- Supabase сервис недоступен
- Неправильный URL

### 3. Проверьте настройки Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **API**
4. Убедитесь, что:
   - **Project URL** совпадает с `VITE_SUPABASE_URL` в `.env`
   - **anon public** key совпадает с `VITE_SUPABASE_ANON_KEY` в `.env`

### 4. Проверьте настройки Authentication

1. В Supabase Dashboard перейдите в **Authentication** → **Settings**
2. Убедитесь, что:
   - **Enable Email Signup** включен (если используете email регистрацию)
   - **Site URL** настроен правильно (обычно `http://localhost:5173` для dev)

### 5. Проверьте CORS настройки

В Supabase Dashboard:
1. **Settings** → **API**
2. Проверьте **Site URL** - должен быть `http://localhost:5173` (или ваш dev URL)
3. Добавьте ваш домен в **Redirect URLs** если нужно

### 6. Проверьте консоль браузера

Откройте DevTools (F12) → Console и проверьте:
- Есть ли ошибки CORS
- Правильно ли загружаются переменные окружения
- Есть ли другие ошибки сети

### 7. Временное решение: отключить проверку Email

Если проблема с подтверждением email:
1. В Supabase Dashboard → **Authentication** → **Settings**
2. Отключите **Confirm email** (для тестирования)
3. Это позволит регистрироваться без подтверждения email

## Быстрая проверка

Выполните в консоли браузера (F12 → Console):

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'установлен' : 'НЕ УСТАНОВЛЕН');
```

Если ключ не установлен - перезапустите dev-сервер после настройки `.env`.



