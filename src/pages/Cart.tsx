import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CartSummary } from '@/components/cart/CartSummary';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalEconomy } = useCart();
  const pricing = useCartPricing();
  const navigate = useNavigate();

  const getItemPrice = (item: typeof items[0]) => {
    // Получаем dual-цены
    const retailPrice = item.product.retailPrice ?? item.product.price ?? 0;
    const wholesalePrice = item.product.wholesalePrice ?? 0;
    const wholesaleThreshold = item.product.wholesaleThreshold ?? 10;
    
    // Если количество >= порога опта и есть оптовая цена, используем оптовую
    if (item.quantity >= wholesaleThreshold && wholesalePrice > 0 && wholesalePrice < retailPrice) {
      return wholesalePrice;
    }
    
    // Иначе используем priceRanges или розничную цену
    if (item.product.priceRanges && item.product.priceRanges.length > 0) {
      const priceRange = item.product.priceRanges.find(
        (range) =>
          item.quantity >= range.minQuantity &&
          (range.maxQuantity === null || item.quantity <= range.maxQuantity)
      );
      return priceRange ? priceRange.price : item.product.priceRanges[0].price;
    }
    
    return retailPrice;
  };
  
  const getItemPriceInfo = (item: typeof items[0]) => {
    const retailPrice = item.product.retailPrice ?? item.product.price ?? 0;
    const currentPrice = getItemPrice(item);
    
    return {
      retailPrice,
      currentPrice,
      isWholesale: false, // Оптовые цены теперь применяются от суммы заказа, а не от количества товара
      economyAmount: 0,
    };
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 py-4 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center py-8">
              <ShoppingBag className="h-24 w-24 mx-auto mb-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold mb-4">Корзина пуста</h1>
              <p className="text-muted-foreground mb-8">
                Добавьте товары из каталога, чтобы оформить заказ
              </p>
              <Link to="/catalog">
                <Button size="lg">
                  Перейти в каталог
                </Button>
              </Link>
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
      
      <main className="flex-1 py-4 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h1 className="text-4xl font-bold">Корзина</h1>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => {
                if (items.length === 0) return;
                if (window.confirm('Очистить всю корзину?')) {
                  clearCart();
                  toast.success('Корзина очищена');
                }
              }}
            >
              Очистить корзину
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-2">
              {items.map((item) => (
                <Card 
                  key={item.product.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/product/${item.product.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 aspect-[3/4] flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1.5">
                          {item.product.name}
                        </h3>
                        {item.selectedColor && (
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Цвет: {item.selectedColor}
                          </p>
                        )}
                        {item.selectedSize && (
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Размер: {item.selectedSize}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {item.product.material}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-sm font-medium">Количество:</label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.product.id, parseInt(e.target.value) || 0)
                              }
                              className="w-24"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCart(item.product.id);
                            }}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const priceInfo = getItemPriceInfo(item);
                          return (
                            <>
                              <div className="flex items-center justify-end gap-2">
                                <p className="text-xl font-bold text-primary">
                                  {priceInfo.currentPrice.toLocaleString()} ₽
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground">за шт.</p>
                              <div className="mt-2">
                                <p className={`text-lg font-semibold ${priceInfo.isWholesale ? 'text-green-600 dark:text-green-400' : ''}`}>
                                  {(priceInfo.currentPrice * item.quantity).toLocaleString()} ₽
                                </p>
                                {priceInfo.economyAmount > 0 && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    Экономия: {priceInfo.economyAmount.toLocaleString()} ₽
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <CartSummary />
            </div>
          </div>

          {/* Предупреждение о минимальной сумме заказа - внизу, чтобы не двигать панель */}
          {pricing && pricing.progressToMinOrder && !pricing.progressToMinOrder.isReached && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      Минимальная сумма {pricing.orderType === 'wholesale' ? 'оптового' : 'розничного'} заказа: {pricing.progressToMinOrder.target.toLocaleString()} ₽
                    </p>
                    <p className="text-sm">
                      Текущая сумма: <strong>{pricing.currentTotal.toLocaleString()} ₽</strong>. 
                      Добавьте товаров на <strong>{pricing.progressToMinOrder.remaining.toLocaleString()} ₽</strong>, чтобы оформить заказ.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
