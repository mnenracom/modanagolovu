import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { ArrowRight, Package, Truck, Shield, CheckCircle, Clock, Star, TrendingUp, Sparkles } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { bannersService } from '@/services/bannersService';
import { transformProductFromSupabase } from '@/types/productSupabase';
import { transformBannerFromSupabase } from '@/types/bannerSupabase';
import { Product } from '@/types/product';
import { Banner } from '@/types/bannerSupabase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { SEO } from '@/components/SEO';
import { StructuredData } from '@/components/StructuredData';

const Index = () => {
  const { addToCart } = useCart();
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [popularLoading, setPopularLoading] = useState(true);
  const [bannersLoading, setBannersLoading] = useState(true);

  // Плагин автоплея для карусели баннеров
  const autoplayPlugin = useRef(
    Autoplay({ delay: 7000, stopOnInteraction: false })
  );

  // Оптимизированная загрузка товаров - параллельно
  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        setLoading(true);
        setPopularLoading(true);
        
        // Загружаем оба списка параллельно для лучшей производительности
        const [newProductsData, popularProductsData] = await Promise.all([
          productsService.getForNewProducts({ limit: 4 }).catch(err => {
            console.error('Ошибка загрузки новинок:', err);
            return { data: [] };
          }),
          productsService.getForBestsellers({ limit: 4 }).catch(err => {
            console.error('Ошибка загрузки хитов продаж:', err);
            return { data: [] };
          }),
        ]);
        
        setNewProducts(newProductsData.data.map(transformProductFromSupabase));
        setPopularProducts(popularProductsData.data.map(transformProductFromSupabase));
      } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        setNewProducts([]);
        setPopularProducts([]);
      } finally {
        setLoading(false);
        setPopularLoading(false);
      }
    };

    loadAllProducts();
  }, []);


  // Загружаем активные баннеры из Supabase
  useEffect(() => {
    const loadBanners = async () => {
      try {
        setBannersLoading(true);
        const data = await bannersService.getActive();
        const transformed = data.map(transformBannerFromSupabase);
        setBanners(transformed);
      } catch (error) {
        console.error('Ошибка загрузки баннеров:', error);
        setBanners([]);
      } finally {
        setBannersLoading(false);
      }
    };

    loadBanners();
  }, []);

  const features = [
    {
      icon: Package,
      title: 'Оптовые цены',
      description: 'Выгодные условия для оптовых покупателей',
      color: 'text-blue-600',
    },
    {
      icon: Truck,
      title: 'Быстрая доставка',
      description: 'Доставка по всей России',
      color: 'text-green-600',
    },
    {
      icon: Shield,
      title: 'Гарантия качества',
      description: 'Только проверенные производители',
      color: 'text-purple-600',
    },
    {
      icon: CheckCircle,
      title: 'Официальный поставщик',
      description: 'Прямые поставки от производителей',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Banner Slider */}
        <section className="relative h-[250px] sm:h-[350px] overflow-hidden">
          {bannersLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : banners.length === 0 ? (
            // Fallback к старому баннеру, если нет баннеров в базе
            <div className="absolute inset-0">
              <img
                src="/hero-banner.jpg"
                alt="Новинки коллекции"
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Если изображение не найдено, показываем градиент
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="container relative mx-auto px-3 sm:px-4 h-full flex items-center">
                <div className="max-w-2xl text-white">
                  <Badge variant="secondary" className="mb-2 sm:mb-4 bg-accent text-accent-foreground text-xs sm:text-sm">
                    Новая коллекция
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
                    Головные уборы оптом
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 text-white/90">
                    Широкий ассортимент платков, косынок, бандан и капоров для вашего бизнеса
                  </p>
                  <Link to="/catalog">
                    <Button size="lg" className="bg-accent hover:bg-accent/90 text-sm sm:text-base h-9 sm:h-11">
                      Смотреть каталог
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <Carousel 
              className="w-full h-full"
              plugins={banners.length > 1 ? [autoplayPlugin.current] : undefined}
              opts={{
                align: "start",
                loop: true,
              }}
            >
              <CarouselContent className="h-[250px] sm:h-[350px]">
                {banners.map((banner) => (
                  <CarouselItem key={banner.id} className="h-[250px] sm:h-[350px]">
                    <div className="relative h-full w-full">
                      {/* Мобильное изображение */}
                      {banner.mobileImageUrl && (
                        <img
                          src={banner.mobileImageUrl}
                          alt={banner.title || 'Баннер'}
                          className="h-full w-full object-cover md:hidden"
                          onError={(e) => {
                            // Fallback на десктопное изображение при ошибке
                            const desktopImg = e.currentTarget.nextElementSibling as HTMLImageElement;
                            if (desktopImg) {
                              e.currentTarget.style.display = 'none';
                              desktopImg.classList.remove('hidden', 'md:block');
                              desktopImg.classList.add('block');
                            }
                          }}
                        />
                      )}
                      {/* Десктопное изображение */}
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || 'Баннер'}
                        className={`h-full w-full object-cover ${banner.mobileImageUrl ? 'hidden md:block' : ''}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="800"%3E%3Crect fill="%23ddd" width="1920" height="800"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-overlay" />
                      <div className="container relative mx-auto px-3 sm:px-4 h-full flex items-center">
                        <div className="max-w-2xl text-white">
                          {banner.title && (
                            <Badge variant="secondary" className="mb-2 sm:mb-4 bg-accent text-accent-foreground text-xs sm:text-sm">
                              {banner.title}
                            </Badge>
                          )}
                          {banner.subtitle && (
                            <>
                              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
                                {banner.subtitle.split('\n')[0] || 'Головные уборы оптом'}
                              </h2>
                              {banner.subtitle.split('\n').length > 1 && (
                                <p className="text-sm sm:text-base md:text-lg mb-4 sm:mb-6 text-white/90">
                                  {banner.subtitle.split('\n').slice(1).join(' ')}
                                </p>
                              )}
                            </>
                          )}
                          {banner.buttonText && banner.buttonLink && (
                            <Link to={banner.buttonLink}>
                              <Button size="lg" className="bg-accent hover:bg-accent/90 text-sm sm:text-base h-9 sm:h-11">
                                {banner.buttonText}
                                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {banners.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 bg-background/80 hover:bg-background" />
                  <CarouselNext className="right-4 bg-background/80 hover:bg-background" />
                </>
              )}
            </Carousel>
          )}
        </section>

        {/* Popular Products & New Products - Side by Side */}
        <section className="py-6 sm:py-8 bg-background">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Хиты продаж - Left Panel */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">Хиты продаж</h2>
                  </div>
                  <Link to="/catalog">
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                      Все товары
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                {popularLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : popularProducts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">
                    Товары пока не добавлены
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {popularProducts.slice(0, 4).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={(p) => addToCart(p, 1)}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {/* Новинки - Right Panel */}
              {newProducts.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h2 className="text-2xl font-bold">Новинки</h2>
                    </div>
                    <Link to="/catalog">
                      <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                        Все новинки
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {newProducts.slice(0, 4).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={(p) => addToCart(p, 1)}
                        />
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Features / Преимущества */}
        <section className="py-4 sm:py-10 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-3 sm:px-4">
            <h2 className="text-lg sm:text-2xl font-bold text-center mb-3 sm:mb-6">Почему выбирают нас</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="text-center p-3 sm:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 border-2 hover:border-primary/50">
                  <CardContent className="pt-0 sm:pt-6">
                    <div className="mb-2 sm:mb-4 flex justify-center">
                      <div className={`p-2 sm:p-4 rounded-full bg-muted ${feature.color} bg-opacity-10`}>
                        <feature.icon className={`h-5 w-5 sm:h-8 sm:w-8 ${feature.color}`} />
                      </div>
                    </div>
                    <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-[10px] sm:text-sm leading-tight">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Links / Быстрые ссылки */}
        <section className="py-6 sm:py-8 bg-background border-t border-b">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Link to="/catalog" className="group">
                <Card className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-300 hover:border-primary">
                  <CardContent className="p-0">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1.5 sm:mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm sm:text-base">Каталог</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Все товары</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/about" className="group">
                <Card className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-300 hover:border-primary">
                  <CardContent className="p-0">
                    <Star className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1.5 sm:mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm sm:text-base">О нас</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">О компании</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/contacts" className="group">
                <Card className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-300 hover:border-primary">
                  <CardContent className="p-0">
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1.5 sm:mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm sm:text-base">Контакты</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Связаться с нами</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/blog" className="group">
                <Card className="p-4 sm:p-6 text-center hover:shadow-lg transition-all duration-300 hover:border-primary">
                  <CardContent className="p-0">
                    <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1.5 sm:mb-2 text-primary group-hover:scale-110 transition-transform" />
                    <p className="font-semibold text-sm sm:text-base">Блог</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Полезные статьи</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Marketplaces */}
        <section className="py-6 sm:py-10 bg-gradient-primary text-primary-foreground">
          <div className="container mx-auto px-3 sm:px-4 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Найдите нас на маркетплейсах</h2>
            <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 text-primary-foreground/90">
              Мы представлены на крупнейших торговых площадках России
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
              <a href="https://www.wildberries.ru/seller/285549" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary">
                  Wildberries 1
                </Button>
              </a>
              <a href="https://www.wildberries.ru/seller/250051301" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary">
                  Wildberries 2
                </Button>
              </a>
              <a href="https://www.ozon.ru/seller/modanagolovu-2581934/?miniapp=seller_2581934" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary">
                  OZON 1
                </Button>
              </a>
              <a href="https://www.ozon.ru/seller/pugovka-1039508/?miniapp=seller_1039508" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="secondary">
                  OZON 2
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
