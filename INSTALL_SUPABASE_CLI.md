# Установка Supabase CLI на Windows

## ❌ Проблема

Установка через `npm install -g supabase` **не поддерживается** и выдает ошибку:
```
Installing Supabase CLI as a global module is not supported.
```

## ✅ Решение: Используйте npx (самый простой способ)

**Преимущества:**
- ✅ Не требует установки
- ✅ Всегда использует последнюю версию
- ✅ Работает сразу

**Использование:**
Просто добавляйте `npx supabase@latest` перед каждой командой:

```bash
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_REF
npx supabase@latest functions deploy wildberries-proxy
```

---

## Альтернативные способы установки

### Способ 1: Через Scoop (если уже установлен)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

После установки используйте команды без `npx`:
```bash
supabase login
supabase link --project-ref YOUR_REF
supabase functions deploy wildberries-proxy
```

### Способ 2: Прямая загрузка

1. Перейдите на https://github.com/supabase/cli/releases
2. Скачайте `supabase_windows_amd64.zip`
3. Распакуйте архив
4. Добавьте `supabase.exe` в PATH:
   - Скопируйте `supabase.exe` в `C:\Windows\System32`
   - Или добавьте папку с `supabase.exe` в переменную PATH

После установки используйте команды без `npx`.

---

## Рекомендация

**Используйте npx** — это самый простой способ, который работает сразу без дополнительной настройки!

