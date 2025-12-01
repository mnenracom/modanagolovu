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
import { Trash2, ShoppingBag, AlertCircle, Plus, Minus } from 'lucide-react';
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
      
      <main className="flex-1 py-4 bg-background overflow-x-hidden">
        <div className="container mx-auto px-3 sm:px-4 max-w-full">
          <div className="flex items-center justify-between mb-4 gap-3 sm:gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Корзина</h1>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm whitespace-nowrap"
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {items.map((item) => {
                const priceInfo = getItemPriceInfo(item);
                return (
                  <Card 
                    key={item.product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => navigate(`/product/${item.product.id}`)}
                  >
                    <CardContent className="p-0">
                      {/* Мобильная версия: вертикальная компоновка */}
                      <div className="md:hidden">
                        {/* Изображение товара */}
                        <div className="w-full aspect-[4/3] overflow-hidden bg-muted">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                        {/* Информация о товаре */}
                        <div className="p-3 space-y-2">
                          <h3 className="font-semibold text-sm leading-tight">
                            {item.product.name}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {item.selectedColor && (
                              <span>Цвет: {item.selectedColor}</span>
                            )}
                            {item.selectedSize && (
                              <span>Размер: {item.selectedSize}</span>
                            )}
                            {item.product.material && (
                              <span>{item.product.material}</span>
                            )}
                          </div>
                          {/* Цена и количество в одной строке */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div>
                              <p className="text-lg font-bold text-primary">
                                {(priceInfo.currentPrice * item.quantity).toLocaleString()} ₽
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {priceInfo.currentPrice.toLocaleString()} ₽ за шт.
                              </p>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <label className="text-xs font-medium">Кол-во:</label>
                              <div className="flex items-center gap-1 border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.quantity > 1) {
                                      updateQuantity(item.product.id, item.quantity - 1);
                                    }
                                  }}
                                  disabled={item.quantity <= 1}
                                  className="h-8 w-8 p-0 hover:bg-muted disabled:opacity-50"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    updateQuantity(item.product.id, Math.max(1, value));
                                  }}
                                  className="w-12 h-8 text-sm text-center border-0 focus-visible:ring-0 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.product.id, item.quantity + 1);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-muted"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromCart(item.product.id);
                                }}
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Десктопная версия: горизонтальная компоновка */}
                      <div className="hidden md:flex p-4 gap-4">
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
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1.5 break-words">
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
                                className="w-24 h-10 text-sm"
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
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground h-10 w-10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
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
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="w-full">
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
