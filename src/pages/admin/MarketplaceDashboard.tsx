import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, TrendingUp, ShoppingCart, Package, Store, Calendar } from 'lucide-react';
import { marketplaceService, MarketplaceSales } from '@/services/marketplaceService';
import { syncAllMarketplaces } from '@/services/marketplaceSyncService';
import { Badge } from '@/components/ui/badge';

const MarketplaceDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');
  const [sales, setSales] = useState<MarketplaceSales[]>([]);
  const [settings, setSettings] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedMarketplace, selectedAccount, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем настройки
      try {
        const settingsData = await marketplaceService.getAllSettings();
        setSettings(settingsData || []);
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          setSettings([]);
        } else {
          throw error;
        }
      }

      // Вычисляем даты
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Загружаем статистику продаж
      try {
        const salesData = await marketplaceService.getSales({
          marketplaceType: selectedMarketplace !== 'all' ? selectedMarketplace as 'wildberries' | 'ozon' : undefined,
          accountName: selectedAccount !== 'all' ? selectedAccount : undefined,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });
        setSales(salesData || []);
      } catch (error: any) {
        if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
          setSales([]);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error);
      // Не показываем ошибку, если таблицы просто не созданы
      if (!error?.code || error.code !== '42P01') {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить данные',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAllMarketplaces();
      toast({
        title: 'Успешно',
        description: 'Синхронизация всех маркетплейсов завершена',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Ошибка синхронизации',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Агрегированная статистика
  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalProfit = sales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0); // Реальная прибыль
  const totalNetRevenue = sales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0); // Для обратной совместимости
  const totalOrders = sales.reduce((sum, s) => sum + s.ordersCount, 0);
  const totalItemsSold = sales.reduce((sum, s) => sum + s.itemsSold, 0); // Только реально проданные товары
  const totalCommission = sales.reduce((sum, s) => sum + s.commission, 0);
  const totalLogistics = sales.reduce((sum, s) => sum + (s.logistics || 0), 0);
  const totalStorage = sales.reduce((sum, s) => sum + (s.storage || 0), 0);
  const totalPenalties = sales.reduce((sum, s) => sum + (s.penalties || 0), 0);
  const totalReturns = sales.reduce((sum, s) => sum + (s.returns || 0), 0);
  const totalExpenses = sales.reduce((sum, s) => sum + (s.totalExpenses || s.commission || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Группировка по маркетплейсам
  const wbSales = sales.filter(s => s.marketplaceType === 'wildberries');
  const ozonSales = sales.filter(s => s.marketplaceType === 'ozon');

  const wbProfit = wbSales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0);
  const ozonProfit = ozonSales.reduce((sum, s) => sum + (s.profit || s.netRevenue || 0), 0);

  // Уникальные аккаунты
  const accounts = Array.from(new Set(settings.map(s => s.accountName)));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Дашборд маркетплейсов</h1>
          <p className="text-muted-foreground">
            Аналитика продаж с WildBerries и OZON в одном месте
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Синхронизация...' : 'Синхронизировать'}
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Маркетплейс</Label>
              <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                <SelectTrigger>
                  <SelectValue placeholder="Все маркетплейсы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все маркетплейсы</SelectItem>
                  <SelectItem value="wildberries">WildBerries</SelectItem>
                  <SelectItem value="ozon">OZON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Аккаунт</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Все аккаунты" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все аккаунты</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account} value={account}>{account}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Период</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Сегодня</SelectItem>
                  <SelectItem value="7days">7 дней</SelectItem>
                  <SelectItem value="30days">30 дней</SelectItem>
                  <SelectItem value="90days">90 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Реальная прибыль</CardTitle>
            <span className="text-muted-foreground text-lg font-semibold">₽</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalProfit.toLocaleString('ru-RU')} ₽</div>
            <p className="text-xs text-muted-foreground">
              Выручка: {totalRevenue.toLocaleString('ru-RU')} ₽
            </p>
            <p className="text-xs text-red-600 mt-1">
              Расходы: {totalExpenses.toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Средний чек: {averageOrderValue.toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Товаров продано</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItemsSold}</div>
            <p className="text-xs text-muted-foreground">
              Только выкупленные товары
            </p>
            <p className="text-xs text-red-600 mt-1">
              Комиссия: {totalCommission.toLocaleString('ru-RU')} ₽
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">По маркетплейсам</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="w-[60px] justify-center bg-red-600 text-white">WB</Badge>
                  <span className="text-sm">WildBerries:</span>
                </div>
                <span className="font-semibold text-green-600">{wbProfit.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="w-[60px] justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">OZON</Badge>
                  <span className="text-sm">OZON:</span>
                </div>
                <span className="font-semibold text-green-600">{ozonProfit.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика по дням */}
      <Card>
        <CardHeader>
          <CardTitle>Статистика по дням</CardTitle>
          <CardDescription>Детальная информация о продажах</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных за выбранный период
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Дата</th>
                    <th className="text-left p-2">Маркетплейс</th>
                    <th className="text-left p-2">Аккаунт</th>
                    <th className="text-right p-2">Заказов</th>
                    <th className="text-right p-2">Выручка</th>
                    <th className="text-right p-2">Расходы</th>
                    <th className="text-right p-2">Прибыль</th>
                    <th className="text-right p-2">Товаров</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b">
                      <td className="p-2">{new Date(sale.date).toLocaleDateString('ru-RU')}</td>
                      <td className="p-2">
                        {sale.marketplaceType === 'wildberries' ? (
                          <Badge variant="default" className="w-[60px] justify-center bg-red-600 text-white">
                            WB
                          </Badge>
                        ) : (
                          <Badge className="w-[60px] justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                            OZON
                          </Badge>
                        )}
                      </td>
                      <td className="p-2">{sale.accountName}</td>
                      <td className="p-2 text-right">{sale.ordersCount}</td>
                      <td className="p-2 text-right">{sale.revenue.toLocaleString('ru-RU')} ₽</td>
                      <td className="p-2 text-right text-red-600">
                        {(sale.totalExpenses || sale.commission || 0).toLocaleString('ru-RU')} ₽
                        {(sale.logistics || sale.storage || sale.penalties || sale.returns) ? (
                          <span className="text-xs block text-gray-500">
                            Ком: {(sale.commission || 0).toLocaleString('ru-RU')} ₽
                            {(sale.logistics || 0) > 0 && ` | Лог: ${sale.logistics.toLocaleString('ru-RU')} ₽`}
                            {(sale.storage || 0) > 0 && ` | Хран: ${sale.storage.toLocaleString('ru-RU')} ₽`}
                            {(sale.penalties || 0) > 0 && ` | Штр: ${sale.penalties.toLocaleString('ru-RU')} ₽`}
                            {(sale.returns || 0) > 0 && ` | Возвр: ${sale.returns.toLocaleString('ru-RU')} ₽`}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2 text-right text-green-600 font-semibold">
                        {(sale.profit || sale.netRevenue || 0).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="p-2 text-right">{sale.itemsSold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceDashboard;

