import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useUserAuth } from '@/hooks/useUserAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { paymentGatewaysService } from '@/services/paymentGatewaysService';
import { deliveryServicesService } from '@/services/deliveryServicesService';
import { yookassaService } from '@/services/yookassaService';
import { PaymentGateway } from '@/types/delivery';
import { DeliveryService } from '@/types/delivery';
import { supabase } from '@/lib/supabase';

const Checkout = () => {
  const { items, getTotalPrice, getTotalEconomy, clearCart } = useCart();
  const pricing = useCartPricing();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    inn: '',
    comment: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'invoice' | 'cash'>('online');
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'delivery' | 'courier'>('delivery');
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentGateway | null>(null);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [deliveryServices, setDeliveryServices] = useState<DeliveryService[]>([]);
  const [selectedDeliveryService, setSelectedDeliveryService] = useState<DeliveryService | null>(null);

  // Загружаем платежные системы и службы доставки
  useEffect(() => {
    const loadData = async () => {
      try {
        const [gateways, services] = await Promise.all([
          paymentGatewaysService.getActive(),
          deliveryServicesService.getActive(),
        ]);
        setPaymentGateways(gateways);
        setDeliveryServices(services);
        
        // Выбираем первую активную платежную систему по умолчанию
        if (gateways.length > 0) {
          setSelectedPaymentGateway(gateways[0]);
        }
        if (services.length > 0) {
          setSelectedDeliveryService(services[0]);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      }
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Validation
      if (!formData.companyName || !formData.contactPerson || !formData.phone || !formData.email) {
        toast.error('Пожалуйста, заполните все обязательные поля');
        setLoading(false);
        return;
      }

      if (paymentMethod === 'online' && !selectedPaymentGateway) {
        toast.error('Выберите способ оплаты');
        setLoading(false);
        return;
      }

      // Подготавливаем данные заказа
      const totalPrice = getTotalPrice();
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.retailPrice || item.product.price || 0,
        total: (item.product.retailPrice || item.product.price || 0) * item.quantity,
      }));

      // Создаем заказ
      // Сохраняем UUID пользователя (если авторизован) - он будет сохранен как строка
      // Это позволит связать заказ с пользователем
      const orderData = {
        user_id: user?.id ? user.id : undefined, // UUID пользователя как строка
        customer_name: formData.contactPerson,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_address: formData.address,
        items: orderItems,
        subtotal: totalPrice,
        shipping_cost: 0, // TODO: рассчитать стоимость доставки
        discount: getTotalEconomy(),
        total_amount: totalPrice,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'online' ? 'pending' : 'pending',
        shipping_method: shippingMethod,
        notes: formData.comment || undefined,
      };

      const order = await ordersService.create(orderData);

      // Если выбрана онлайн оплата - создаем платеж
      if (paymentMethod === 'online' && selectedPaymentGateway) {
        try {
          const returnUrl = `${window.location.origin}/checkout/success?orderId=${order.id}`;
          const failUrl = `${window.location.origin}/checkout/error?orderId=${order.id}`;
          
          const { paymentUrl, paymentId } = await yookassaService.createPayment(
            selectedPaymentGateway,
            totalPrice,
            String(order.id),
            order.order_number || String(order.id),
            `Заказ №${order.order_number || order.id}`,
            returnUrl
          );

          // Обновляем заказ с данными платежа
          await ordersService.update(order.id, {
            payment_gateway_id: selectedPaymentGateway.id,
            payment_external_id: paymentId,
            payment_url: paymentUrl,
          });

          // Перенаправляем на оплату
          window.location.href = paymentUrl;
          return;
        } catch (paymentError: any) {
          console.error('Ошибка создания платежа:', paymentError);
          toast.error(paymentError.message || 'Ошибка создания платежа. Заказ создан, но оплата не была инициирована.');
          // Заказ уже создан, продолжаем
        }
      }

      // Если оплата не онлайн или произошла ошибка - показываем успех
      toast.success('Заказ успешно оформлен! Мы свяжемся с вами в ближайшее время.');
      clearCart();
      navigate(`/tracking?order=${order.order_number || order.id}`);
    } catch (error: any) {
      console.error('Ошибка оформления заказа:', error);
      toast.error(error.message || 'Ошибка оформления заказа. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Проверка при загрузке страницы
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Проверка минимальной суммы заказа
    if (!pricing.progressToMinOrder.isReached) {
      const orderTypeLabel = pricing.orderType === 'wholesale' ? 'оптового' : 'розничного';
      toast.error(
        `Минимальная сумма ${orderTypeLabel} заказа: ${pricing.progressToMinOrder.target.toLocaleString()} ₽. ` +
        `Добавьте товаров на ${pricing.progressToMinOrder.remaining.toLocaleString()} ₽`,
        { duration: 5000 }
      );
      navigate('/cart');
    }
  }, [items.length, pricing.progressToMinOrder.isReached, pricing.progressToMinOrder.target, pricing.progressToMinOrder.remaining, pricing.orderType, navigate]);

  if (items.length === 0) {
    return null;
  }

  // Дополнительная проверка перед рендером
  if (!pricing.progressToMinOrder.isReached) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/cart')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться в корзину
          </Button>

          <h1 className="text-4xl font-bold mb-8">Оформление заказа</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Контактная информация</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="companyName" className="mb-2 block">
                            Название компании <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="companyName"
                            required
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="inn" className="mb-2 block">ИНН</Label>
                          <Input
                            id="inn"
                            value={formData.inn}
                            onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactPerson" className="mb-2 block">
                            Контактное лицо <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="contactPerson"
                            required
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="mb-2 block">
                            Телефон <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="email" className="mb-2 block">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-4">Адрес доставки</h2>
                      <div>
                        <Label htmlFor="address" className="mb-2 block">Полный адрес</Label>
                        <Textarea
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-4">Способ доставки</h2>
                      <RadioGroup value={shippingMethod} onValueChange={(value) => setShippingMethod(value as 'pickup' | 'delivery' | 'courier')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="delivery" id="delivery" />
                          <Label htmlFor="delivery" className="cursor-pointer">Доставка</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pickup" id="pickup" />
                          <Label htmlFor="pickup" className="cursor-pointer">Самовывоз</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="courier" id="courier" />
                          <Label htmlFor="courier" className="cursor-pointer">Курьером</Label>
                        </div>
                      </RadioGroup>
                      {deliveryServices.length > 0 && (
                        <div className="mt-4">
                          <Label className="mb-2 block">Служба доставки</Label>
                          <Select
                            value={selectedDeliveryService?.id?.toString() || ''}
                            onValueChange={(value) => {
                              const service = deliveryServices.find(s => s.id.toString() === value);
                              setSelectedDeliveryService(service || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите службу доставки" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryServices.map((service) => (
                                <SelectItem key={service.id} value={service.id.toString()}>
                                  {service.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-4">Способ оплаты</h2>
                      <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'online' | 'invoice' | 'cash')}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="online" id="online" />
                          <Label htmlFor="online" className="cursor-pointer">Онлайн оплата</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="invoice" id="invoice" />
                          <Label htmlFor="invoice" className="cursor-pointer">По счету</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cash" id="cash" />
                          <Label htmlFor="cash" className="cursor-pointer">Наличными при получении</Label>
                        </div>
                      </RadioGroup>
                      {paymentMethod === 'online' && paymentGateways.length > 0 && (
                        <div className="mt-4">
                          <Label className="mb-2 block">Платежная система</Label>
                          <Select
                            value={selectedPaymentGateway?.id?.toString() || ''}
                            onValueChange={(value) => {
                              const gateway = paymentGateways.find(g => g.id.toString() === value);
                              setSelectedPaymentGateway(gateway || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите платежную систему" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentGateways.map((gateway) => (
                                <SelectItem key={gateway.id} value={gateway.id.toString()}>
                                  {gateway.displayName || gateway.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedPaymentGateway?.testMode && (
                            <Alert className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Тестовый режим. Платежи не будут реально списаны.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="comment" className="mb-2 block">Комментарий к заказу</Label>
                      <Textarea
                        id="comment"
                        value={formData.comment}
                        onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                        rows={4}
                        placeholder="Укажите пожелания по доставке, цветам, размерам..."
                      />
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Оформление заказа...
                        </>
                      ) : (
                        paymentMethod === 'online' ? 'Перейти к оплате' : 'Отправить заказ'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-6">Ваш заказ</h2>
                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="flex-1">
                          {item.product.name}
                          <span className="text-muted-foreground"> × {item.quantity}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Товаров:</span>
                      <span className="font-semibold">
                        {items.reduce((sum, item) => sum + item.quantity, 0)} шт.
                      </span>
                    </div>
                    {(() => {
                      const totalEconomy = getTotalEconomy();
                      const totalPrice = getTotalPrice();
                      return (
                        <>
                          {totalEconomy > 0 && (
                            <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950 p-2 rounded mb-2">
                              <span className="text-green-700 dark:text-green-300">Общая экономия:</span>
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {totalEconomy.toLocaleString()} ₽
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold">
                            <span>Итого:</span>
                            <span className="text-primary">
                              {totalPrice.toLocaleString()} ₽
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Наш менеджер свяжется с вами для уточнения деталей заказа
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
