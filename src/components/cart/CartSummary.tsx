import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useCart } from '@/hooks/useCart';
import { MinOrderProgress } from './MinOrderProgress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingCart, TrendingDown, Package, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

interface CartSummaryProps {
  onCheckout?: () => void;
}

export const CartSummary = ({ onCheckout }: CartSummaryProps) => {
  const navigate = useNavigate();
  const pricing = useCartPricing();
  const { items } = useCart();

  // Защита от ошибок - если pricing не загружен, показываем заглушку
  if (!pricing || !pricing.progressToMinOrder) {
    return (
      <Card className="sticky top-24">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCheckout = () => {
    // Валидация минимальной суммы
    if (!pricing.progressToMinOrder.isReached) {
      const orderTypeLabel = pricing.orderType === 'wholesale' ? 'оптового' : 'розничного';
      toast.error(
        `Минимальная сумма ${orderTypeLabel} заказа: ${pricing.progressToMinOrder.target.toLocaleString()} ₽. ` +
        `Добавьте товаров на ${pricing.progressToMinOrder.remaining.toLocaleString()} ₽`
      );
      return;
    }

    if (onCheckout) {
      onCheckout();
    } else {
      // Маршрутизация в зависимости от типа заказа
      if (pricing.orderType === 'wholesale') {
        navigate('/checkout'); // Опт - форма заявки
      } else {
        navigate('/delivery'); // Розница - выбор доставки
      }
    }
  };

  return (
    <Card className="sticky top-20 sm:top-24 w-full">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <ShoppingCart className="h-4 w-4" />
          Итого заказа
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6">
        {/* Тип заказа */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Тип заказа:</span>
          <Badge 
            variant={pricing.orderType === 'wholesale' ? 'default' : 'secondary'}
            className={`text-xs ${pricing.orderType === 'wholesale' ? 'bg-green-600 text-white' : ''}`}
          >
            <Package className="h-3 w-3 mr-1" />
            {pricing.orderType === 'wholesale' ? 'Оптовый' : 'Розничный'}
          </Badge>
        </div>

        {/* Количество товаров */}
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-muted-foreground">Товаров:</span>
          <span className="font-semibold">
            {items.reduce((sum, item) => sum + item.quantity, 0)} шт.
          </span>
        </div>

        {/* Прогресс до минимальных заказов */}
        <div className="pt-2 border-t space-y-2">
          {/* Прогресс до розничного заказа */}
          {pricing.minRetailOrder > 0 && (
            <MinOrderProgress
              current={pricing.currentTotal}
              target={pricing.progressToMinOrder.target}
              orderType="retail"
              isReached={pricing.progressToMinOrder.isReached}
            />
          )}
          
          {/* Прогресс до оптового заказа */}
          <MinOrderProgress
            current={pricing.currentTotal}
            target={pricing.progressToWholesaleOrder.target}
            orderType="wholesale"
            isReached={pricing.progressToWholesaleOrder.isReached}
          />
        </div>

        {/* Уведомление о переходе на опт */}
        {pricing.wholesaleInfo.canSwitchToWholesale && pricing.wholesaleInfo.nextGradation && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <TrendingDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-900 dark:text-blue-100">
              <div className="space-y-1.5">
                <div>
                  <p className="font-semibold">
                    Добавьте еще товаров на {pricing.wholesaleInfo.allNextGradations && pricing.wholesaleInfo.allNextGradations.length > 0 
                      ? pricing.wholesaleInfo.allNextGradations[0].remaining.toLocaleString() 
                      : (pricing.wholesaleInfo.nextGradation.amount - pricing.retailTotal).toLocaleString()} ₽
                  </p>
                  <p className="text-sm">
                    и получите оптовые цены со скидкой {pricing.wholesaleInfo.nextGradation.percent}% (экономия до {pricing.wholesaleInfo.potentialEconomy.toLocaleString()} ₽)
                  </p>
                </div>
                
                {/* Показываем все градации оптовых скидок */}
                {pricing.wholesaleInfo.allNextGradations && pricing.wholesaleInfo.allNextGradations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700 space-y-1">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      Все уровни оптовых скидок:
                    </p>
                    {pricing.wholesaleInfo.allNextGradations.map((gradation, index) => (
                      <div key={index} className="text-xs text-blue-700 dark:text-blue-300">
                        <span className="font-semibold">{gradation.percent}%</span> скидка при заказе от{' '}
                        <span className="font-semibold">{gradation.amount.toLocaleString()} ₽</span>
                        {' '}(осталось добавить{' '}
                        <span className="font-semibold">{gradation.remaining.toLocaleString()} ₽</span>)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Информация о текущей градации опта */}
        {pricing.orderType === 'wholesale' && pricing.wholesaleInfo.currentGradation && (
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              <div className="space-y-1.5">
                <div>
                  <p className="font-semibold">
                    Применяется оптовая скидка {pricing.wholesaleInfo.currentGradation.percent}%
                  </p>
                  <p className="text-sm">
                    Ваша сумма заказа достигла {pricing.wholesaleInfo.currentGradation.amount.toLocaleString()} ₽
                  </p>
                </div>
                
                {/* Показываем все следующие градации */}
                {pricing.wholesaleInfo.allNextGradations && pricing.wholesaleInfo.allNextGradations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-300 dark:border-green-700 space-y-1">
                    <p className="text-xs font-medium text-green-800 dark:text-green-200">
                      Следующие уровни скидок:
                    </p>
                    {pricing.wholesaleInfo.allNextGradations.map((gradation, index) => (
                      <div key={index} className="text-xs text-green-700 dark:text-green-300">
                        <span className="font-semibold">{gradation.percent}%</span> скидка при заказе от{' '}
                        <span className="font-semibold">{gradation.amount.toLocaleString()} ₽</span>
                        {' '}(осталось добавить{' '}
                        <span className="font-semibold">{gradation.remaining.toLocaleString()} ₽</span>)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Экономия */}
        {pricing.totalEconomy > 0 && (
          <div className="bg-green-50 dark:bg-green-950 p-2 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Ваша экономия:
                </span>
              </div>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {pricing.totalEconomy.toLocaleString()} ₽
              </span>
            </div>
          </div>
        )}


        {/* Итоговая сумма */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between text-base sm:text-lg font-bold">
            <span>Сумма заказа:</span>
            <span className="text-primary text-xl sm:text-2xl">
              {pricing.currentTotal.toLocaleString()} ₽
            </span>
          </div>
        </div>

        {/* Кнопка оформления */}
        <Button 
          size="lg" 
          className="w-full"
          onClick={handleCheckout}
          disabled={!pricing.progressToMinOrder.isReached}
        >
          {pricing.progressToMinOrder.isReached ? (
            <>
              Оформить заказ
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Добавьте товаров на {pricing.progressToMinOrder.remaining.toLocaleString()} ₽
            </>
          )}
        </Button>

        {/* Предупреждение о минимальной сумме */}
        {!pricing.progressToMinOrder.isReached && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">
                  Минимальная сумма {pricing.orderType === 'wholesale' ? 'оптового' : 'розничного'} заказа: {pricing.progressToMinOrder.target.toLocaleString()} ₽
                </p>
                <p className="text-sm">
                  Добавьте товаров на <strong>{pricing.progressToMinOrder.remaining.toLocaleString()} ₽</strong>, чтобы оформить заказ
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

