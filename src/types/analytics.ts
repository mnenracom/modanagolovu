export interface AnalyticsSettings {
  id: number;
  yandexMetrikaEnabled: boolean;
  yandexMetrikaCounterId?: string;
  yandexMetrikaToken?: string;
  googleAnalyticsEnabled: boolean;
  googleAnalyticsTrackingId?: string;
  googleAnalyticsMeasurementId?: string;
  googleAnalyticsApiKey?: string;
  googleAnalyticsViewId?: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PageView {
  id: number;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PageViewStats {
  pagePath: string;
  pageTitle?: string;
  viewsCount: number;
  uniqueVisitors: number;
}

export interface AnalyticsFormData {
  yandexMetrikaEnabled: boolean;
  yandexMetrikaCounterId?: string;
  yandexMetrikaToken?: string;
  googleAnalyticsEnabled: boolean;
  googleAnalyticsTrackingId?: string;
  googleAnalyticsMeasurementId?: string;
  googleAnalyticsApiKey?: string;
  googleAnalyticsViewId?: string;
}




