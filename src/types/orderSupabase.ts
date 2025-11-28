// Типы для работы с заказами в Supabase (snake_case)
import { OrderStatus } from './order';

export interface OrderItemSupabase {
  product_id: number;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
  variation_id?: string;
  product_snapshot?: {
    name: string;
    image: string;
    sku?: string;
  };
}

export interface OrderHistoryEntrySupabase {
  id: string;
  status: OrderStatus;
  comment?: string | null;
  changed_by: string;
  changed_by_name?: string | null;
  previous_status?: OrderStatus | null;
  timestamp: string;
}

export interface OrderSupabase {
  id: number;
  order_number: string;
  user_id?: number | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_telegram?: string | null;
  customer_whatsapp?: string | null;
  items: OrderItemSupabase[];
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total_amount: number;
  status: OrderStatus;
  payment_method?: string | null;
  payment_status?: string | null;
  shipping_method?: string | null;
  tracking_number?: string | null;
  delivery_service_id?: number | null;
  delivery_status?: string | null;
  delivery_history?: any[] | null;
  delivery_status_updated_at?: string | null;
  payment_gateway_id?: number | null;
  payment_external_id?: string | null;
  payment_url?: string | null;
  notes?: string | null;
  history: OrderHistoryEntrySupabase[];
  // Новые поля для типов заказов
  order_type?: 'retail' | 'wholesale' | null; // Тип заказа: розница или опт
  original_total?: number | null; // Оригинальная сумма до скидок
  final_total?: number | null; // Итоговая сумма после всех скидок
  economy_amount?: number | null; // Сумма экономии
  created_at: string;
  updated_at?: string | null;
}

// Функция для преобразования Supabase формата в клиентский
export const transformOrderFromSupabase = (order: OrderSupabase) => {
  return {
    id: order.id.toString(),
    orderNumber: order.order_number,
    userId: order.user_id?.toString(),
    customer: {
      name: order.customer_name,
      email: order.customer_email || '',
      phone: order.customer_phone || '',
      address: order.customer_address || '',
      telegram: order.customer_telegram,
      whatsapp: order.customer_whatsapp,
    },
    items: order.items.map((item) => ({
      product: {
        id: item.product_id.toString(),
        name: item.product_snapshot?.name || '',
        category: 'scarves' as const,
        description: '',
        image: item.product_snapshot?.image || '',
        priceRanges: [{ minQuantity: 1, maxQuantity: null, price: item.price }],
        colors: [],
        sizes: [],
        material: '',
        inStock: true,
      },
      quantity: item.quantity,
      price: item.price,
      color: item.color,
      size: item.size,
      variationId: item.variation_id,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    discount: order.discount,
    total: order.total_amount,
    status: order.status,
    paymentMethod: (order.payment_method || 'online') as 'online' | 'invoice' | 'cash',
    paymentStatus: (order.payment_status || 'pending') as 'pending' | 'paid' | 'failed' | 'refunded',
    shippingMethod: (order.shipping_method || 'delivery') as 'pickup' | 'delivery' | 'courier',
    trackingNumber: order.tracking_number,
    deliveryServiceId: order.delivery_service_id,
    deliveryStatus: order.delivery_status,
    deliveryHistory: order.delivery_history || [],
    paymentGatewayId: order.payment_gateway_id,
    paymentExternalId: order.payment_external_id,
    paymentUrl: order.payment_url,
    notes: order.notes,
    history: order.history.map((entry) => ({
      id: entry.id,
      status: entry.status,
      comment: entry.comment || undefined,
      changedBy: entry.changed_by,
      changedByName: entry.changed_by_name || undefined,
      previousStatus: entry.previous_status,
      timestamp: entry.timestamp,
    })),
    // Новые поля для типов заказов
    orderType: (order.order_type || 'retail') as 'retail' | 'wholesale',
    originalTotal: order.original_total ?? order.subtotal + order.shipping_cost,
    finalTotal: order.final_total ?? order.total_amount,
    economyAmount: order.economy_amount ?? order.discount,
    createdAt: order.created_at,
    updatedAt: order.updated_at || order.created_at,
  };
};

// Функция для преобразования клиентского формата в Supabase
export const transformOrderToSupabase = (order: any) => {
  return {
    user_id: order.userId ? parseInt(order.userId) : null,
    customer_name: order.customer.name,
    customer_email: order.customer.email || null,
    customer_phone: order.customer.phone || null,
    customer_address: order.customer.address || null,
    customer_telegram: order.customer.telegram || null,
    customer_whatsapp: order.customer.whatsapp || null,
    items: order.items.map((item: any) => ({
      product_id: parseInt(item.product.id),
      quantity: item.quantity,
      price: item.price,
      color: item.color || null,
      size: item.size || null,
      variation_id: item.variationId || null,
      product_snapshot: item.product.productSnapshot || {
        name: item.product.name,
        image: item.product.image,
        sku: item.product.sku,
      },
    })),
    subtotal: order.subtotal,
    shipping_cost: order.shippingCost || 0,
    discount: order.discount || 0,
    total_amount: order.total,
    status: order.status || 'pending',
    payment_method: order.paymentMethod || null,
    payment_status: order.paymentStatus || 'pending',
    shipping_method: order.shippingMethod || null,
    tracking_number: order.trackingNumber || null,
    notes: order.notes || null,
    // Новые поля для типов заказов
    order_type: order.orderType || (order.total >= 5000 ? 'wholesale' : 'retail'),
    original_total: order.originalTotal ?? (order.subtotal + (order.shippingCost || 0)),
    final_total: order.finalTotal ?? order.total,
    economy_amount: order.economyAmount ?? (order.discount || 0),
  };
};






