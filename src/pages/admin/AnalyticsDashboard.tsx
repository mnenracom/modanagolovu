import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Percent,
  Package,
  BarChart3,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const AnalyticsDashboard = () => {
  const [datePreset, setDatePreset] = useState<string>('all');
  const { 
    orderTypeStats, 
    conversionStats, 
    economyStats, 
    revenueByType,
    loading,
    error,
    refresh,
    setDateRange,
  } = useAnalytics();

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    let start: Date;

    switch (preset) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        setDateRange({
          start: start.toISOString(),
          end: new Date().toISOString(),
        });
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setDateRange({
          start: start.toISOString(),
          end: new Date().toISOString(),
        });
        break;
      case 'month':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setDateRange({
          start: start.toISOString(),
          end: new Date().toISOString(),
        });
        break;
      case 'year':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        setDateRange({
          start: start.toISOString(),
          end: new Date().toISOString(),
        });
        break;
      default:
        setDateRange(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Ошибка загрузки аналитики: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Аналитика Dual-цен</h1>
          <p className="text-gray-600 mt-2">Статистика по розничным и оптовым заказам</p>
        </div>
        <div className="flex gap-2">
          <Select value={datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все время</SelectItem>
              <SelectItem value="today">Сегодня</SelectItem>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Статистика по типам заказов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Розничных заказов</CardTitle>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderTypeStats?.retail.count || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Средний чек: {orderTypeStats?.retail.averageOrder ? `${orderTypeStats.retail.averageOrder.toLocaleString()} ₽` : '₽'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Оптовых заказов</CardTitle>
            <Package className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderTypeStats?.wholesale.count || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Средний чек: {orderTypeStats?.wholesale.averageOrder ? `${orderTypeStats.wholesale.averageOrder.toLocaleString()} ₽` : '₽'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Конверсия в опт</CardTitle>
            <Percent className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionStats?.conversionRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {conversionStats?.wholesaleOrders || 0} из {conversionStats?.totalVisitors || 0} заказов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Средняя экономия</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{economyStats?.averageEconomy ? `${economyStats.averageEconomy.toLocaleString()} ₽` : '₽'}</div>
            <p className="text-xs text-gray-500 mt-1">
              {economyStats?.averageEconomyPercent.toFixed(1) || 0}% на заказ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Выручка по типам */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Выручка по типам заказов</CardTitle>
            <CardDescription>Распределение выручки между розницей и оптом</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Розница</span>
                  <span className="text-sm font-bold">
                    {revenueByType?.retail ? `${revenueByType.retail.toLocaleString()} ₽` : '₽'} ({revenueByType?.retailPercent.toFixed(1) || 0}%)
                  </span>
                </div>
                <Progress value={revenueByType?.retailPercent || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Опт</span>
                  <span className="text-sm font-bold">
                    {revenueByType?.wholesale ? `${revenueByType.wholesale.toLocaleString()} ₽` : '₽'} ({revenueByType?.wholesalePercent.toFixed(1) || 0}%)
                  </span>
                </div>
                <Progress value={revenueByType?.wholesalePercent || 0} className="h-2" />
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Итого</span>
                  <span className="text-lg font-bold">{revenueByType?.total ? `${revenueByType.total.toLocaleString()} ₽` : '₽'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Экономия клиентов</CardTitle>
            <CardDescription>Общая экономия от оптовых цен</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {economyStats?.totalEconomy ? `${economyStats.totalEconomy.toLocaleString()} ₽` : '₽'}
                </div>
                <p className="text-sm text-gray-500 mt-2">Общая экономия</p>
              </div>
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Средняя экономия</p>
                    <p className="text-xl font-bold">{economyStats?.averageEconomy ? `${economyStats.averageEconomy.toLocaleString()} ₽` : '₽'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Оптовых заказов</p>
                    <p className="text-xl font-bold">{economyStats?.totalWholesaleOrders || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Розничные заказы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Количество</span>
                <span className="font-bold">{orderTypeStats?.retail.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Выручка</span>
                <span className="font-bold">{orderTypeStats?.retail.revenue ? `${orderTypeStats.retail.revenue.toLocaleString()} ₽` : '₽'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Средний чек</span>
                <span className="font-bold">{orderTypeStats?.retail.averageOrder ? `${orderTypeStats.retail.averageOrder.toLocaleString()} ₽` : '₽'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Оптовые заказы</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Количество</span>
                <span className="font-bold">{orderTypeStats?.wholesale.count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Выручка</span>
                <span className="font-bold">{orderTypeStats?.wholesale.revenue ? `${orderTypeStats.wholesale.revenue.toLocaleString()} ₽` : '₽'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Средний чек</span>
                <span className="font-bold">{orderTypeStats?.wholesale.averageOrder ? `${orderTypeStats.wholesale.averageOrder.toLocaleString()} ₽` : '₽'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Конверсия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">В опт</span>
                <span className="font-bold">{conversionStats?.conversionRate.toFixed(1) || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Розница → Опт</span>
                <span className="font-bold">{conversionStats?.retailToWholesaleConversion.toFixed(1) || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Всего заказов</span>
                <span className="font-bold">{conversionStats?.totalVisitors || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

