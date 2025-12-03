import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { paymentGatewaysService } from '@/services/paymentGatewaysService';
import { yookassaService } from '@/services/yookassaService';
import { toast } from 'sonner';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const checkPayment = async () => {
      if (!orderId) {
        toast.error('Не указан номер заказа');
        navigate('/');
        return;
      }

      try {
        const orderData = await ordersService.getById(parseInt(orderId));
        setOrder(orderData);

        // Если есть платежная система и внешний ID платежа - проверяем статус
        if (orderData.payment_gateway_id && orderData.payment_external_id) {
          const gateway = await paymentGatewaysService.getById(orderData.payment_gateway_id);
          if (gateway && gateway.code === 'yookassa') {
            try {
              const { paid } = await yookassaService.checkPaymentStatus(
                gateway,
                orderData.payment_external_id
              );

              if (paid && orderData.payment_status !== 'paid') {
                // Обновляем статус оплаты
                await ordersService.update(parseInt(orderId), {
                  payment_status: 'paid',
                });
                toast.success('Оплата подтверждена!');
              }
            } catch (error) {
              console.error('Ошибка проверки статуса платежа:', error);
            }
          }
        }
      } catch (error: any) {
        console.error('Ошибка загрузки заказа:', error);
        toast.error('Ошибка загрузки информации о заказе');
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [orderId, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
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
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-4">Заказ успешно оформлен!</h1>
              {order && (
                <>
                  <p className="text-lg text-muted-foreground mb-2">
                    Номер заказа: <strong>{order.order_number || order.id}</strong>
                  </p>
                  {order.payment_status === 'paid' ? (
                    <p className="text-green-600 font-semibold mb-6">
                      Оплата подтверждена
                    </p>
                  ) : (
                    <p className="text-muted-foreground mb-6">
                      Мы свяжемся с вами для подтверждения заказа
                    </p>
                  )}
                </>
              )}
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/')}>
                  На главную
                </Button>
                {order && (
                  <Button variant="outline" onClick={() => navigate(`/tracking?order=${order.order_number || order.id}`)}>
                    Отследить заказ
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;




