import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, Loader2 } from 'lucide-react';
import { ordersService } from '@/services/ordersService';
import { toast } from 'sonner';

const CheckoutError = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const orderData = await ordersService.getById(parseInt(orderId));
        setOrder(orderData);
      } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

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
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-4">Ошибка оплаты</h1>
              <p className="text-lg text-muted-foreground mb-6">
                К сожалению, произошла ошибка при обработке платежа.
                {order && (
                  <> Ваш заказ <strong>{order.order_number || order.id}</strong> создан, но оплата не была завершена.</>
                )}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Вы можете попробовать оплатить заказ позже или связаться с нами для уточнения деталей.
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate('/')}>
                  На главную
                </Button>
                {order && (
                  <Button variant="outline" onClick={() => navigate(`/tracking?order=${order.order_number || order.id}`)}>
                    Посмотреть заказ
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/checkout')}>
                  Попробовать снова
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutError;




