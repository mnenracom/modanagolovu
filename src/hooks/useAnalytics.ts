import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '@/services/analyticsService';
import type {
  OrderTypeStats,
  ConversionStats,
  EconomyStats,
  RevenueByType,
  PriceStrategyEffectiveness,
  ThresholdAnalysis,
  TopProductsByWholesale,
  ABTestResult,
} from '@/services/analyticsService';

interface DateRange {
  start: string;
  end: string;
}

interface UseAnalyticsReturn {
  // Данные
  orderTypeStats: OrderTypeStats | null;
  conversionStats: ConversionStats | null;
  economyStats: EconomyStats | null;
  revenueByType: RevenueByType | null;
  priceStrategyEffectiveness: PriceStrategyEffectiveness | null;
  thresholdAnalysis: ThresholdAnalysis | null;
  topProductsByWholesale: TopProductsByWholesale[];
  abTestResults: ABTestResult[];

  // Состояние
  loading: boolean;
  error: string | null;

  // Методы
  refresh: () => Promise<void>;
  setDateRange: (range: DateRange | null) => void;
  dateRange: DateRange | null;
}

export const useAnalytics = (initialDateRange?: DateRange): UseAnalyticsReturn => {
  const [orderTypeStats, setOrderTypeStats] = useState<OrderTypeStats | null>(null);
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null);
  const [revenueByType, setRevenueByType] = useState<RevenueByType | null>(null);
  const [priceStrategyEffectiveness, setPriceStrategyEffectiveness] = useState<PriceStrategyEffectiveness | null>(null);
  const [thresholdAnalysis, setThresholdAnalysis] = useState<ThresholdAnalysis | null>(null);
  const [topProductsByWholesale, setTopProductsByWholesale] = useState<TopProductsByWholesale[]>([]);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(initialDateRange || null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем все данные параллельно
      const [
        orderStats,
        conversion,
        economy,
        revenue,
        strategy,
        thresholds,
        topProducts,
        abTests,
      ] = await Promise.all([
        analyticsService.getOrderTypeStats(dateRange || undefined),
        analyticsService.getConversionStats(dateRange || undefined),
        analyticsService.getEconomyStats(dateRange || undefined),
        analyticsService.getRevenueByType(dateRange || undefined),
        analyticsService.getPriceStrategyEffectiveness(),
        analyticsService.getThresholdAnalysis(),
        analyticsService.getTopProductsByWholesale(10),
        analyticsService.getABTestResults(),
      ]);

      setOrderTypeStats(orderStats);
      setConversionStats(conversion);
      setEconomyStats(economy);
      setRevenueByType(revenue);
      setPriceStrategyEffectiveness(strategy);
      setThresholdAnalysis(thresholds);
      setTopProductsByWholesale(topProducts);
      setAbTestResults(abTests);
    } catch (err: any) {
      console.error('Ошибка загрузки аналитики:', err);
      setError(err.message || 'Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    orderTypeStats,
    conversionStats,
    economyStats,
    revenueByType,
    priceStrategyEffectiveness,
    thresholdAnalysis,
    topProductsByWholesale,
    abTestResults,
    loading,
    error,
    refresh: loadData,
    setDateRange,
    dateRange,
  };
};


