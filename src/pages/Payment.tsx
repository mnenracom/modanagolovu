import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useUserAuth } from '@/hooks/useUserAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, AlertCircle, CreditCard, MapPin } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { paymentGatewaysService } from '@/services/paymentGatewaysService';
import { yookassaService } from '@/services/yookassaService';
import { PaymentGateway } from '@/types/delivery';
import { PostOffice, DeliveryCalculation } from '@/services/russianPostService';
import { YooKassaWidget } from '@/components/payment/YooKassaWidget';

const Payment = () => {
  const { items, getTotalPrice, getTotalEconomy, clearCart } = useCart();
  const pricing = useCartPricing();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    email: '',
  });
  
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState<PaymentGateway | null>(null);
  
  // Состояние для виджета ЮКассы
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState(false);
  
  // Данные доставки из sessionStorage
  const [deliveryData, setDeliveryData] = useState<{
    office: PostOffice;
    calculation: DeliveryCalculation;
    address: any;
  } | null>(null);

  // Загружаем данные доставки и платежные системы
  useEffect(() => {
    // Проверка наличия товаров
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    // Проверка типа заказа - только для розницы
    if (pricing.orderType === 'wholesale') {
      toast.error('Для оптовых заказов используйте форму заявки');
      navigate('/checkout');
      return;
    }

    // Загружаем данные доставки
    const savedDeliveryData = sessionStorage.getItem('deliveryData');
    if (!savedDeliveryData) {
      toast.error('Не выбрана доставка');
      navigate('/delivery');
      return;
    }

    try {
      setDeliveryData(JSON.parse(savedDeliveryData));
    } catch (error) {
      console.error('Ошибка загрузки данных доставки:', error);
      navigate('/delivery');
      return;
    }

    // Загружаем платежные системы
    const loadPaymentGateways = async () => {
      try {
        const gateways = await paymentGatewaysService.getActive();
        setPaymentGateways(gateways);
        
        // Выбираем первую активную платежную систему по умолчанию
        if (gateways.length > 0) {
          setSelectedPaymentGateway(gateways[0]);
        }
      } catch (error) {
        console.error('Ошибка загрузки платежных систем:', error);
      }
    };
    
    loadPaymentGateways();
  }, [items.length, pricing.orderType, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Валидация
      if (!formData.customerName || !formData.phone || !formData.email) {
        toast.error('Пожалуйста, заполните все обязательные поля');
        setLoading(false);
        return;
      }

      if (!selectedPaymentGateway) {
        toast.error('Выберите способ оплаты');
        setLoading(false);
        return;
      }

      if (!deliveryData) {
        toast.error('Данные доставки не найдены');
        navigate('/delivery');
        setLoading(false);
        return;
      }

      // Подготавливаем данные заказа
      const totalPrice = getTotalPrice();
      const shippingCost = deliveryData.calculation.cost;
      const totalAmount = totalPrice + shippingCost;
      
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.product.retailPrice || item.product.price || 0,
        total: (item.product.retailPrice || item.product.price || 0) * item.quantity,
      }));

      // Создаем заказ
      const orderData = {
        user_id: user?.id ? user.id : undefined,
        customer_name: formData.customerName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_address: `${deliveryData.address.city}, ${deliveryData.office.address}`,
        items: orderItems,
        subtotal: totalPrice,
        shipping_cost: shippingCost,
        discount: getTotalEconomy(),
        total_amount: totalAmount,
        status: 'pending',
        payment_method: 'online',
        payment_status: 'pending',
        shipping_method: 'delivery',
        notes: `Доставка: ${deliveryData.office.name}, ${deliveryData.office.address}. Срок: ${deliveryData.calculation.deliveryTime} дней`,
      };

      const order = await ordersService.create(orderData);

      // Создаем платеж через ЮKassa с виджетом
      try {
        const returnUrl = `${window.location.origin}/checkout/success?orderId=${order.id}`;
        
        console.log('💳 Создаем платеж через ЮКассу с виджетом...');
        console.log('  - Сумма:', totalAmount);
        console.log('  - Order ID:', order.id);
        console.log('  - Gateway:', selectedPaymentGateway.name);
        
        const paymentResult = await yookassaService.createPayment(
          selectedPaymentGateway,
          totalAmount,
          String(order.id),
          order.order_number || String(order.id),
          `Заказ №${order.order_number || order.id}`,
          returnUrl,
          true // Используем виджет
        );

        console.log('📦 Результат создания платежа:', {
          hasConfirmationToken: !!paymentResult.confirmationToken,
          hasPaymentUrl: !!paymentResult.paymentUrl,
          paymentId: paymentResult.paymentId,
          confirmationTokenLength: paymentResult.confirmationToken?.length || 0
        });

        // Обновляем заказ с данными платежа
        await ordersService.update(order.id, {
          payment_gateway_id: selectedPaymentGateway.id,
          payment_external_id: paymentResult.paymentId,
          payment_url: paymentResult.paymentUrl || '',
        });

        // Сохраняем токен для виджета
        if (paymentResult.confirmationToken) {
          console.log('✅ Получен confirmationToken, показываем виджет');
          console.log('  - Токен (первые 30 символов):', paymentResult.confirmationToken.substring(0, 30) + '...');
          setConfirmationToken(paymentResult.confirmationToken);
          setPaymentId(paymentResult.paymentId);
          setOrderCreated(true);
          setLoading(false); // Останавливаем загрузку
          toast.success('Заказ создан! Заполните данные для оплаты ниже.');
          return; // Останавливаемся здесь, показываем виджет
        } else {
          console.warn('⚠️ confirmationToken не получен, но есть paymentUrl:', !!paymentResult.paymentUrl);
        }

        // Если нет токена, используем редирект (fallback)
        if (paymentResult.paymentUrl) {
          window.location.href = paymentResult.paymentUrl;
          return;
        }
      } catch (paymentError: any) {
        console.error('❌ Ошибка создания платежа:', paymentError);
        console.error('Детали ошибки:', {
          message: paymentError.message,
          error: paymentError,
          details: paymentError.details,
          originalError: paymentError.originalError,
          stack: paymentError.stack
        });
        
        // Показываем детальное сообщение об ошибке
        let errorMessage = paymentError.message || 'Ошибка создания платежа. Заказ создан, но оплата не была инициирована.';
        
        // Если есть детали ошибки, добавляем их
        if (paymentError.details) {
          if (typeof paymentError.details === 'string') {
            errorMessage += ` Детали: ${paymentError.details}`;
          } else if (paymentError.details.error) {
            errorMessage += ` Детали: ${paymentError.details.error}`;
          }
        }
        
        toast.error(errorMessage, { duration: 10000 }); // Показываем 10 секунд для длинных сообщений
        // Заказ уже создан, продолжаем
        setLoading(false);
        return; // Не продолжаем дальше, чтобы пользователь мог попробовать еще раз
      }

      // Если произошла ошибка - показываем успех
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

  if (items.length === 0 || !deliveryData) {
    return null;
  }

  if (pricing.orderType === 'wholesale') {
    return null;
  }

  const totalPrice = getTotalPrice();
  const shippingCost = deliveryData.calculation.cost;
  const totalAmount = totalPrice + shippingCost;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/delivery')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Вернуться к выбору доставки
          </Button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Оплата заказа</h1>
            <p className="text-muted-foreground">Заполните контактные данные и выберите способ оплаты</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Форма оплаты */}
            <div className="lg:col-span-2 space-y-6">
              {!orderCreated ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Контактная информация</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="customerName" className="mb-2 block">
                        ФИО * <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="customerName"
                        required
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Иванов Иван Иванович"
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
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="mb-2 block">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="example@mail.ru"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Способ оплаты
                      </h3>
                      {paymentGateways.length > 0 ? (
                        <div className="space-y-2">
                          {paymentGateways.map((gateway) => (
                            <div
                              key={gateway.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedPaymentGateway?.id === gateway.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedPaymentGateway(gateway)}
                            >
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-5 w-5" />
                                <div className="flex-1">
                                  <div className="font-semibold">{gateway.displayName || gateway.name}</div>
                                  {gateway.description && (
                                    <div className="text-sm text-muted-foreground">{gateway.description}</div>
                                  )}
                                </div>
                                {selectedPaymentGateway?.id === gateway.id && (
                                  <div className="text-primary">✓</div>
                                )}
                              </div>
                              {gateway.testMode && (
                                <Alert className="mt-2">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    Тестовый режим. Платежи не будут реально списаны.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Платежные системы не настроены. Обратитесь к администратору.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-lg" 
                      disabled={loading || !selectedPaymentGateway}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Оформление заказа...
                        </>
                      ) : (
                        <>
                          Оплатить {totalAmount.toLocaleString('ru-RU')} ₽
                          <CreditCard className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : orderCreated && confirmationToken ? (
                <Card className="shadow-lg border-2 border-primary">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="flex items-center gap-2 text-primary text-xl">
                      <CreditCard className="h-5 w-5" />
                      Оплата заказа
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Заказ успешно создан. Заполните данные карты для оплаты.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Alert className="border-primary/20 bg-primary/5">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm">
                          Безопасная оплата через ЮКассу. Ваши данные защищены.
                        </AlertDescription>
                      </Alert>
                      <YooKassaWidget
                        confirmationToken={confirmationToken}
                        returnUrl={`${window.location.origin}/checkout/success?orderId=${paymentId}`}
                        onSuccess={() => {
                          toast.success('Оплата успешно обработана!');
                          clearCart();
                          sessionStorage.removeItem('deliveryData');
                          setTimeout(() => {
                            navigate(`/checkout/success?orderId=${paymentId}`);
                          }, 1000);
                        }}
                        onError={(error) => {
                          console.error('Ошибка виджета:', error);
                          toast.error('Ошибка при обработке платежа. Попробуйте еще раз.');
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            {/* Итоговая информация */}
            <div>
              <Card className="sticky top-24 shadow-lg">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-xl">Ваш заказ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="flex-1">
                          {item.product.name}
                          <span className="text-muted-foreground"> × {item.quantity}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {deliveryData && (
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <div className="font-semibold">{deliveryData.office.name}</div>
                          <div className="text-muted-foreground text-xs">{deliveryData.office.address}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Товаров:</span>
                      <span className="font-semibold">
                        {items.reduce((sum, item) => sum + item.quantity, 0)} шт.
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Сумма товаров:</span>
                      <span className="font-semibold">
                        {totalPrice.toLocaleString()} ₽
                      </span>
                    </div>
                    {deliveryData && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Доставка:</span>
                        <span className="font-semibold">
                          {shippingCost.toLocaleString()} ₽
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Итого:</span>
                      <span className="text-primary">
                        {totalAmount.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
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

export default Payment;


