export interface DeliveryService {
  id: number;
  name: string;
  code: string;
  type?: string;
  isActive: boolean;
  isEnabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  accountId?: string;
  senderCityId?: string;
  senderAddress?: string;
  apiUrl?: string;
  webhookUrl?: string;
  deliveryTypes?: string[];
  calculateCost: boolean;
  defaultCost?: number;
  freeDeliveryThreshold?: number;
  trackingEnabled: boolean;
  trackingApiEndpoint?: string;
  trackingUpdateInterval?: number;
  statusMapping?: Record<string, string>;
  settings?: Record<string, any>;
  description?: string;
  iconUrl?: string;
  websiteUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGateway {
  id: number;
  name: string;
  code: string;
  type: 'bank_card' | 'bank_transfer' | 'ewallet' | 'crypto';
  isActive: boolean;
  isEnabled: boolean;
  apiKey?: string;
  secretKey?: string;
  shopId?: string;
  terminalKey?: string;
  apiUrl?: string;
  webhookUrl?: string;
  returnUrl?: string;
  failUrl?: string;
  minAmount?: number;
  maxAmount?: number;
  commissionPercent?: number;
  commissionFixed?: number;
  currencies?: string[];
  displayName?: string;
  description?: string;
  iconUrl?: string;
  logoUrl?: string;
  settings?: Record<string, any>;
  testMode: boolean;
  testApiKey?: string;
  testSecretKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStatus {
  status: string;
  timestamp: string;
  location?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface OrderTracking {
  orderNumber: string;
  trackingNumber?: string;
  deliveryService?: DeliveryService;
  deliveryStatus: string;
  deliveryHistory: DeliveryStatus[];
  estimatedDelivery?: string;
  currentLocation?: string;
}




