import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ordersService } from '@/services/ordersService';
import { deliveryServicesService } from '@/services/deliveryServicesService';
import { transformOrderFromSupabase } from '@/types/orderSupabase';
import { Order } from '@/types/order';
import { DeliveryService, DeliveryStatus } from '@/types/delivery';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OrderTracking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const [inputOrderNumber, setInputOrderNumber] = useState(orderNumber);
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryService, setDeliveryService] = useState<DeliveryService | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<{
    status: string;
    history: DeliveryStatus[];
    location?: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (orderNumber) {
      loadOrder(orderNumber);
    }
  }, [orderNumber]);

  const loadOrder = async (orderNum: string) => {
    if (!orderNum.trim()) {
      return;
    }

    try {
      setLoading(true);
      // Ищем заказ по номеру
      const { data: orders } = await ordersService.getAll({ search: orderNum });
      const foundOrder = orders.find(o => o.orderNumber === orderNum);

      if (!foundOrder) {
        toast.error('Заказ не найден');
        setOrder(null);
        return;
      }

      const transformedOrder = transformOrderFromSupabase(foundOrder);
      setOrder(transformedOrder);

      // Загружаем службу доставки, если указана
      if (transformedOrder.deliveryServiceId) {
        const service = await deliveryServicesService.getById(transformedOrder.deliveryServiceId);
        setDeliveryService(service);
        
        // Загружаем статус отслеживания, если есть номер отслеживания
        if (transformedOrder.trackingNumber && service) {
          await loadTrackingStatus(service.code, transformedOrder.trackingNumber);
        }
      }
    } catch (error: any) {
      console.error('Ошибка загрузки заказа:', error);
      toast.error('Ошибка загрузки заказа');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingStatus = async (serviceCode: string, trackingNumber: string) => {
    try {
      setRefreshing(true);
      const status = await deliveryServicesService.getTrackingStatus(serviceCode, trackingNumber);
      setTrackingStatus(status);
    } catch (error) {
      console.error('Ошибка загрузки статуса отслеживания:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = () => {
    if (!inputOrderNumber.trim()) {
      toast.error('Введите номер заказа');
      return;
    }
    setSearchParams({ order: inputOrderNumber.trim() });
    loadOrder(inputOrderNumber.trim());
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      preparing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'delivered') return <CheckCircle className="h-5 w-5" />;
    if (status === 'shipped' || status === 'in_transit') return <Truck className="h-5 w-5" />;
    if (status === 'processing' || status === 'preparing') return <Package className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает обработки',
      processing: 'В обработке',
      confirmed: 'Подтвержден',
      preparing: 'Готовится к отправке',
      shipped: 'Отправлен',
      in_transit: 'В пути',
      delivered: 'Доставлен',
      cancelled: 'Отменен',
      refunded: 'Возвращен',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Отслеживание заказа</h1>
            <p className="text-muted-foreground">
              Введите номер заказа, чтобы узнать его текущий статус
            </p>
          </div>

          {/* Поиск заказа */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Введите номер заказа (например: ORD-20250110-000001)"
                  value={inputOrderNumber}
                  onChange={(e) => setInputOrderNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Найти
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Информация о заказе */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                <p className="mt-4 text-muted-foreground">Загрузка информации о заказе...</p>
              </CardContent>
            </Card>
          ) : order ? (
            <div className="space-y-6">
              {/* Основная информация о заказе */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Заказ {order.orderNumber}</span>
                    <Badge className={cn("text-sm", getStatusColor(order.status))}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Дата заказа</p>
                      <p className="font-medium">
                        {format(new Date(order.createdAt), 'dd MMMM yyyy HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Сумма заказа</p>
                      <p className="font-medium text-lg">{order.totalAmount.toFixed(2)} ₽</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Способ оплаты</p>
                      <p className="font-medium">{order.paymentMethod || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Статус оплаты</p>
                      <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                        {order.paymentStatus === 'paid' ? 'Оплачен' : 'Не оплачен'}
                      </Badge>
                    </div>
                  </div>

                  {order.trackingNumber && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Номер отслеживания</p>
                          <p className="font-mono font-medium">{order.trackingNumber}</p>
                          {deliveryService && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Служба доставки: {deliveryService.name}
                            </p>
                          )}
                        </div>
                        {order.trackingNumber && deliveryService && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadTrackingStatus(deliveryService.code, order.trackingNumber!)}
                            disabled={refreshing}
                          >
                            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                            Обновить
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* История статусов доставки */}
              {trackingStatus && trackingStatus.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>История доставки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-6">
                        {trackingStatus.history.map((item, index) => (
                          <div key={index} className="relative flex gap-4">
                            <div className={cn(
                              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background",
                              index === 0 ? "border-primary" : "border-muted"
                            )}>
                              {getStatusIcon(item.status)}
                            </div>
                            <div className="flex-1 pb-6">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium">{getStatusLabel(item.status)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(item.timestamp), 'dd MMM HH:mm', { locale: ru })}
                                </p>
                              </div>
                              {item.location && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </div>
                              )}
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Товары в заказе */}
              <Card>
                <CardHeader>
                  <CardTitle>Товары в заказе</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.size && (
                              <p className="text-sm text-muted-foreground">Размер: {item.size}</p>
                            )}
                            {item.color && (
                              <p className="text-sm text-muted-foreground">Цвет: {item.color}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.quantity} шт.</p>
                          <p className="text-sm text-muted-foreground">
                            {item.price.toFixed(2)} ₽
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* История изменений статуса */}
              {order.history && order.history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>История изменений</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {order.history.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{getStatusLabel(entry.status)}</p>
                            {entry.comment && (
                              <p className="text-sm text-muted-foreground">{entry.comment}</p>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(entry.timestamp), 'dd MMM HH:mm', { locale: ru })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : orderNumber ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Заказ не найден</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Проверьте правильность номера заказа
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTracking;




