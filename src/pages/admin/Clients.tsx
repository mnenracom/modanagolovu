import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { adminAPI } from '@/lib/api';

interface Client {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  telegram?: string;
  whatsapp?: string;
  role: string;
  status: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [clientOrders, setClientOrders] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      // TODO: Заменить на реальный API запрос
      // const response = await adminAPI.getClients();
      // setClients(response.data);

      // Временные моковые данные
      const mockClients: Client[] = [
        {
          id: '1',
          email: 'client1@example.com',
          fullName: 'Иванов Иван Иванович',
          phone: '+7 (999) 123-45-67',
          address: 'Москва, ул. Примерная, д. 1, кв. 10',
          telegram: '@ivanov',
          whatsapp: '+7 (999) 123-45-67',
          role: 'user',
          status: 'active',
          createdAt: '2024-01-15',
          totalOrders: 5,
          totalSpent: 125000,
        },
        {
          id: '2',
          email: 'client2@example.com',
          fullName: 'Петрова Мария Сергеевна',
          phone: '+7 (999) 234-56-78',
          address: 'СПб, пр. Невский, д. 20, кв. 5',
          telegram: '@petrova',
          role: 'user',
          status: 'active',
          createdAt: '2024-02-20',
          totalOrders: 3,
          totalSpent: 85000,
        },
      ];
      setClients(mockClients);
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
    
    // TODO: Загрузить историю заказов клиента
    // const response = await adminAPI.getClientOrders(client.id);
    // setClientOrders(response.data);

    // Моковые данные заказов
    setClientOrders([
      {
        id: '1',
        date: '2024-03-15',
        total: 25000,
        status: 'completed',
        items: 3,
      },
      {
        id: '2',
        date: '2024-03-10',
        total: 18000,
        status: 'processing',
        items: 2,
      },
    ]);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      blocked: 'destructive',
      pending: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status === 'active' ? 'Активен' : 
         status === 'inactive' ? 'Неактивен' :
         status === 'blocked' ? 'Заблокирован' : 'Ожидает'}
      </Badge>
    );
  };

  const filteredClients = clients.filter(
    (client) =>
      client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Клиенты</h1>
        <p className="text-gray-600 mt-2">Управление базой клиентов</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по имени, email или телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

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
                  <TableHead>ID</TableHead>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Заказов</TableHead>
                  <TableHead>Потрачено</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Клиенты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.id}</TableCell>
                      <TableCell>{client.fullName}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>{client.totalOrders}</TableCell>
                      <TableCell>{client.totalSpent.toLocaleString()} ₽</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(client)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог с деталями клиента */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Информация о клиенте</DialogTitle>
            <DialogDescription>Детальная информация и история заказов</DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              {/* Контактная информация */}
              <Card>
                <CardHeader>
                  <CardTitle>Контактная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedClient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Телефон</p>
                        <p className="font-medium">{selectedClient.phone}</p>
                      </div>
                    </div>
                    {selectedClient.telegram && (
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Telegram</p>
                          <p className="font-medium">{selectedClient.telegram}</p>
                        </div>
                      </div>
                    )}
                    {selectedClient.whatsapp && (
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">WhatsApp</p>
                          <p className="font-medium">{selectedClient.whatsapp}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Адрес доставки</p>
                        <p className="font-medium">{selectedClient.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* История заказов */}
              <Card>
                <CardHeader>
                  <CardTitle>История заказов ({clientOrders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {clientOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Заказов нет</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID заказа</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Товаров</TableHead>
                          <TableHead>Сумма</TableHead>
                          <TableHead>Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id}</TableCell>
                            <TableCell>{order.date}</TableCell>
                            <TableCell>{order.items}</TableCell>
                            <TableCell>{order.total.toLocaleString()} ₽</TableCell>
                            <TableCell>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status === 'completed' ? 'Завершен' : 'В обработке'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;










