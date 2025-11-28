export interface PriceRule {
  id: number;
  sku: string;
  barcode?: string;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  minPrice: number;
  maxPrice: number;
  costPrice: number;
  targetMarginPercent: number;
  currentPrice?: number;
  competitorMinPrice?: number;
  competitorAvgPrice?: number;
  competitorMaxPrice?: number;
  marginStatus: 'ok' | 'low_margin' | 'below_min' | 'above_max' | 'no_competitors';
  calculatedMargin?: number;
  calculatedProfit?: number;
  recommendedPrice?: number;
  priceChangeNeeded: boolean;
  productName?: string;
  category?: string;
  notes?: string;
  marketplaceProductId?: string;
  lastCheckedAt?: string;
  lastUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceRuleFormData {
  sku: string;
  barcode?: string;
  marketplaceType: 'wildberries' | 'ozon';
  accountName: string;
  minPrice: number;
  maxPrice: number;
  costPrice: number;
  targetMarginPercent?: number;
  productName?: string;
  category?: string;
  notes?: string;
}

export interface ExcelPriceData {
  sku: string;
  barcode?: string;
  minPrice: number;
  maxPrice: number;
  costPrice: number;
  targetMarginPercent?: number;
  productName?: string;
  category?: string;
  marketplaceType?: 'wildberries' | 'ozon';
  accountName?: string;
}




