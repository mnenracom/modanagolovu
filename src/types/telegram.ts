export interface TelegramSettings {
  id: number;
  botToken: string;
  botName?: string;
  isActive: boolean;
  notifyLowPrice: boolean;
  notifyNewOrder: boolean;
  notifyNewReview: boolean;
  notifyNewQuestion: boolean;
  notifyMarketplaceSync: boolean;
  notifyErrors: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramChat {
  id: number;
  chatId: number;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  chatTitle?: string;
  username?: string;
  isActive: boolean;
  notifyLowPrice: boolean;
  notifyNewOrder: boolean;
  notifyNewReview: boolean;
  notifyNewQuestion: boolean;
  notifyMarketplaceSync: boolean;
  notifyErrors: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramNotification {
  type: 'low_price' | 'new_order' | 'new_review' | 'new_question' | 'marketplace_sync' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}




