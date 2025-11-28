import { Product } from '@/types/product';
import categoryScarves from '@/assets/category-scarves.jpg';
import categoryBandanas from '@/assets/category-bandanas.jpg';
import categoryCapor from '@/assets/category-capor.jpg';
import categoryKosinka from '@/assets/category-kosinka.jpg';

export const products: Product[] = [
  {
    id: '1',
    name: 'Шелковый платок "Бордо"',
    category: 'scarves',
    description: 'Роскошный шелковый платок премиум качества',
    image: categoryScarves,
    images: [categoryScarves, categoryScarves, categoryScarves],
    priceRanges: [
      { minQuantity: 10, maxQuantity: 49, price: 450 },
      { minQuantity: 50, maxQuantity: 99, price: 420 },
      { minQuantity: 100, maxQuantity: null, price: 380 },
    ],
    colors: ['Бордовый', 'Золотой', 'Черный', 'Синий'],
    sizes: ['70x70', '90x90'],
    material: 'Натуральный шелк',
    inStock: true,
  },
  {
    id: '2',
    name: 'Бандана классическая',
    category: 'bandanas',
    description: 'Яркие банданы из качественного хлопка',
    image: categoryBandanas,
    images: [categoryBandanas, categoryBandanas, categoryBandanas],
    priceRanges: [
      { minQuantity: 20, maxQuantity: 99, price: 180 },
      { minQuantity: 100, maxQuantity: 249, price: 160 },
      { minQuantity: 250, maxQuantity: null, price: 140 },
    ],
    colors: ['Красный', 'Синий', 'Желтый', 'Зеленый', 'Розовый'],
    sizes: ['55x55'],
    material: 'Хлопок 100%',
    inStock: true,
  },
  {
    id: '3',
    name: 'Капор зимний',
    category: 'capor',
    description: 'Теплый зимний капор из шерсти',
    image: categoryCapor,
    images: [categoryCapor, categoryCapor, categoryCapor],
    priceRanges: [
      { minQuantity: 10, maxQuantity: 29, price: 890 },
      { minQuantity: 30, maxQuantity: 59, price: 850 },
      { minQuantity: 60, maxQuantity: null, price: 790 },
    ],
    colors: ['Бордовый', 'Черный', 'Серый'],
    sizes: ['Универсальный'],
    material: 'Шерсть 80%, акрил 20%',
    inStock: true,
  },
  {
    id: '4',
    name: 'Косынка народная',
    category: 'kosinka',
    description: 'Традиционная косынка с узором',
    image: categoryKosinka,
    images: [categoryKosinka, categoryKosinka, categoryKosinka],
    priceRanges: [
      { minQuantity: 15, maxQuantity: 49, price: 320 },
      { minQuantity: 50, maxQuantity: 99, price: 290 },
      { minQuantity: 100, maxQuantity: null, price: 260 },
    ],
    colors: ['Красный', 'Синий', 'Бежевый', 'Зеленый'],
    sizes: ['80x80', '90x90'],
    material: 'Вискоза',
    inStock: true,
  },
  {
    id: '5',
    name: 'Шелковый платок "Элегант"',
    category: 'scarves',
    description: 'Изысканный платок с принтом',
    image: categoryScarves,
    images: [categoryScarves, categoryScarves, categoryScarves],
    priceRanges: [
      { minQuantity: 10, maxQuantity: 49, price: 480 },
      { minQuantity: 50, maxQuantity: 99, price: 450 },
      { minQuantity: 100, maxQuantity: null, price: 410 },
    ],
    colors: ['Черный', 'Изумрудный', 'Фиолетовый'],
    sizes: ['90x90'],
    material: 'Натуральный шелк',
    inStock: true,
  },
  {
    id: '6',
    name: 'Бандана спортивная',
    category: 'bandanas',
    description: 'Функциональная бандана для активного отдыха',
    image: categoryBandanas,
    images: [categoryBandanas, categoryBandanas, categoryBandanas],
    priceRanges: [
      { minQuantity: 20, maxQuantity: 99, price: 200 },
      { minQuantity: 100, maxQuantity: 249, price: 180 },
      { minQuantity: 250, maxQuantity: null, price: 160 },
    ],
    colors: ['Черный', 'Камуфляж', 'Оранжевый'],
    sizes: ['55x55'],
    material: 'Микрофибра',
    inStock: true,
  },
];

export const getCategoryName = (category: string): string => {
  const names: Record<string, string> = {
    scarves: 'Платки на голову',
    bandanas: 'Банданы',
    capor: 'Капор',
    kosinka: 'Косынки',
  };
  return names[category] || category;
};
