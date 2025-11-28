import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Package,
  User,
  CreditCard,
  Truck,
  Clock,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Trash2,
} from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { useAuth } from '@/hooks/useAuth';
import {
  Order,
  OrderStatus,
  orderStatusLabels,
  orderStatusColors,
} from '@/types/order';
import { transformOrderFromSupabase } from '@/types/orderSupabase';
import { useToast } from '@/hooks/use-toast';

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pending');
  const [comment, setComment] = useState('');
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await ordersService.getById(parseInt(id!));
      
      // Преобразуем данные из Supabase формата
      const transformedOrder = transformOrderFromSupabase(data);
      setOrder(transformedOrder);
      setNewStatus(transformedOrder.status);
    } catch (error: any) {
      console.error('Ошибка загрузки заказа:', error);
      
      // Если таблицы orders не существует, показываем дружественное сообщение
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        toast({
          title: 'Информация',
          description: 'Таблица заказов еще не создана. Создайте её через SQL Editor в Supabase Dashboard (файл create_orders_table.sql)',
          variant: 'default',
        });
        navigate('/admin/orders'); // Возвращаемся на страницу заказов
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось загрузить заказ',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Временные моковые данные (для fallback)
  const mockOrder: Order = {
        id: id || '1',
        orderNumber: 'ORD-20240320-000001',
        userId: '1',
        customer: {
          name: 'Иванов Иван Иванович',
          email: 'ivanov@example.com',
          phone: '+7 (999) 123-45-67',
          address: 'Москва, ул. Примерная, д. 1, кв. 10',
          telegram: '@ivanov',
          whatsapp: '+7 (999) 123-45-67',
        },
        items: [
          {
            product: {
              id: '1',
              name: 'Шелковый платок "Бордо"',
              category: 'scarves',
              description: 'Роскошный шелковый платок премиум качества',
              image: '/placeholder.jpg',
              priceRanges: [],
              colors: ['Бордовый'],
              sizes: ['70x70'],
              material: 'Натуральный шелк',
              inStock: true,
            },
            quantity: 20,
            price: 450,
            color: 'Бордовый',
            size: '70x70',
          },
          {
            product: {
              id: '2',
              name: 'Бандана классическая',
              category: 'bandanas',
              description: '',
              image: '/placeholder.jpg',
              priceRanges: [],
              colors: [],
              sizes: [],
              material: '',
              inStock: true,
            },
            quantity: 10,
            price: 180,
          },
        ],
        subtotal: 10800,
        shippingCost: 500,
        discount: 540,
        total: 10760,
        status: 'pending',
        paymentMethod: 'online',
        paymentStatus: 'pending',
        shippingMethod: 'delivery',
        trackingNumber: '',
        notes: 'Хрупкий товар, осторожно!',
        history: [
          {
            id: '1',
            status: 'pending',
            changedBy: 'system',
            timestamp: '2024-03-20T10:00:00Z',
          },
        ],
        createdAt: '2024-03-20T10:00:00Z',
        updatedAt: '2024-03-20T10:00:00Z',
      };
      // setOrder(mockOrder); // Убрано, используем данные из Supabase

  const handleStatusChange = async () => {
    if (!order || !id) return;

    try {
      await ordersService.updateStatus(
        parseInt(id),
        newStatus,
        comment || undefined,
        user?.id || 'system'
      );
      
      toast({
        title: 'Успешно',
        description: 'Статус заказа обновлен',
      });
      
      // Перезагружаем заказ
      await loadOrder();
      setIsStatusDialogOpen(false);
      setComment('');
    } catch (error: any) {
      console.error('Ошибка изменения статуса:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить статус',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!order || !id) return;

    try {
      setDeleting(true);
      await ordersService.delete(parseInt(id));
      
      toast({
        title: 'Успешно',
        description: `Заказ ${order.orderNumber} удален`,
      });
      
      // Возвращаемся к списку заказов
      navigate('/admin/orders');
    } catch (error: any) {
      console.error('Ошибка удаления заказа:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить заказ',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Заказ не найден</p>
        <Button onClick={() => navigate('/admin/orders')} className="mt-4">
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заказ {order.orderNumber}</h1>
          <p className="text-gray-600 mt-1">Создан {formatDate(order.createdAt)}</p>
        </div>
        <div className="ml-auto">
          <Badge className={orderStatusColors[order.status]}>{orderStatusLabels[order.status]}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Товары в заказе */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Товары в заказе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 border rounded-lg">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.product.name}</div>
                      {(item.color || item.size) && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.color && <span>Цвет: {item.color}</span>}
                          {item.color && item.size && <span> • </span>}
                          {item.size && <span>Размер: {item.size}</span>}
                        </div>
                      )}
                      <div className="text-sm text-gray-500">
                        Количество: {item.quantity} шт. × {item.price.toLocaleString()} ₽
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {(item.quantity * item.price).toLocaleString()} ₽
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Товары:</span>
                  <span>{order.subtotal.toLocaleString()} ₽</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Скидка:</span>
                    <span>-{order.discount.toLocaleString()} ₽</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Доставка:</span>
                  <span>{order.shippingCost.toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Итого:</span>
                  <span>{order.total.toLocaleString()} ₽</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* История изменений */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                История изменений
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.history
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((entry) => (
                    <div key={entry.id} className="flex gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={orderStatusColors[entry.status]}>
                            {orderStatusLabels[entry.status]}
                          </Badge>
                          {entry.previousStatus && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span className="text-sm text-gray-500">
                                было: {orderStatusLabels[entry.previousStatus]}
                              </span>
                            </>
                          )}
                        </div>
                        {entry.comment && (
                          <p className="text-sm text-gray-600 mt-1">{entry.comment}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {entry.changedByName || 'Система'} • {formatDate(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Информация о клиенте */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Клиент
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm">{order.customer.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm">{order.customer.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm">{order.customer.address}</p>
                </div>
              </div>
              {order.customer.telegram && (
                <div className="flex items-start gap-3">
                  <MessageCircle className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm">{order.customer.telegram}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Оплата и доставка */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Оплата и доставка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Способ оплаты</Label>
                <p className="font-medium">
                  {order.paymentMethod === 'online'
                    ? 'Онлайн'
                    : order.paymentMethod === 'invoice'
                    ? 'По счету'
                    : 'Наличные'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Статус оплаты</Label>
                <div>
                  <Badge
                    variant={
                      order.paymentStatus === 'paid'
                        ? 'default'
                        : order.paymentStatus === 'pending'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {order.paymentStatus === 'paid'
                      ? 'Оплачено'
                      : order.paymentStatus === 'pending'
                      ? 'Ожидает оплаты'
                      : 'Ошибка оплаты'}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Способ доставки</Label>
                <p className="font-medium">
                  {order.shippingMethod === 'pickup'
                    ? 'Самовывоз'
                    : order.shippingMethod === 'delivery'
                    ? 'Доставка'
                    : 'Курьер'}
                </p>
              </div>
              {order.trackingNumber && (
                <div>
                  <Label className="text-xs text-gray-500">Трек-номер</Label>
                  <p className="font-medium font-mono">{order.trackingNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Заметки */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Заметки</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Изменение статуса */}
          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                onClick={() => setIsStatusDialogOpen(true)}
              >
                Изменить статус
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDeleteClick}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить заказ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Диалог изменения статуса */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить статус заказа</DialogTitle>
            <DialogDescription>
              Выберите новый статус для заказа {order.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Текущий статус</Label>
              <Badge className={orderStatusColors[order.status]}>
                {orderStatusLabels[order.status]}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus" className="mb-2 block">Новый статус</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as OrderStatus)}>
                <SelectTrigger id="newStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(orderStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} disabled={value === order.status}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comment" className="mb-2 block">Комментарий (необязательно)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Добавьте комментарий к изменению статуса..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={newStatus === order.status}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить заказ <strong>{order.orderNumber}</strong>?
              <br />
              <span className="text-destructive">Это действие нельзя отменить.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrderDetail;

