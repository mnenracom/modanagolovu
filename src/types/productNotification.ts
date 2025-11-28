export interface ProductNotification {
  id: number;
  userId?: string;
  productId: number;
  email: string;
  telegramChatId?: number;
  isActive: boolean;
  notifiedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductNotificationFormData {
  productId: number;
  email: string;
  telegramChatId?: number;
}




