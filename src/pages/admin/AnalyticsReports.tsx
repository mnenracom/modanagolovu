import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, Target, Award, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const AnalyticsReports = () => {
  const {
    priceStrategyEffectiveness,
    thresholdAnalysis,
    topProductsByWholesale,
    loading,
    error,
    refresh,
  } = useAnalytics();

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
          <p className="text-red-800">Ошибка загрузки отчётов: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отчёты по Dual-ценам</h1>
          <p className="text-gray-600 mt-2">Детальный анализ эффективности ценовой стратегии</p>
        </div>
        <Button variant="outline" size="icon" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="strategy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategy">Эффективность стратегии</TabsTrigger>
          <TabsTrigger value="thresholds">Анализ порогов</TabsTrigger>
          <TabsTrigger value="top-products">Топ товаров</TabsTrigger>
        </TabsList>

        {/* Эффективность ценовой стратегии */}
        <TabsContent value="strategy" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Всего товаров</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceStrategyEffectiveness?.totalProducts || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">С оптовыми ценами</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{priceStrategyEffectiveness?.productsWithWholesale || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {priceStrategyEffectiveness?.totalProducts
                    ? Math.round(
                        ((priceStrategyEffectiveness.productsWithWholesale /
                          priceStrategyEffectiveness.totalProducts) *
                          100) *
                          100
                      ) / 100
                    : 0}
                  %
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Средний порог</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {priceStrategyEffectiveness?.averageWholesaleThreshold || 0} шт.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Средняя экономия</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {priceStrategyEffectiveness?.averageEconomyPercent.toFixed(1) || 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Топ товаров по эффективности</CardTitle>
              <CardDescription>Товары с наилучшей конверсией в опт</CardDescription>
            </CardHeader>
            <CardContent>
              {priceStrategyEffectiveness?.topPerformingProducts.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead>Розничных заказов</TableHead>
                      <TableHead>Оптовых заказов</TableHead>
                      <TableHead>Конверсия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceStrategyEffectiveness.topPerformingProducts.map((product) => (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium">{product.productName}</TableCell>
                        <TableCell>{product.retailOrders}</TableCell>
                        <TableCell>{product.wholesaleOrders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={product.conversionRate} className="w-20 h-2" />
                            <span className="font-bold">{product.conversionRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Анализ порогов */}
        <TabsContent value="thresholds" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Рекомендуемый порог</CardTitle>
                <CardDescription>Средний порог из наиболее эффективных</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {thresholdAnalysis?.recommendedThreshold || 10} шт.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Оптимальный порог</CardTitle>
                <CardDescription>Порог с максимальной конверсией</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-600">
                  {thresholdAnalysis?.optimalThreshold || 10} шт.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Анализ порогов</CardTitle>
              <CardDescription>Детальная статистика по каждому порогу</CardDescription>
            </CardHeader>
            <CardContent>
              {thresholdAnalysis?.thresholds.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Порог (шт.)</TableHead>
                      <TableHead>Количество заказов</TableHead>
                      <TableHead>Средний чек</TableHead>
                      <TableHead>Конверсия в опт</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholdAnalysis.thresholds.map((threshold) => (
                      <TableRow key={threshold.threshold}>
                        <TableCell className="font-medium">{threshold.threshold}</TableCell>
                        <TableCell>{threshold.orderCount}</TableCell>
                        <TableCell>{threshold.averageOrderValue.toLocaleString()} ₽</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={threshold.conversionRate} className="w-20 h-2" />
                            <span className="font-bold">{threshold.conversionRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Топ товаров по переходу в опт */}
        <TabsContent value="top-products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Топ товаров по переходу в опт</CardTitle>
              <CardDescription>Товары с наибольшей конверсией из розницы в опт</CardDescription>
            </CardHeader>
            <CardContent>
              {topProductsByWholesale.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Товар</TableHead>
                      <TableHead>Розничных заказов</TableHead>
                      <TableHead>Оптовых заказов</TableHead>
                      <TableHead>Конверсия</TableHead>
                      <TableHead>Выручка</TableHead>
                      <TableHead>Средний чек</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProductsByWholesale.map((product, index) => (
                      <TableRow key={product.productId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                              </Badge>
                            )}
                            <span className="font-medium">{product.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{product.retailOrders}</TableCell>
                        <TableCell>
                          <Badge variant="default">{product.wholesaleOrders}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={product.conversionRate} className="w-20 h-2" />
                            <span className="font-bold">{product.conversionRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.totalRevenue.toLocaleString()} ₽
                        </TableCell>
                        <TableCell>{product.averageOrderValue.toLocaleString()} ₽</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-8">Нет данных для отображения</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsReports;

