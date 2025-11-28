// Скрипт для добавления старых товаров в Supabase
// Запустите этот скрипт через Node.js или скопируйте данные в админ-панель

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Необходимо установить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Старые данные товаров
const oldProducts = [
  {
    name: 'Шелковый платок "Бордо"',
    category: 'scarves',
    description: 'Роскошный шелковый платок премиум качества',
    price: 450,
    wholesale_price: 450,
    images: [],
    colors: ['Бордовый', 'Золотой', 'Черный', 'Синий'],
    sizes: ['70x70', '90x90'],
    material: 'Натуральный шелк',
    in_stock: true,
    stock_quantity: 100,
    min_order_quantity: 10,
    discount: 0,
    price_ranges: [
      { min_quantity: 10, max_quantity: 49, price: 450 },
      { min_quantity: 50, max_quantity: 99, price: 420 },
      { min_quantity: 100, max_quantity: null, price: 380 },
    ],
  },
  {
    name: 'Бандана классическая',
    category: 'bandanas',
    description: 'Яркие банданы из качественного хлопка',
    price: 180,
    wholesale_price: 180,
    images: [],
    colors: ['Красный', 'Синий', 'Желтый', 'Зеленый', 'Розовый'],
    sizes: ['55x55'],
    material: 'Хлопок 100%',
    in_stock: true,
    stock_quantity: 200,
    min_order_quantity: 20,
    discount: 0,
    price_ranges: [
      { min_quantity: 20, max_quantity: 99, price: 180 },
      { min_quantity: 100, max_quantity: 249, price: 160 },
      { min_quantity: 250, max_quantity: null, price: 140 },
    ],
  },
  {
    name: 'Капор зимний',
    category: 'capor',
    description: 'Теплый зимний капор из шерсти',
    price: 890,
    wholesale_price: 890,
    images: [],
    colors: ['Бордовый', 'Черный', 'Серый'],
    sizes: ['Универсальный'],
    material: 'Шерсть 80%, акрил 20%',
    in_stock: true,
    stock_quantity: 50,
    min_order_quantity: 10,
    discount: 0,
    price_ranges: [
      { min_quantity: 10, max_quantity: 29, price: 890 },
      { min_quantity: 30, max_quantity: 59, price: 850 },
      { min_quantity: 60, max_quantity: null, price: 790 },
    ],
  },
  {
    name: 'Косынка народная',
    category: 'kosinka',
    description: 'Традиционная косынка с узором',
    price: 320,
    wholesale_price: 320,
    images: [],
    colors: ['Красный', 'Синий', 'Бежевый', 'Зеленый'],
    sizes: ['80x80', '90x90'],
    material: 'Вискоза',
    in_stock: true,
    stock_quantity: 150,
    min_order_quantity: 15,
    discount: 0,
    price_ranges: [
      { min_quantity: 15, max_quantity: 49, price: 320 },
      { min_quantity: 50, max_quantity: 99, price: 290 },
      { min_quantity: 100, max_quantity: null, price: 260 },
    ],
  },
  {
    name: 'Шелковый платок "Элегант"',
    category: 'scarves',
    description: 'Изысканный платок с принтом',
    price: 480,
    wholesale_price: 480,
    images: [],
    colors: ['Черный', 'Изумрудный', 'Фиолетовый'],
    sizes: ['90x90'],
    material: 'Натуральный шелк',
    in_stock: true,
    stock_quantity: 80,
    min_order_quantity: 10,
    discount: 0,
    price_ranges: [
      { min_quantity: 10, max_quantity: 49, price: 480 },
      { min_quantity: 50, max_quantity: 99, price: 450 },
      { min_quantity: 100, max_quantity: null, price: 410 },
    ],
  },
  {
    name: 'Бандана спортивная',
    category: 'bandanas',
    description: 'Функциональная бандана для активного отдыха',
    price: 200,
    wholesale_price: 200,
    images: [],
    colors: ['Черный', 'Камуфляж', 'Оранжевый'],
    sizes: ['55x55'],
    material: 'Микрофибра',
    in_stock: true,
    stock_quantity: 120,
    min_order_quantity: 20,
    discount: 0,
    price_ranges: [
      { min_quantity: 20, max_quantity: 99, price: 200 },
      { min_quantity: 100, max_quantity: 249, price: 180 },
      { min_quantity: 250, max_quantity: null, price: 160 },
    ],
  },
];

async function seedProducts() {
  console.log('Начинаем добавление товаров в Supabase...');

  for (const product of oldProducts) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error(`Ошибка при добавлении товара "${product.name}":`, error.message);
      } else {
        console.log(`✅ Товар "${product.name}" успешно добавлен с ID: ${data.id}`);
      }
    } catch (err: any) {
      console.error(`Критическая ошибка при добавлении товара "${product.name}":`, err.message);
    }
  }

  console.log('Готово!');
}

seedProducts();









