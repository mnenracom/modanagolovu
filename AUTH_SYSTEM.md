# Система аутентификации и авторизации

## Реализованные функции

### 1. Регистрация пользователей
- **Страница**: `/auth/register`
- **Поля формы**:
  - Email (обязательно)
  - Пароль (обязательно, минимум 6 символов)
  - Подтверждение пароля
  - ФИО (обязательно)
  - Телефон (обязательно)
  - Адрес доставки (обязательно)
  - Telegram (опционально)
  - WhatsApp (опционально)

### 2. Авторизация пользователей
- **Страница**: `/auth/login`
- Авторизация через email и пароль
- Сохранение токена в localStorage
- Редирект после успешного входа

### 3. Управление клиентами в админ-панели
- **Страница**: `/admin/clients`
- Функции:
  - Просмотр списка всех клиентов
  - Поиск по имени, email, телефону
  - Просмотр детальной информации о клиенте
  - История заказов клиента
  - Контактная информация (email, телефон, адрес, telegram, whatsapp)
  - Статусы клиентов (active, inactive, blocked, pending)

### 4. Ролевая модель
- **Роли**:
  - `admin` - полный доступ
  - `manager` - управление товарами, заказами, клиентами
  - `content` - управление только товарами
  - `user` - обычный пользователь

### 5. JWT авторизация
- Генерация JWT токенов при входе
- Сохранение токена в localStorage
- Автоматическое добавление токена к запросам через Axios interceptor
- Проверка срока действия токена

### 6. Middleware для проверки прав
- `authenticateToken` - проверка JWT токена
- `requireRole` - проверка роли пользователя
- `logLogin` - логирование входов в систему

### 7. История входов
- **Страница**: `/admin/login-history`
- Логирование всех попыток входа
- Информация: IP адрес, User Agent, дата и время, статус

## Тестовые аккаунты

### Админ-панель:
- **Admin**: `admin@example.com` / `admin123`
- **Manager**: `manager@example.com` / `manager123`
- **Content**: `content@example.com` / `content123`

### Обычные пользователи:
- Любой email и пароль (минимум 6 символов) для регистрации

## Структура файлов

```
src/
├── pages/
│   ├── auth/
│   │   ├── Login.tsx          # Авторизация пользователей
│   │   └── Register.tsx       # Регистрация пользователей
│   └── admin/
│       ├── Clients.tsx        # Управление клиентами
│       └── LoginHistory.tsx   # История входов
├── lib/
│   ├── roles.ts              # Роли и права доступа
│   └── jwt.ts                # Утилиты для работы с JWT
├── components/
│   └── admin/
│       └── RoleProtectedRoute.tsx  # Защита маршрутов по ролям
└── contexts/
    └── AdminAuthContext.tsx   # Контекст авторизации (обновлен)

server/
├── models/
│   └── User.js               # Модель пользователя (обновлена)
└── middleware/
    └── auth.js               # Middleware для проверки прав
```

## Использование

### Frontend

#### Проверка прав доступа:
```typescript
import { hasPermission, requireRole, Role } from '@/lib/roles';

// Проверка разрешения
if (hasPermission(user.role, 'canManageProducts')) {
  // Показать кнопку управления товарами
}

// Проверка роли
if (requireRole(user.role, [Role.ADMIN, Role.MANAGER])) {
  // Доступ разрешен
}
```

#### Защита маршрутов по ролям:
```typescript
<Route 
  path="/admin/settings" 
  element={
    <RoleProtectedRoute allowedRoles={[Role.ADMIN]}>
      <Settings />
    </RoleProtectedRoute>
  } 
/>
```

### Backend

#### Использование middleware:
```javascript
const { authenticateToken, requireRole, logLogin } = require('./middleware/auth');

// Защита маршрута с проверкой токена
router.get('/admin/products', authenticateToken, getProducts);

// Защита маршрута с проверкой роли
router.post('/admin/users', 
  authenticateToken, 
  requireRole('admin'), 
  createUser
);

// Логирование входа
router.post('/admin/login', 
  authenticateToken, 
  logLogin,
  (req, res) => {
    // Логика входа
  }
);
```

## Следующие шаги

1. Подключить реальный API для регистрации и авторизации
2. Реализовать восстановление пароля
3. Добавить email-верификацию
4. Добавить двухфакторную аутентификацию (2FA)
5. Реализовать refresh tokens
6. Добавить rate limiting для защиты от брутфорса
7. Добавить логирование действий пользователей










