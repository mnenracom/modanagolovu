import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useCart } from '@/hooks/useCart';
import { useCartPricing } from '@/hooks/useCartPricing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, Loader2, CheckCircle2, AlertCircle, Package, RefreshCw } from 'lucide-react';
import { russianPostService, PostOffice, AddressData, DeliveryCalculation } from '@/services/russianPostService';

// Получаем ID виджета из настроек
let widgetIdCache: number | null = null;
const getWidgetId = async (): Promise<number> => {
  if (widgetIdCache) return widgetIdCache;
  try {
    const credentials = await russianPostService.getApiCredentials();
    widgetIdCache = credentials.widgetId || 60084;
    return widgetIdCache;
  } catch {
    return 60084;
  }
};
import { Badge } from '@/components/ui/badge';
import { RussianPostWidget } from '@/components/delivery/RussianPostWidget';
import { PochtaCartWidget } from '@/components/delivery/PochtaCartWidget';

const DeliverySelection = () => {
  const { items, getTotalPrice } = useCart();
  const pricing = useCartPricing();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [useWidget, setUseWidget] = useState(false); // Флаг для использования виджета
  const [apiError, setApiError] = useState<string | null>(null);
  const [widgetDeliveryData, setWidgetDeliveryData] = useState<{
    office: any;
    cost: number;
    deliveryTime: string;
  } | null>(null);
  
  // Рассчитываем вес корзины (примерно 100г на товар)
  const getCartWeight = (): number => {
    return items.reduce((total, item) => {
      return total + (item.quantity * 100);
    }, 0);
  };
  
  // Данные адреса
  const [addressData, setAddressData] = useState<AddressData>({
    city: '',
    region: '',
    postalCode: '',
  });
  
  // Список точек выдачи
  const [postOffices, setPostOffices] = useState<PostOffice[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<PostOffice | null>(null);
  
  // Расчет стоимости доставки
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculation | null>(null);
  
  // Адрес отправителя (можно вынести в настройки)
  const senderAddress: AddressData = {
    city: 'Москва', // TODO: получить из настроек
    postalCode: '101000',
  };

  // Автоматическое определение города по геолокации (только для HTTPS)
  useEffect(() => {
    // Геолокация работает только на HTTPS или localhost
    if (!addressData.city && navigator.geolocation && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Используем обратное геокодирование для определения города
            // В реальном приложении можно использовать API Яндекс.Карт или Google Maps
            // Для упрощения просто запрашиваем у пользователя
            // Можно добавить интеграцию с API геокодирования
          } catch (error) {
            // Тихо игнорируем ошибки геолокации
          }
        },
        (error) => {
          // Тихо игнорируем ошибки геолокации (это нормально для HTTP)
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Проверка при загрузке страницы
  useEffect(() => {
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
  }, [items.length, pricing.orderType, navigate]);

  // Поиск точек выдачи
  const handleSearchPostOffices = async () => {
    if (!addressData.city) {
      toast.error('Укажите город');
      return;
    }

    setSearching(true);
    setApiError(null);
    setUseWidget(false);
    
    try {
      const offices = await russianPostService.searchPostOffices(addressData);
      setPostOffices(offices);
      
      if (offices.length === 0) {
        toast.error('Точки выдачи не найдены. Проверьте правильность названия города и настройки API ключа в админ-панели.');
      } else {
        toast.success(`Найдено точек выдачи: ${offices.length}`);
      }
    } catch (error: any) {
      console.error('Ошибка поиска точек выдачи:', error);
      
      // Если API заблокирован или не работает, предлагаем использовать виджет
      if (error.message?.includes('417') || 
          error.message?.includes('заблокирован') || 
          error.message?.includes('CORS') ||
          error.message?.includes('Failed to fetch')) {
        setApiError(error.message);
        setUseWidget(true);
        toast.info('API недоступен. Используется виджет Почты России для выбора отделения.');
      } else {
        toast.error(error.message || 'Не удалось найти точки выдачи');
      }
    } finally {
      setSearching(false);
    }
  };

  // Обработка выбора отделения из виджета
  const handleWidgetOfficeSelected = (office: {
    id: string;
    name: string;
    address: string;
    postalCode: string;
    index?: string;
  }) => {
    console.log('🎯 handleWidgetOfficeSelected вызван с данными:', office);
    
    // Преобразуем данные виджета в формат PostOffice
    const postOffice: PostOffice = {
      id: office.id || office.postalCode || office.index || 'unknown',
      name: office.name || 'Отделение Почты России',
      address: office.address || '',
      latitude: 0, // Виджет может не предоставлять координаты
      longitude: 0,
      type: 'post_office',
    };
    
    console.log('📮 Преобразовано в PostOffice:', postOffice);
    
    // Устанавливаем выбранное отделение
    setSelectedOffice(postOffice);
    
    // Автоматически рассчитываем доставку
    calculateDeliveryForOffice(postOffice);
    
    toast.success('Отделение выбрано через виджет');
  };

  // Расчет доставки для выбранного отделения
  const calculateDeliveryForOffice = async (office: PostOffice) => {
    setCalculating(true);
    
    try {
      // Рассчитываем общий вес заказа
      const totalWeight = items.reduce((sum, item) => {
        return sum + (item.quantity * 100); // Примерно 100г на товар
      }, 0);

      // Извлекаем почтовый индекс
      const postalCode = office.address.match(/\d{6}/)?.[0] || 
                        (office as any).postalCode || 
                        (office as any).index || 
                        addressData.postalCode || 
                        '';

      console.log('📊 Параметры расчета доставки:', {
        from: senderAddress,
        to: { city: addressData.city, postalCode },
        weight: totalWeight,
        value: getTotalPrice()
      });

      let calculation: DeliveryCalculation | null = null;

      // Рассчитываем через API (без fallback)
      calculation = await russianPostService.calculateDelivery(
        senderAddress,
        {
          city: addressData.city,
          postalCode: postalCode,
        },
        totalWeight,
        getTotalPrice()
      );

      console.log('✅ Расчет доставки через API успешен:', calculation);

      if (calculation) {
        setDeliveryCalculation(calculation);
        toast.success(`Стоимость доставки: ${calculation.cost} ₽, срок: ${calculation.deliveryTime} дней`);
        
        // Прокручиваем к кнопке оплаты
        setTimeout(() => {
          const paymentButton = document.getElementById('payment-button') || 
                               document.querySelector('[data-payment-button]');
          if (paymentButton) {
            paymentButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('❌ Ошибка при расчете доставки:', error);
      toast.error(error.message || 'Не удалось рассчитать стоимость доставки. Проверьте настройки API.');
      setDeliveryCalculation(null);
    } finally {
      setCalculating(false);
    }
  };

  // Выбор точки выдачи и расчет стоимости (для списка отделений через API)
  const handleSelectOffice = async (office: PostOffice) => {
    console.log('📮 Выбрано отделение:', office);
    setSelectedOffice(office);
    calculateDeliveryForOffice(office);
  };

  // Переход к оплате
  const handleProceedToPayment = () => {
    if (!selectedOffice || !deliveryCalculation) {
      toast.error('Выберите точку выдачи');
      return;
    }

    // Сохраняем данные доставки в sessionStorage для использования на странице оплаты
    sessionStorage.setItem('deliveryData', JSON.stringify({
      office: selectedOffice,
      calculation: deliveryCalculation,
      address: addressData,
    }));

    navigate('/payment');
  };

  if (items.length === 0) {
    return null;
  }

  if (pricing.orderType === 'wholesale') {
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

          <h1 className="text-4xl font-bold mb-8">Выбор доставки</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Форма поиска и выбор точки */}
            <div className="lg:col-span-2 space-y-6">
              {/* Поиск по адресу */}
              <Card>
                <CardHeader>
                  <CardTitle>Адрес доставки</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="city">Город *</Label>
                    <Input
                      id="city"
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      placeholder="Например: Москва"
                    />
                  </div>
                  <div>
                    <Label htmlFor="region">Регион</Label>
                    <Input
                      id="region"
                      value={addressData.region || ''}
                      onChange={(e) => setAddressData({ ...addressData, region: e.target.value })}
                      placeholder="Например: Московская область"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Почтовый индекс</Label>
                    <Input
                      id="postalCode"
                      value={addressData.postalCode || ''}
                      onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                      placeholder="Например: 101000"
                    />
                  </div>
                  <Button 
                    onClick={handleSearchPostOffices} 
                    disabled={searching || !addressData.city}
                    className="w-full"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Поиск точек выдачи...
                      </>
                    ) : (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Найти точки выдачи
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Виджет Почты России (если API не работает) */}
              {useWidget && (
                <>
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      API Почты России временно недоступен. Используйте виджет для выбора отделения.
                      {apiError && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Ошибка: {apiError}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                  
                  {/* Корзинный виджет Почты России */}
                  <PochtaCartWidget
                    widgetId={60084}
                    cartValue={getTotalPrice()}
                    cartWeight={getCartWeight()}
                    onSelect={(data) => {
                      console.log('✅ Данные доставки от корзинного виджета:', data);
                      setWidgetDeliveryData(data);
                      
                      // Преобразуем данные виджета в формат для расчета
                      const widgetOffice: PostOffice = {
                        id: data.office.id || data.office.index || 'widget_office',
                        name: data.office.name || 'Отделение Почты России',
                        address: data.office.address || '',
                        latitude: 0,
                        longitude: 0,
                        workingHours: '',
                        distance: null,
                        type: 'post_office',
                      };
                      
                      setSelectedOffice(widgetOffice);
                      setDeliveryCalculation({
                        cost: data.cost,
                        deliveryTime: data.deliveryTime,
                        type: 'standard',
                        description: 'Доставка Почтой России',
                      });
                      
                      toast.success(`Доставка выбрана: ${data.cost} ₽`);
                    }}
                  />
                  
                  {/* Старый виджет (оставляем как fallback) */}
                  <div className="mt-4">
                    <RussianPostWidget
                      city={addressData.city}
                      region={addressData.region}
                      postalCode={addressData.postalCode}
                      widgetId={60084}
                      onOfficeSelected={handleWidgetOfficeSelected}
                    />
                  </div>
                  
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUseWidget(false);
                        setApiError(null);
                        handleSearchPostOffices();
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Попробовать API снова
                    </Button>
                  </div>
                </>
              )}

              {/* Список точек выдачи (через API) */}
              {!useWidget && postOffices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Выберите точку выдачи</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {postOffices.map((office) => (
                        <div
                          key={office.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedOffice?.id === office.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectOffice(office)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold">{office.name}</h3>
                                {selectedOffice?.id === office.id && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{office.address}</p>
                              {office.workingHours && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  Часы работы: {office.workingHours}
                                </p>
                              )}
                              {office.distance && (
                                <Badge variant="outline" className="text-xs">
                                  {office.distance < 1000 
                                    ? `${office.distance} м`
                                    : `${(office.distance / 1000).toFixed(1)} км`
                                  }
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Расчет стоимости доставки */}
              {calculating && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>Рассчитываем стоимость доставки...</AlertDescription>
                </Alert>
              )}

              {selectedOffice && deliveryCalculation && !calculating && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Стоимость доставки
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Стоимость доставки:</span>
                      <span className="text-2xl font-bold text-primary">
                        {deliveryCalculation.cost.toLocaleString()} ₽
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Срок доставки:</span>
                      <span className="font-semibold">{deliveryCalculation.deliveryTime} дней</span>
                    </div>
                    {deliveryCalculation.description && (
                      <p className="text-sm text-muted-foreground">{deliveryCalculation.description}</p>
                    )}
                    <Button 
                      id="payment-button"
                      data-payment-button
                      onClick={handleProceedToPayment} 
                      size="lg" 
                      className="w-full"
                    >
                      Перейти к оплате
                      <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Итоговая информация */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Ваш заказ</CardTitle>
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
                        {getTotalPrice().toLocaleString()} ₽
                      </span>
                    </div>
                    {deliveryCalculation && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Доставка:</span>
                        <span className="font-semibold">
                          {deliveryCalculation.cost.toLocaleString()} ₽
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Итого:</span>
                      <span className="text-primary">
                        {((deliveryCalculation?.cost || 0) + getTotalPrice()).toLocaleString()} ₽
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

export default DeliverySelection;

