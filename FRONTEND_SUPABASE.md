# Интеграция фронтенда с Supabase

## Обновленные компоненты

Все страницы каталога теперь загружают товары из Supabase вместо моковых данных:

### 1. **Catalog.tsx** (`/catalog`)
- ✅ Загружает все товары через `productsService.getAll()`
- ✅ Фильтрует только товары в наличии (`in_stock: true`)
- ✅ Динамически генерирует опции фильтров из данных
- ✅ Показывает индикатор загрузки

### 2. **Index.tsx** (`/`)
- ✅ Загружает последние 4 товара для секции "Новинки"
- ✅ Показывает индикатор загрузки
- ✅ Обрабатывает пустой список товаров

### 3. **CategoryPage.tsx** (`/category/:category`)
- ✅ Загружает товары по категории из Supabase
- ✅ Фильтрует только товары в наличии
- ✅ Показывает индикатор загрузки

### 4. **ProductDetail.tsx** (`/product/:id`)
- ✅ Загружает товар по ID через `productsService.getById()`
- ✅ Обрабатывает отсутствие товара
- ✅ Показывает индикатор загрузки
- ✅ Безопасно обрабатывает отсутствующие изображения

### 5. **ProductCard.tsx**
- ✅ Безопасно обрабатывает отсутствующие изображения
- ✅ Обрабатывает пустые массивы `priceRanges`
- ✅ Показывает placeholder при отсутствии изображения

## Как это работает

### Загрузка данных
```typescript
// Все страницы используют один подход:
useEffect(() => {
  const loadProducts = async () => {
    const { data } = await productsService.getAll({
      in_stock: true, // Только в наличии
      category: 'scarves', // Опционально
    });
    
    const transformedProducts = data.map(transformProductFromSupabase);
    setProducts(transformedProducts);
  };
  loadProducts();
}, []);
```

### Трансформация данных
- Данные из Supabase (snake_case) → Клиентский формат (camelCase)
- `price_ranges` → `priceRanges`
- `in_stock` → `inStock`
- `stock_quantity` → `stock`

## Проверка работы

1. **Создайте товары в админ-панели** (`/admin/products`)
2. **Проверьте отображение:**
   - Главная страница (`/`) - должны быть видны последние 4 товара
   - Каталог (`/catalog`) - все товары
   - Страница категории (`/category/scarves`) - товары категории
   - Страница товара (`/product/:id`) - детальная информация

## Важные замечания

1. **Изображения**: Убедитесь, что изображения загружены в Supabase Storage и доступны публично
2. **Только в наличии**: На фронтенде показываются только товары с `in_stock: true`
3. **Обработка ошибок**: Все компоненты безопасно обрабатывают отсутствие данных

## Структура данных

### Товар из Supabase:
```typescript
{
  id: number,
  name: string,
  description: string,
  price: number,
  wholesale_price: number,
  category: string,
  images: string[],
  colors: string[],
  sizes: string[],
  material: string,
  in_stock: boolean,
  stock_quantity: number,
  price_ranges: PriceRange[],
  // ...
}
```

### Товар на фронтенде:
```typescript
{
  id: string, // Преобразуется в строку
  name: string,
  description: string,
  image: string, // Первое изображение из массива
  images: string[], // Все изображения
  priceRanges: PriceRange[], // camelCase
  inStock: boolean, // camelCase
  // ...
}
```

## Утилиты

- `src/utils/categoryNames.ts` - утилита для получения названий категорий
- `src/types/productSupabase.ts` - типы и трансформации для Supabase
- `src/services/productsService.ts` - сервис для работы с товарами









