import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useUserAuth } from '@/hooks/useUserAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  ShoppingBag, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  MessageCircle,
  LogOut,
  Save,
  Edit,
  X,
  Heart,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ordersService } from '@/services/ordersService';
import { transformOrderFromSupabase } from '@/types/orderSupabase';
import { supabase } from '@/lib/supabase';
import { Order, orderStatusLabels, orderStatusColors } from '@/types/order';
import { format } from 'date-fns';
import { useWishlist } from '@/hooks/useWishlist';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';

const Account = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, updateProfile, changePassword, loading: authLoading } = useUserAuth();
  const { toast } = useToast();
  const { wishlist, loading: wishlistLoading } = useWishlist();
  const { addToCart } = useCart();
  
  // Получаем активную вкладку из URL параметров
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') || 'profile';
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    address: '',
    telegram: '',
    whatsapp: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Загружаем заказы пользователя
  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  // Инициализируем данные профиля
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        phone: user.phone || '',
        address: user.address || '',
        telegram: user.telegram || '',
        whatsapp: user.whatsapp || '',
      });
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user?.id && !user?.email) return;

    try {
      setOrdersLoading(true);
      
      // Пытаемся загрузить заказы по user_id (UUID пользователя)
      // Затем по email как fallback
      let ordersData: any[] = [];
      
      // Пробуем найти заказы по user_id (UUID)
      if (user.id) {
        try {
          const { data } = await ordersService.getAll({
            userId: user.id, // UUID пользователя
          });
          ordersData = data || [];
        } catch (e) {
          console.warn('Не удалось загрузить заказы по user_id:', e);
        }
      }
      
      // Если не нашли по user_id, ищем по email
      if (ordersData.length === 0 && user.email) {
        const { data } = await ordersService.getAll({
          search: user.email,
        });

        // Фильтруем заказы по email пользователя
        ordersData = data.filter((order: any) => 
          order.customer_email?.toLowerCase() === user.email?.toLowerCase()
        );
      }

      const transformedOrders = ordersData.map(transformOrderFromSupabase);
      setOrders(transformedOrders);
    } catch (error: any) {
      console.error('Ошибка загрузки заказов:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить заказы',
        variant: 'destructive',
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await updateProfile(profileData);
      
      toast({
        title: 'Успешно',
        description: 'Профиль обновлен',
      });
      
      setIsEditing(false);
    } catch (error: any) {
      console.error('Ошибка обновления профиля:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить профиль',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен содержать минимум 6 символов',
        variant: 'destructive',
      });
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(passwordData.newPassword);
      
      toast({
        title: 'Успешно',
        description: 'Пароль изменен',
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Ошибка смены пароля:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить пароль',
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: 'Выход выполнен',
        description: 'До свидания!',
      });
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось выйти из системы',
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <Alert>
                <AlertDescription>
                  Вы не авторизованы. Пожалуйста, войдите в систему.
                </AlertDescription>
              </Alert>
              <Button className="w-full mt-4" onClick={() => navigate('/auth/login')}>
                Войти
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">Личный кабинет</h1>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выйти
              </Button>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="profile">
                  <User className="h-4 w-4 mr-2" />
                  Профиль
                </TabsTrigger>
                <TabsTrigger value="wishlist">
                  <Heart className="h-4 w-4 mr-2" />
                  Избранное ({wishlist.length})
                </TabsTrigger>
                <TabsTrigger value="orders">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Мои заказы ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="password">
                  <Lock className="h-4 w-4 mr-2" />
                  Смена пароля
                </TabsTrigger>
              </TabsList>

              {/* Вкладка избранного */}
              <TabsContent value="wishlist">
                <Card>
                  <CardHeader>
                    <CardTitle>Мои избранные товары</CardTitle>
                    <CardDescription>
                      Товары, которые вы сохранили для покупки позже
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {wishlistLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : wishlist.length === 0 ? (
                      <div className="text-center py-12">
                        <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-2">У вас пока нет избранных товаров</p>
                        <Button variant="outline" onClick={() => navigate('/catalog')}>
                          Перейти в каталог
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {wishlist.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={(p) => addToCart(p, 1)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Вкладка профиля */}
              <TabsContent value="profile">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Личные данные</CardTitle>
                        <CardDescription>
                          Управляйте своей контактной информацией
                        </CardDescription>
                      </div>
                      {!isEditing ? (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Редактировать
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => {
                            setIsEditing(false);
                            setProfileData({
                              fullName: user.fullName || '',
                              phone: user.phone || '',
                              address: user.address || '',
                              telegram: user.telegram || '',
                              whatsapp: user.whatsapp || '',
                            });
                          }}>
                            <X className="h-4 w-4 mr-2" />
                            Отмена
                          </Button>
                          <Button onClick={handleSaveProfile} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Сохранение...' : 'Сохранить'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={user.email}
                          disabled
                          className="pl-10 bg-muted"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email нельзя изменить
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="fullName" className="mb-2 block">ФИО</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="fullName"
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="mb-2 block">Телефон</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="mb-2 block">Адрес доставки</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="address"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          disabled={!isEditing}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="telegram" className="mb-2 block">Telegram</Label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="telegram"
                            value={profileData.telegram}
                            onChange={(e) => setProfileData({ ...profileData, telegram: e.target.value })}
                            disabled={!isEditing}
                            placeholder="@username"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="whatsapp" className="mb-2 block">WhatsApp</Label>
                        <div className="relative">
                          <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="whatsapp"
                            value={profileData.whatsapp}
                            onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                            disabled={!isEditing}
                            placeholder="+7 (999) 123-45-67"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Вкладка заказов */}
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>История заказов</CardTitle>
                    <CardDescription>
                      Просмотр всех ваших заказов
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ordersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-12">
                        <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-muted-foreground">У вас пока нет заказов</p>
                        <Button className="mt-4" onClick={() => navigate('/catalog')}>
                          Перейти в каталог
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Номер заказа</TableHead>
                              <TableHead>Дата</TableHead>
                              <TableHead>Товары</TableHead>
                              <TableHead>Сумма</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Действия</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                  {order.orderNumber}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(order.createdAt), 'dd.MM.yyyy HH:mm')}
                                </TableCell>
                                <TableCell>
                                  {order.items.length} {order.items.length === 1 ? 'товар' : 'товаров'}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {order.total.toLocaleString('ru-RU')} ₽
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={orderStatusColors[order.status]}
                                  >
                                    {orderStatusLabels[order.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/account/orders/${order.id}`)}
                                  >
                                    Подробнее
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Вкладка смены пароля */}
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Смена пароля</CardTitle>
                    <CardDescription>
                      Обновите пароль для безопасности вашего аккаунта
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="newPassword" className="mb-2 block">Новый пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Минимум 6 символов"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="mb-2 block">Подтвердите пароль</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Повторите новый пароль"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleChangePassword} 
                      disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="w-full"
                    >
                      {changingPassword ? 'Изменение...' : 'Изменить пароль'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;

