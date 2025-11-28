import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Calendar, Filter, Trash2 } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { Order, OrderStatus, orderStatusLabels, orderStatusColors } from '@/types/order';
import { transformOrderFromSupabase } from '@/types/orderSupabase';
import { useToast } from '@/hooks/use-toast';
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

const Orders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data } = await ordersService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date: dateFilter !== 'all' ? dateFilter : undefined,
        search: searchTerm || undefined,
      });
      
      // Преобразуем данные из Supabase формата
      const transformedOrders = data.map(transformOrderFromSupabase);
      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Ошибка загрузки заказов:', error);
      
      // Если таблицы orders не существует, показываем дружественное сообщение
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        setOrders([]);
        toast({
          title: 'Информация',
          description: 'Таблица заказов еще не создана. Создайте её через SQL Editor в Supabase Dashboard (файл create_orders_table.sql)',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось загрузить заказы',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOrders();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Временные моковые данные (для fallback)
  const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'ORD-20240320-000001',
          userId: '1',
          customer: {
            name: 'Иванов Иван Иванович',
            email: 'ivanov@example.com',
            phone: '+7 (999) 123-45-67',
            address: 'Москва, ул. Примерная, д. 1, кв. 10',
            telegram: '@ivanov',
          },
          items: [
            {
              product: {
                id: '1',
                name: 'Шелковый платок "Бордо"',
                category: 'scarves',
                description: '',
                image: '/placeholder.jpg',
                priceRanges: [],
                colors: [],
                sizes: [],
                material: '',
                inStock: true,
              },
              quantity: 20,
              price: 450,
              color: 'Бордовый',
              size: '70x70',
            },
          ],
          subtotal: 9000,
          shippingCost: 500,
          discount: 0,
          total: 9500,
          status: 'pending',
          paymentMethod: 'online',
          paymentStatus: 'pending',
          shippingMethod: 'delivery',
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
        },
        {
          id: '2',
          orderNumber: 'ORD-20240319-000002',
          userId: '2',
          customer: {
            name: 'Петрова Мария Сергеевна',
            email: 'petrova@example.com',
            phone: '+7 (999) 234-56-78',
            address: 'СПб, пр. Невский, д. 20, кв. 5',
          },
          items: [
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
              quantity: 30,
              price: 180,
            },
          ],
          subtotal: 5400,
          shippingCost: 0,
          discount: 540,
          total: 4860,
          status: 'processing',
          paymentMethod: 'invoice',
          paymentStatus: 'paid',
          shippingMethod: 'pickup',
          history: [
            {
              id: '1',
              status: 'pending',
              changedBy: 'system',
              timestamp: '2024-03-19T14:00:00Z',
            },
            {
              id: '2',
              status: 'processing',
              changedBy: '1',
              changedByName: 'Администратор',
              previousStatus: 'pending',
              timestamp: '2024-03-19T15:00:00Z',
            },
          ],
          createdAt: '2024-03-19T14:00:00Z',
          updatedAt: '2024-03-19T15:00:00Z',
        },
      ];
      // setOrders(mockOrders); // Убрано, используем данные из Supabase

  const getStatusBadge = (status: OrderStatus) => {
    return (
      <Badge className={orderStatusColors[status]}>
        {orderStatusLabels[status]}
      </Badge>
    );
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

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeleting(true);
      await ordersService.delete(parseInt(orderToDelete.id));
      
      toast({
        title: 'Успешно',
        description: `Заказ ${orderToDelete.orderNumber} удален`,
      });
      
      // Удаляем заказ из списка
      setOrders(orders.filter(o => o.id !== orderToDelete.id));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      console.error('Ошибка удаления заказа:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить заказ',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.orderNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.customer.phone || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const diffTime = now.getTime() - orderDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (dateFilter === 'today') {
        matchesDate = diffDays === 0;
      } else if (dateFilter === 'week') {
        matchesDate = diffDays <= 7;
      } else if (dateFilter === 'month') {
        matchesDate = diffDays <= 30;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заказы</h1>
          <p className="text-gray-600 mt-2">Управление заказами</p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative flex-1 md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск по номеру, имени, email или телефону..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все периоды</SelectItem>
                <SelectItem value="today">Сегодня</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица заказов */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер заказа</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Товаров</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Оплата</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Заказы не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium font-mono">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer.name}</div>
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} шт.
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{order.total.toLocaleString()} ₽</div>
                        {order.discount > 0 && (
                          <div className="text-xs text-gray-500">
                            Скидка: {order.discount.toLocaleString()} ₽
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
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
                            ? 'Ожидает'
                            : 'Ошибка'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="icon" title="Просмотр">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteClick(order)}
                            title="Удалить"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заказ?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить заказ <strong>{orderToDelete?.orderNumber}</strong>?
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

export default Orders;

