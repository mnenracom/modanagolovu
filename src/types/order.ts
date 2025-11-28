import { Product } from './product';

export type OrderStatus = 
  | 'pending'      // Ожидает обработки
  | 'processing'   // В обработке
  | 'confirmed'    // Подтвержден
  | 'preparing'    // Готовится
  | 'shipped'      // Отправлен
  | 'delivered'    // Доставлен
  | 'cancelled'    // Отменен
  | 'refunded';    // Возвращен

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number; // Цена на момент заказа
  color?: string;
  size?: string;
  variationId?: string;
}

export interface OrderHistoryEntry {
  id: string;
  status: OrderStatus;
  comment?: string;
  changedBy: string; // ID пользователя
  changedByName?: string;
  timestamp: string;
  previousStatus?: OrderStatus;
}

export interface Order {
  id: string;
  orderNumber: string; // Номер заказа
  userId?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    telegram?: string;
    whatsapp?: string;
  };
  items: OrderItem[];
  subtotal: number; // Сумма без доставки
  shippingCost: number; // Стоимость доставки
  discount: number; // Скидка
  total: number; // Итоговая сумма
  status: OrderStatus;
  paymentMethod: 'online' | 'invoice' | 'cash';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingMethod: 'pickup' | 'delivery' | 'courier';
  trackingNumber?: string;
  deliveryServiceId?: number;
  deliveryStatus?: string;
  deliveryHistory?: any[];
  paymentGatewayId?: number;
  paymentExternalId?: string;
  paymentUrl?: string;
  notes?: string;
  history: OrderHistoryEntry[];
  // Новые поля для типов заказов
  orderType?: 'retail' | 'wholesale'; // Тип заказа: розница или опт
  originalTotal?: number; // Оригинальная сумма до скидок
  finalTotal?: number; // Итоговая сумма после всех скидок
  economyAmount?: number; // Сумма экономии
  createdAt: string;
  updatedAt: string;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Ожидает обработки',
  processing: 'В обработке',
  confirmed: 'Подтвержден',
  preparing: 'Готовится',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
  refunded: 'Возвращен',
};

export const orderStatusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  preparing: 'bg-purple-100 text-purple-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-600 text-white',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};






