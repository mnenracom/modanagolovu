# Настройка админ-панели

## Шаг 1: Установка зависимостей

Установите axios для работы с API:

```bash
npm install axios
```

## Шаг 2: Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
VITE_API_URL=http://localhost:3000/api
```

## Шаг 3: Проверка работы

1. Запустите проект: `npm run dev`
2. Перейдите на `/admin/login`
3. Войдите с тестовыми данными:
   - Email: `admin@example.com`
   - Пароль: `admin123`

## Структура файлов

### Frontend
```
src/
├── contexts/
│   └── AdminAuthContext.tsx    # Контекст авторизации
├── components/
│   └── admin/
│       ├── AdminLayout.tsx      # Layout с сайдбаром
│       └── ProtectedRoute.tsx  # Защищенный роут
├── pages/
│   └── admin/
│       ├── Login.tsx            # Страница входа
│       ├── Dashboard.tsx        # Дашборд
│       └── Products.tsx          # CRUD товаров
└── lib/
    └── api.ts                   # Настройка Axios
```

### Backend Models
```
server/
└── models/
    ├── Product.js               # Модель товара
    └── User.js                   # Модель пользователя
```

## Подключение к реальному API

В файлах где используются моковые данные, замените комментарии `// TODO:` на реальные вызовы API:

```typescript
// Было (мок):
const mockProducts = [...];

// Станет (реальный API):
const response = await adminAPI.getProducts();
setProducts(response.data);
```

## Следующие шаги

После базовой настройки можно добавить:
- Загрузку изображений
- Валидацию форм (Zod)
- Toast-уведомления
- Пагинацию
- Фильтры и сортировку










