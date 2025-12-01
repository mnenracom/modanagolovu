import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCategoryName } from '@/utils/categoryNames';
import { useCart } from '@/hooks/useCart';
import { useSettings } from '@/hooks/useSettings';
import { useWishlist } from '@/hooks/useWishlist';
import { ShoppingCart, Package, Minus, Plus, Shield, Truck, CreditCard, Percent, Heart, ChevronUp, ChevronDown } from 'lucide-react';
import { Reviews } from '@/components/Reviews';
import { ProductNotificationButton } from '@/components/ProductNotificationButton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel';
import { productsService } from '@/services/productsService';
import { transformProductFromSupabase } from '@/types/productSupabase';
import { Product } from '@/types/product';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, items } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  
  // Все хуки должны быть в начале, до любых условных возвратов
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(10);
  const [quantityInput, setQuantityInput] = useState('10');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [thumbnailScrollIndex, setThumbnailScrollIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // useMemo для изображений - должен быть до всех условных возвратов
  const allImages = useMemo(() => {
    if (!product) {
      return ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E'];
    }
    
    const images: string[] = [];
    if (product.image && typeof product.image === 'string') {
      images.push(product.image);
    }
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach(img => {
        if (img && typeof img === 'string' && img !== product.image && !images.includes(img)) {
          images.push(img);
        }
      });
    }
    
    return images.length > 0 ? images : ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E'];
  }, [product?.image, product?.images]);

  // useEffect для загрузки товара
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) {
        setLoading(false);
        setProduct(null);
        return;
      }

      try {
        setLoading(true);
        const productId = parseInt(id);
        
        if (isNaN(productId)) {
          throw new Error('Неверный ID товара');
        }

        const data = await productsService.getById(productId);
        
        if (!data) {
          throw new Error('Товар не найден');
        }
        
        const transformedProduct = transformProductFromSupabase(data);
        
        if (!transformedProduct || !transformedProduct.id) {
          throw new Error('Ошибка преобразования данных товара');
        }
        
        setProduct(transformedProduct);
        const initialQty = 1; // Розница - можно купить от 1 шт
        setQuantity(initialQty);
        setQuantityInput(initialQty.toString());
      } catch (error: any) {
        console.error('Ошибка загрузки товара:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  // Загружаем похожие товары той же категории
  useEffect(() => {
    const loadSimilarProducts = async () => {
      if (!product || !product.id || !product.category) {
        setSimilarProducts([]);
        return;
      }

      try {
        setLoadingSimilar(true);
        // Ищем товары той же категории
        const { data } = await productsService.getSimilarProducts(
          parseInt(product.id),
          undefined, // Не используем артикул
          product.category,
          12 // Максимум 12 товаров (чтобы было что прокручивать)
        );
        setSimilarProducts(data || []);
        console.log('Загружено похожих товаров категории', product.category, ':', data?.length || 0);
      } catch (error) {
        console.error('Ошибка загрузки похожих товаров:', error);
        setSimilarProducts([]);
      } finally {
        setLoadingSimilar(false);
      }
    };

    if (product) {
      loadSimilarProducts();
    }
  }, [product?.id, product?.category]);

  // useEffect для карусели
  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      const newIndex = api.selectedScrollSnap();
      setCurrent(newIndex);
      // Автоматически прокручиваем миниатюры, чтобы активная была видна
      if (newIndex < thumbnailScrollIndex) {
        setThumbnailScrollIndex(newIndex);
      } else if (newIndex >= thumbnailScrollIndex + 6) {
        setThumbnailScrollIndex(Math.max(0, newIndex - 5));
      }
    });
  }, [api, thumbnailScrollIndex]);

  // Получаем розничную цену для отображения
  const retailPrice = product?.retailPrice ?? product?.price ?? 0;
  
  // Используем настройки из системы для минимальных сумм заказа
  const { getSettingAsNumber, getWholesaleGradations, error: settingsError } = useSettings();
  // Если настройки не загружены, используем значения по умолчанию
  const minRetailOrder = settingsError 
    ? 1500 
    : getSettingAsNumber('min_retail_order', 1500);
  const minWholesaleOrder = settingsError 
    ? 5000 
    : getSettingAsNumber('min_wholesale_order', 5000);
  
  // Получаем градации оптовых цен
  const wholesaleGradations = settingsError ? [] : getWholesaleGradations();
  
  // Расчет цены с учетом градаций оптовых скидок
  const retailTotal = retailPrice * quantity; // Общая сумма по розничным ценам
  
  // Находим подходящую градацию оптовых цен
  let applicableGradation: { amount: number; percent: number } | null = null;
  if (retailTotal >= minWholesaleOrder && wholesaleGradations.length > 0) {
    // Сортируем градации по сумме (по убыванию) и находим первую, которая подходит
    const sortedGradations = [...wholesaleGradations].sort((a, b) => b.amount - a.amount);
    applicableGradation = sortedGradations.find(g => retailTotal >= g.amount) || null;
  }
  
  // Применяем скидку, если есть подходящая градация
  const discountPercent = applicableGradation ? applicableGradation.percent : 0;
  const discountMultiplier = 1 - (discountPercent / 100);
  const currentPricePerUnit = retailPrice * discountMultiplier; // Цена за единицу с учетом скидки
  const totalPrice = currentPricePerUnit * quantity; // Итоговая сумма с учетом скидки
  const economyAmount = retailTotal - totalPrice; // Экономия
  
  // Находим следующую градацию для мотивации
  let nextGradation: { amount: number; percent: number } | null = null;
  if (wholesaleGradations.length > 0) {
    const sortedGradations = [...wholesaleGradations].sort((a, b) => a.amount - b.amount);
    nextGradation = sortedGradations.find(g => g.amount > retailTotal) || null;
  }
  
  const isWholesalePrice = applicableGradation !== null;

  // Розница - минимальное количество всегда 1 шт
  const minQty = 1;

  // Проверяем, есть ли товар в корзине
  const existingCartItem = items.find(item => item.product.id === product?.id);
  const cartItemQuantity = existingCartItem?.quantity || 0;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Разрешаем только цифры и пустую строку (для очистки поля)
    const filteredValue = value.replace(/[^\d]/g, '');
    
    // Обновляем отображаемое значение - без ограничений во время ввода
    setQuantityInput(filteredValue);
    
    // Обновляем quantity для расчета цены, но не применяем никаких ограничений
    if (filteredValue !== '') {
      const numValue = parseInt(filteredValue);
      if (!isNaN(numValue)) {
        setQuantity(numValue);
      }
    } else {
      // Если поле пустое, устанавливаем 0 для расчета
      setQuantity(0);
    }
  };

  const handleQuantityBlur = () => {
    // При потере фокуса применяем минимальное значение только если поле пустое или меньше 1
    if (quantityInput === '' || quantityInput.trim() === '') {
      setQuantity(1);
      setQuantityInput('1');
      return;
    }
    
    const numValue = parseInt(quantityInput);
    // Если значение меньше 1, устанавливаем 1
    if (isNaN(numValue) || numValue < 1) {
      setQuantity(1);
      setQuantityInput('1');
    } else {
      // Если значение валидное и >= 1, оставляем как есть
      setQuantity(numValue);
      setQuantityInput(numValue.toString());
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    // Розница - можно добавить любое количество от 1 шт
    const finalQuantity = Math.max(1, quantity);
    
    if (finalQuantity < 1) {
      toast.error('Количество должно быть не менее 1 шт.');
      return;
    }
    
    addToCart(product, finalQuantity);
    // Не делаем редирект - просто добавляем товар, toast показывается в addToCart
  };

  const decrement = () => {
    const newValue = Math.max(1, quantity - 1);
    setQuantity(newValue);
    setQuantityInput(newValue.toString());
  };

  const increment = () => {
    const newValue = quantity + 1;
    setQuantity(newValue);
    setQuantityInput(newValue.toString());
  };

  // Условные возвраты - только после всех хуков
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center py-12">
              <h1 className="text-3xl font-bold mb-4">Товар не найден</h1>
              <p className="text-muted-foreground mb-4">
                Товар с ID <strong>{id}</strong> не найден в базе данных.
              </p>
              <div className="flex gap-4 justify-center">
                <Link to="/">
                  <Button variant="outline">На главную</Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Основной рендер
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Название товара на мобильных - между статистикой и миниатюрами */}
          <div className="md:hidden mb-4">
            <h1 className="text-2xl font-bold">{product.name}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images Carousel */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
              {/* Thumbnails - на мобильных сверху горизонтально, на десктопе слева вертикально */}
              {allImages.length > 1 && (
                <>
                  {/* Мобильная версия: горизонтальные миниатюры сверху */}
                  <div className="w-full md:hidden">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                      {allImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => api?.scrollTo(index)}
                          className={`relative overflow-hidden rounded-md border-2 transition-all flex-shrink-0 ${
                            current === index 
                              ? 'border-primary scale-105' 
                              : 'border-transparent hover:border-primary/50'
                          }`}
                        >
                          <div className="aspect-[3/4] overflow-hidden bg-muted w-16">
                            <img
                              src={img}
                              alt={`${product.name} - миниатюра ${index + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Десктопная версия: вертикальные миниатюры слева */}
                  <div className="hidden md:flex flex-col items-center flex-shrink-0" style={{ maxWidth: 'fit-content', height: '100%', maxHeight: '100%' }}>
                    {/* Кнопка прокрутки вверх - всегда видна, если есть больше 6 миниатюр */}
                    {allImages.length > 6 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 rounded-full p-0 flex-shrink-0 mb-1 ${thumbnailScrollIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => setThumbnailScrollIndex(Math.max(0, thumbnailScrollIndex - 1))}
                        disabled={thumbnailScrollIndex === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Контейнер с миниатюрами - ограничен по высоте */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {allImages.map((img, index) => {
                        // Показываем только 6 миниатюр, начиная с thumbnailScrollIndex
                        if (index < thumbnailScrollIndex || index >= thumbnailScrollIndex + 6) {
                          return null;
                        }
                        
                        return (
                          <button
                            key={index}
                            onClick={() => api?.scrollTo(index)}
                            className={`relative overflow-hidden rounded-md border-2 transition-all flex-shrink-0 ${
                              current === index 
                                ? 'border-primary scale-105' 
                                : 'border-transparent hover:border-primary/50'
                            }`}
                          >
                            <div className="aspect-[3/4] overflow-hidden bg-muted w-20">
                              <img
                                src={img}
                                alt={`${product.name} - миниатюра ${index + 1}`}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Кнопка прокрутки вниз - только если есть место */}
                    {allImages.length > 6 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className={`h-8 w-8 rounded-full p-0 flex-shrink-0 mt-1 ${thumbnailScrollIndex + 6 >= allImages.length ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => setThumbnailScrollIndex(Math.min(allImages.length - 6, thumbnailScrollIndex + 1))}
                        disabled={thumbnailScrollIndex + 6 >= allImages.length}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
              
              {/* Main Image - на мобильных под миниатюрами, на десктопе справа от миниатюр */}
              <div className="relative flex-1 w-full md:w-auto" style={{ height: 'fit-content' }}>
                <div className="aspect-[3/4] w-full relative">
                  {/* Badge "В наличии" в углу сверху */}
                  {product.inStock && (
                    <Badge variant="outline" className="absolute top-3 left-3 z-10 border-primary text-primary bg-background/90 backdrop-blur-sm">
                      В наличии
                    </Badge>
                  )}
                  {!product.inStock && (
                    <Badge variant="outline" className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm">
                      Под заказ
                    </Badge>
                  )}
                  <Carousel className="w-full h-full" setApi={setApi}>
                    <CarouselContent className="h-full">
                      {allImages.map((img, index) => (
                        <CarouselItem key={index} className="h-full">
                          <div className="h-full overflow-hidden rounded-lg bg-muted">
                            <img
                              src={img}
                              alt={`${product.name} - фото ${index + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {allImages.length > 1 && (
                      <>
                        <CarouselPrevious className="left-4 bg-background/80 hover:bg-background" />
                        <CarouselNext className="right-4 bg-background/80 hover:bg-background" />
                      </>
                    )}
                  </Carousel>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-4">
                {/* Кнопка уведомления о поступлении (если товар не в наличии) */}
                {!product.inStock && (
                  <div className="mb-4">
                    <ProductNotificationButton
                      productId={product.id}
                      productName={product.name}
                    />
                  </div>
                )}
              </div>

              {/* Название товара - скрыто на мобильных, показано на десктопе */}
              <h1 className="hidden md:block text-4xl font-bold mb-4">{product.name}</h1>

              {/* Similar Products Section - Compact */}
              {similarProducts.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Carousel
                      opts={{
                        align: 'start',
                        loop: false,
                        slidesToScroll: 1,
                      }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-1">
                        {similarProducts.map((similarProduct) => {
                          const similarRetailPrice = similarProduct.retailPrice ?? similarProduct.price ?? 0;
                          return (
                            <CarouselItem key={similarProduct.id} className="pl-1 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                              <Link to={`/product/${similarProduct.id}`} className="block">
                                <Card className="group overflow-hidden hover:shadow-md transition-smooth h-full flex flex-col cursor-pointer border">
                                  <div className="aspect-[3/4] overflow-hidden bg-muted relative w-full">
                                    {similarProduct.image ? (
                                      <img
                                        src={similarProduct.image}
                                        alt={similarProduct.name}
                                        className="h-full w-full object-cover group-hover:scale-105 transition-smooth"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                                        Нет фото
                                      </div>
                                    )}
                                  </div>
                                  <CardContent className="p-1.5 flex-1 flex flex-col">
                                    <h3 className="font-medium text-[10px] mb-1 line-clamp-2 group-hover:text-primary transition-smooth min-h-[1.5rem] leading-tight">
                                      {similarProduct.name}
                                    </h3>
                                    <div className="mt-auto pt-1">
                                      <p className="text-xs font-bold text-primary">{similarRetailPrice.toLocaleString()} ₽</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </CarouselItem>
                          );
                        })}
                      </CarouselContent>
                      {similarProducts.length > 6 && (
                        <>
                          <CarouselPrevious className="left-0 -translate-x-2 h-6 w-6" />
                          <CarouselNext className="right-0 translate-x-2 h-6 w-6" />
                        </>
                      )}
                    </Carousel>
                  </div>
                </div>
              )}

              {/* Объединенный блок: Минимальные суммы, количество и цены */}
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Минимальные суммы заказов */}
                    {(minRetailOrder > 0 || minWholesaleOrder > 0) && (
                      <div className="pb-3 border-b">
                        <h3 className="text-base font-semibold mb-2">Минимальные суммы заказов</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Розничный заказ:</span>
                            <span className="font-semibold">от {minRetailOrder.toLocaleString()} ₽</span>
                          </div>
                          {minWholesaleOrder > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Оптовый заказ:</span>
                              <span className="font-semibold">от {minWholesaleOrder.toLocaleString()} ₽</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Количество и цена */}
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="quantity" className="mb-3 block">
                          Количество (мин. {minQty} шт.)
                        </Label>
                        <div className="flex items-stretch gap-2">
                          <Button type="button" variant="outline" onClick={decrement} className="h-10 w-10 p-0">
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            id="quantity"
                            type="text"
                            inputMode="numeric"
                            value={quantityInput}
                            onChange={handleQuantityChange}
                            onBlur={handleQuantityBlur}
                            className="text-lg text-center max-w-[120px]"
                          />
                          <Button type="button" variant="outline" onClick={increment} className="h-10 w-10 p-0">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <div className="ml-auto flex flex-col items-end">
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="text-sm text-muted-foreground">Цена за ед.:</span>
                              <span className="text-sm text-muted-foreground">Розничная цена:</span>
                              {isWholesalePrice ? (
                                <>
                                  <span className="text-xs text-muted-foreground line-through">
                                    {retailPrice.toLocaleString()} ₽
                                  </span>
                                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {currentPricePerUnit.toLocaleString()} ₽
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-bold text-primary">{retailPrice.toLocaleString()} ₽</span>
                              )}
                            </div>
                            {isWholesalePrice && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 mt-1">
                                -{discountPercent}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Итого */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold">Итого:</span>
                          <div className="flex flex-col items-end">
                            {isWholesalePrice && (
                              <span className="text-sm text-muted-foreground line-through">
                                {retailTotal.toLocaleString()} ₽
                              </span>
                            )}
                            <span className={`text-2xl font-extrabold ${isWholesalePrice ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                              {totalPrice.toLocaleString()} ₽
                            </span>
                          </div>
                        </div>
                        
                        {/* Экономия */}
                        {isWholesalePrice && economyAmount > 0 && (
                          <div className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-950 p-2 rounded">
                            <span className="text-green-700 dark:text-green-300">Ваша экономия:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {economyAmount.toLocaleString()} ₽
                            </span>
                          </div>
                        )}
                        
                        {/* Информация о следующей градации */}
                        {nextGradation && retailTotal < nextGradation.amount && (
                          <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                            Добавьте товаров на {(nextGradation.amount - retailTotal).toLocaleString()} ₽ и получите скидку {nextGradation.percent}%
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="lg" 
                          className="flex-1"
                          onClick={handleAddToCart}
                        >
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Добавить в корзину
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className={`${isInWishlist(product.id) ? 'text-red-500 border-red-500 hover:bg-red-50' : ''}`}
                          onClick={async () => {
                            if (product) {
                              await toggleWishlist(product);
                            }
                          }}
                        >
                          <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Оптовые скидки и Характеристики */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Оптовые скидки */}
                {wholesaleGradations.length > 0 && (
                  <Card className="bg-gradient-primary text-primary-foreground">
                    <CardContent className="p-4">
                      <h3 className="text-base font-semibold mb-3 flex items-center">
                        <Percent className="mr-2 h-4 w-4" />
                        Оптовые скидки
                      </h3>
                      <div className="space-y-1.5">
                        <p className="text-sm mb-2 opacity-90">
                          При достижении суммы заказа применяются скидки:
                        </p>
                        {wholesaleGradations
                          .sort((a, b) => a.amount - b.amount)
                          .map((gradation, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span>от {gradation.amount.toLocaleString()} ₽</span>
                              <span className="font-bold">-{gradation.percent}%</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Characteristics */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold mb-3">Характеристики</h3>
                    <div className="grid grid-cols-1 gap-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Категория</span>
                        <span className="font-medium">{getCategoryName(product.category)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Состав</span>
                        <span className="font-medium">{product.material || 'Не указано'}</span>
                      </div>
                      {product.sizes && product.sizes.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Размеры</span>
                          <span className="font-medium">{product.sizes.join(', ')}</span>
                        </div>
                      )}
                      {product.colors && product.colors.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Цвета</span>
                          <span className="font-medium text-right">{product.colors.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order rules strip */}
              <div className="mb-4 rounded-md border bg-muted/30 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <p>Розничная продажа от 1 шт.</p>
                </div>
                <div className="flex items-start gap-2">
                  <Percent className="h-5 w-5 text-primary mt-0.5" />
                  <p>Гибкая система оптовых скидок</p>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="h-5 w-5 text-primary mt-0.5" />
                  <p>Доставка по РФ и СНГ, самовывоз доступен</p>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <p>Оплата онлайн, по счету и наличными</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-base text-muted-foreground">
                {product.description || 'Описание отсутствует'}
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="container mx-auto px-4 py-12">
          <Reviews productId={product.id} />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
