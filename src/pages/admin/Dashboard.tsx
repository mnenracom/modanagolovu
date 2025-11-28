import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, ShoppingCart, Users, TrendingUp, Store, AlertTriangle, MessageSquare, ArrowRight, Globe, BarChart3 } from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import { marketplaceService, MarketplaceSales } from '@/services/marketplaceService';
import { priceRulesService } from '@/services/priceRulesService';
import { reviewsService } from '@/services/reviewsService';
import { analyticsService } from '@/services/analyticsService';
import { PriceRule } from '@/types/priceRule';
import { AutoPriceService, PriceCheckResult } from '@/services/autoPriceService';
import { PageViewStats } from '@/types/analytics';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [marketplaceSales, setMarketplaceSales] = useState<MarketplaceSales[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);
  const [lowPriceProducts, setLowPriceProducts] = useState<PriceRule[]>([]);
  const [lowPriceLoading, setLowPriceLoading] = useState(true);
  const [priceCheckResults, setPriceCheckResults] = useState<PriceCheckResult[]>([]);
  const [priceCheckLoading, setPriceCheckLoading] = useState(true);
  const [newReviewsCount, setNewReviewsCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [pageViewsStats, setPageViewsStats] = useState<PageViewStats[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        setStats({
          totalProducts: 0,
          totalOrders: 0,
          totalUsers: 0,
          revenue: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchMarketplaceData = async () => {
      try {
        setMarketplaceLoading(true);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const salesData = await marketplaceService.getSales({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });
        setMarketplaceSales(salesData || []);
      } catch (error: any) {
        if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
          console.error('Ошибка загрузки данных маркетплейсов:', error);
        }
        setMarketplaceSales([]);
      } finally {
        setMarketplaceLoading(false);
      }
    };
    fetchMarketplaceData();
  }, []);

  useEffect(() => {
    const fetchPriceIssues = async () => {
      try {
        setPriceCheckLoading(true);
        
        // Загружаем настройки маркетплейсов
        const settings = await marketplaceService.getAllSettings();
        const priceSettings = await marketplaceService.getPriceSettings();
        
        // Проверяем цены для всех активных аккаунтов
        const allResults: PriceCheckResult[] = [];
        
        for (const setting of settings) {
          if (!setting.isActive) continue;
          
          // Находим соответствующую настройку цен
          const priceSetting = priceSettings.find(
            ps => ps.marketplaceType === setting.marketplaceType && 
                  ps.accountName === setting.accountName &&
                  ps.isActive
          );
          
          if (!priceSetting) continue;
          
          try {
            const result = await AutoPriceService.checkPrices(
              setting.accountName,
              setting.marketplaceType
            );
            allResults.push(...result.results);
          } catch (error: any) {
            console.error(`Ошибка проверки цен для ${setting.accountName}:`, error);
          }
        }
        
        // Фильтруем товары с проблемами: ниже минимума или ниже рекомендованной
        const problematicProducts = allResults.filter(
          r => r.status === 'below_min' || r.status === 'below_recommended'
        );
        
        setPriceCheckResults(problematicProducts);
        
        // Для обратной совместимости оставляем старую логику
        try {
          const rules = await priceRulesService.getAll({
            marginStatus: 'below_min',
            priceChangeNeeded: true,
          });
          const sorted = rules
            .filter(rule => rule.currentPrice && rule.currentPrice < rule.minPrice)
            .sort((a, b) => {
              const diffA = a.minPrice - (a.currentPrice || 0);
              const diffB = b.minPrice - (b.currentPrice || 0);
              return diffB - diffA;
            })
            .slice(0, 10);
          setLowPriceProducts(sorted);
        } catch (error: any) {
          if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
            console.error('Ошибка загрузки товаров с низкой ценой:', error);
          }
          setLowPriceProducts([]);
        }
      } catch (error: any) {
        console.error('Ошибка проверки цен на маркетплейсах:', error);
        setPriceCheckResults([]);
        setLowPriceProducts([]);
      } finally {
        setPriceCheckLoading(false);
        setLowPriceLoading(false);
      }
    };
    fetchPriceIssues();
  }, []);

  useEffect(() => {
    const fetchNewReviews = async () => {
      try {
        setReviewsLoading(true);
        const pendingReviews = await reviewsService.getAll({
          status: 'pending',
          limit: 1000,
        });
        setNewReviewsCount(pendingReviews?.length || 0);
      } catch (error: any) {
        if (error?.code !== '42P01' && !error?.message?.includes('does not exist')) {
          console.error('Ошибка загрузки отзывов:', error);
        }
        setNewReviewsCount(0);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchNewReviews();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        
        const analyticsData = await analyticsService.getTotalStats(
          startDate.toISOString(),
          endDate.toISOString()
        );
        setPageViewsStats(analyticsData.topPages);
        setTotalViews(analyticsData.totalViews);
        setUniqueVisitors(analyticsData.uniqueVisitors);
      } catch (error: any) {
        // Игнорируем ошибки, если таблицы/функции не созданы
        if (error?.code === '42P01' || error?.code === '42883' || 
            error?.message?.includes('does not exist') || 
            error?.message?.includes('function') || 
            error?.message?.includes('relation')) {
          // Таблицы не созданы - это нормально, просто не показываем аналитику
          console.log('Аналитика не настроена (таблицы не созданы)');
        } else {
          console.error('Ошибка загрузки аналитики:', error);
        }
        setPageViewsStats([]);
        setTotalViews(0);
        setUniqueVisitors(0);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const siteStatCards = [
    {
      title: 'Товаров',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/admin/products',
    },
    {
      title: 'Заказов',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/admin/orders',
    },
    {
      title: 'Пользователей',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/admin/clients',
    },
    {
      title: 'Выручка',
      value: `${stats.revenue.toLocaleString()} ₽`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Расчет статистики маркетплейсов
  const totalRevenue = marketplaceSales.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = marketplaceSales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0);
  const totalItemsSold = marketplaceSales.reduce((sum, s) => sum + s.itemsSold, 0);
  const wbSales = marketplaceSales.filter(s => s.marketplaceType === 'wildberries');
  const ozonSales = marketplaceSales.filter(s => s.marketplaceType === 'ozon');
  const wbProfit = wbSales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0);
  const ozonProfit = ozonSales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0);

  return (
    <div className="space-y-6 p-6">
      {/* Заголовок */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-sm text-gray-600 mt-1">Обзор статистики и метрик</p>
      </div>

      {/* Основной контент в две колонки */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========== ЛЕВАЯ КОЛОНКА: СТАТИСТИКА САЙТА ========== */}
        <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Статистика сайта</h2>
        </div>

        {/* Основные метрики сайта */}
        <div className="grid grid-cols-2 gap-3">
          {siteStatCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} to={stat.link || '#'} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-1">{stat.title}</p>
                        <p className="text-xl font-bold">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Аналитика сайта */}
        {!analyticsLoading && (totalViews > 0 || pageViewsStats.length > 0) && (
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold">Аналитика сайта</CardTitle>
                  <CardDescription className="text-xs">За последние 7 дней</CardDescription>
                </div>
                <Link to="/admin/analytics">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Подробнее
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Просмотров</p>
                  <p className="text-lg font-bold text-blue-600">{totalViews.toLocaleString('ru-RU')}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded border border-purple-200">
                  <p className="text-xs text-gray-600 mb-0.5">Уникальных посетителей</p>
                  <p className="text-lg font-bold text-purple-600">{uniqueVisitors.toLocaleString('ru-RU')}</p>
                </div>
              </div>
              
              {pageViewsStats.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium mb-2 text-gray-600">Популярные страницы:</p>
                  <div className="space-y-1">
                    {pageViewsStats.slice(0, 5).map((stat, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                        <span className="truncate flex-1">{stat.pageTitle || stat.pagePath}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-gray-600">{stat.viewsCount} просмотров</span>
                          <Badge variant="outline" className="text-[10px]">{stat.uniqueVisitors} уник.</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Новые отзывы (сайт) */}
        <Card className={newReviewsCount > 0 ? 'border-blue-200 bg-blue-50' : 'border-blue-200'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className={`h-4 w-4 ${newReviewsCount > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                <CardTitle className="text-sm font-semibold">Новые отзывы</CardTitle>
              </div>
              {newReviewsCount > 0 && (
                <Badge variant="default" className="text-xs bg-blue-600">
                  {newReviewsCount}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {reviewsLoading ? (
              <div className="text-xs text-gray-500">Загрузка...</div>
            ) : newReviewsCount > 0 ? (
              <div className="space-y-2">
                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-blue-600 mb-1">{newReviewsCount}</p>
                  <p className="text-xs text-gray-600">отзывов на модерации</p>
                </div>
                <Link to="/admin/reviews?status=pending">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Перейти к модерации
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-xs text-gray-500 text-center py-2">
                Нет новых отзывов
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* ========== ПРАВАЯ КОЛОНКА: МАРКЕТПЛЕЙСЫ ========== */}
        <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900">Маркетплейсы</h2>
        </div>

        {/* Товары с проблемами цен (маркетплейсы) */}
        <Card className={priceCheckResults.length > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${priceCheckResults.length > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                <CardTitle className="text-sm font-semibold">
                  {priceCheckResults.length > 0 
                    ? 'Проблемы с ценами на маркетплейсах'
                    : 'Все цены в норме'}
                </CardTitle>
              </div>
              {priceCheckResults.length > 0 && (
                <Badge variant={priceCheckResults.some(r => r.status === 'below_min') ? 'destructive' : 'default'} className="text-xs">
                  {priceCheckResults.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {priceCheckLoading ? (
              <div className="text-xs text-gray-500">Загрузка...</div>
            ) : priceCheckResults.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {priceCheckResults
                    .sort((a, b) => {
                      // Сначала ниже минимума, потом ниже рекомендованной
                      if (a.status === 'below_min' && b.status !== 'below_min') return -1;
                      if (a.status !== 'below_min' && b.status === 'below_min') return 1;
                      return 0;
                    })
                    .slice(0, 5)
                    .map((result) => {
                      const isBelowMin = result.status === 'below_min';
                      const diff = isBelowMin 
                        ? (result.minPrice - result.currentWbPrice)
                        : (result.recommendedPrice - result.currentWbPrice);
                      const diffPercent = isBelowMin
                        ? ((diff / result.minPrice) * 100).toFixed(1)
                        : ((diff / result.recommendedPrice) * 100).toFixed(1);
                      const targetPrice = isBelowMin ? result.minPrice : result.recommendedPrice;
                      
                      return (
                        <div key={result.productId} className={`flex items-center justify-between p-2 bg-white rounded border text-xs ${
                          isBelowMin ? 'border-red-200' : 'border-yellow-200'
                        }`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.productName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge 
                                variant={isBelowMin ? 'destructive' : 'default'} 
                                className={`text-[10px] px-1.5 py-0 ${isBelowMin ? '' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                              >
                                {isBelowMin ? 'Ниже минимума' : 'Ниже рекомендованной'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {result.marketplaceType === 'wildberries' ? 'WB' : 'OZON'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className={`font-semibold ${isBelowMin ? 'text-red-600' : 'text-yellow-600'}`}>
                              {result.currentWbPrice.toFixed(0)} ₽
                            </p>
                            <p className="text-gray-500 text-[10px]">
                              {isBelowMin ? 'мин' : 'рек'}: {targetPrice.toFixed(0)} ₽
                            </p>
                            <p className={`text-[10px] font-medium ${isBelowMin ? 'text-red-600' : 'text-yellow-600'}`}>
                              -{diffPercent}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {priceCheckResults.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-1">
                    и еще {priceCheckResults.length - 5} товаров
                  </p>
                )}
                <Link to="/admin/marketplace/prices">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Управление ценами
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-xs text-green-600 text-center py-2 font-medium">
                Все цены в норме
              </div>
            )}
          </CardContent>
        </Card>

        {/* Статистика маркетплейсов */}
        {!marketplaceLoading && marketplaceSales.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Store className="h-4 w-4 text-red-600" />
                    Статистика маркетплейсов
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">За последние 7 дней</CardDescription>
                </div>
                <Link to="/admin/marketplace/dashboard">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Подробнее
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-gray-600 mb-0.5">Прибыль</p>
                  <p className="text-lg font-bold text-green-600">{totalProfit.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5">Продано</p>
                  <p className="text-lg font-bold text-blue-600">{totalItemsSold} шт</p>
                </div>
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-gray-600 mb-0.5 flex items-center gap-1">
                    <Badge variant="default" className="w-[40px] justify-center bg-red-600 text-white text-[10px] px-1">WB</Badge>
                    WildBerries
                  </p>
                  <p className="text-lg font-bold text-red-600">{wbProfit.toLocaleString('ru-RU')} ₽</p>
                </div>
                <div className="p-2 bg-purple-50 rounded border border-purple-200">
                  <p className="text-xs text-gray-600 mb-0.5 flex items-center gap-1">
                    <Badge className="w-[40px] justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] px-1">OZON</Badge>
                    OZON
                  </p>
                  <p className="text-lg font-bold text-purple-600">{ozonProfit.toLocaleString('ru-RU')} ₽</p>
                </div>
              </div>
              
              {/* Последние дни */}
              {marketplaceSales.slice(0, 3).length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-1.5 text-gray-600">Последние дни:</p>
                  <div className="space-y-1">
                    {marketplaceSales
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 3)
                      .map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            {sale.marketplaceType === 'wildberries' ? (
                              <Badge variant="default" className="w-[35px] justify-center bg-red-600 text-white text-[10px] px-1">WB</Badge>
                            ) : (
                              <Badge className="w-[35px] justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-[10px] px-1">OZ</Badge>
                            )}
                            <span className="text-gray-600">{new Date(sale.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                            <span className="text-gray-400 truncate max-w-[100px]">{sale.accountName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{sale.itemsSold} шт</span>
                            <span className="font-semibold text-green-600">{(sale.profit || sale.netRevenue || 0).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
        <Link to="/admin/products">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs font-medium">Товары</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-3 text-center">
              <ShoppingCart className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs font-medium">Заказы</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/reviews">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-3 text-center">
              <MessageSquare className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <p className="text-xs font-medium">Отзывы</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/admin/marketplace/prices">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs font-medium">Цены</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
