import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

// Расширяем Window для функции корзинного виджета
declare global {
  interface Window {
    ecomStartCartWidget?: (config: {
      id: number;
      target: string;
      cartValue: number;
      cartWeight: number;
      onSelect?: (data: any) => void;
    }) => void;
  }
}

interface PochtaCartWidgetProps {
  widgetId?: number;
  cartValue: number; // Сумма корзины в рублях
  cartWeight: number; // Вес корзины в граммах
  onSelect?: (data: {
    office: {
      id: string;
      name: string;
      address: string;
      postalCode: string;
      index: string;
    };
    cost: number;
    deliveryTime: string;
  }) => void;
}

/**
 * Корзинный виджет Почты России
 * Готовый виджет от Почты России для выбора доставки прямо в корзине
 * Документация: https://otpravka.pochta.ru/widget/help/#_2
 */
export const PochtaCartWidget = ({
  widgetId = 60084,
  cartValue,
  cartWeight,
  onSelect
}: PochtaCartWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!containerRef.current) {
      return;
    }

    // Создаем контейнер для виджета
    containerRef.current.innerHTML = '<div id="pochta-cart-widget" style="min-height: 400px; width: 100%"></div>';

    // Загружаем скрипт корзинного виджета
    const loadWidget = () => {
      // Проверяем, не загружен ли уже скрипт
      const existingScript = document.getElementById('pochta-cart-widget-script');
      if (existingScript && window.ecomStartCartWidget) {
        setTimeout(() => {
          initializeWidget();
        }, 100);
        return;
      }

      if (existingScript) {
        const checkFunction = setInterval(() => {
          if (window.ecomStartCartWidget) {
            clearInterval(checkFunction);
            initializeWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(checkFunction), 5000);
        return;
      }

      // Пробуем разные варианты URL скрипта
      const scriptUrls = [
        'https://widget.pochta.ru/cart/widget/widget.js',
        'https://widget.pochta.ru/map/widget/widget.js', // Альтернативный URL
        `https://widget.pochta.ru/cart/?widgetId=${widgetId}&mode=embed`, // Если виджет работает через iframe
      ];

      let currentUrlIndex = 0;

      const tryLoadScript = (urlIndex: number) => {
        if (urlIndex >= scriptUrls.length) {
          // Если все URL не сработали, пробуем iframe
          console.warn('Все варианты скрипта не сработали, пробуем iframe');
          tryIframe();
          return;
        }

        const script = document.createElement('script');
        script.id = 'pochta-cart-widget-script';
        script.src = scriptUrls[urlIndex];
        script.async = true;
        
        script.onload = () => {
          console.log(`✅ Скрипт корзинного виджета загружен с URL: ${scriptUrls[urlIndex]}`);
          setTimeout(() => {
            if (window.ecomStartCartWidget) {
              initializeWidget();
            } else {
              // Пробуем следующий URL
              console.warn('Функция ecomStartCartWidget не найдена, пробуем следующий URL');
              if (script.parentNode) {
                script.parentNode.removeChild(script);
              }
              tryLoadScript(urlIndex + 1);
            }
          }, 500);
        };
        
        script.onerror = () => {
          console.warn(`❌ Ошибка загрузки скрипта с URL: ${scriptUrls[urlIndex]}`);
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          // Пробуем следующий URL
          tryLoadScript(urlIndex + 1);
        };

        document.head.appendChild(script);
        scriptRef.current = script;
      };

      // Альтернативный способ через iframe
      const tryIframe = () => {
        if (!containerRef.current) return;

        console.log('Пробуем загрузить виджет через iframe');
        const iframeUrl = `https://widget.pochta.ru/cart/?widgetId=${widgetId}&cartValue=${cartValue}&cartWeight=${cartWeight}&mode=embed`;
        
        containerRef.current.innerHTML = `
          <iframe 
            id="pochta-cart-widget-iframe"
            src="${iframeUrl}"
            width="100%"
            height="500"
            style="border: none; min-height: 500px;"
            allow="geolocation"
          ></iframe>
        `;

        // Слушаем сообщения от iframe
        const handleMessage = (event: MessageEvent) => {
          if (!event.origin.includes('pochta.ru')) return;

          console.log('📨 Сообщение от виджета в iframe:', event.data);

          if (event.data && typeof event.data === 'object') {
            const data = event.data;
            
            // Обрабатываем разные форматы данных
            if (data.office || data.selectedOffice || data.officeId) {
              const officeData = data.office || data.selectedOffice || data;
              
              if (onSelect) {
                onSelect({
                  office: {
                    id: officeData.officeId || officeData.id || officeData.index || '',
                    name: officeData.officeName || officeData.name || 'Отделение Почты России',
                    address: officeData.address || officeData.fullAddress || '',
                    postalCode: officeData.postalCode || officeData.index || '',
                    index: officeData.index || officeData.postalCode || '',
                  },
                  cost: data.cost || data.deliveryCost || data.price || 0,
                  deliveryTime: data.deliveryTime || data.days || '5-7',
                });
              }
              
              setSelectedData(data);
              setLoading(false);
            }
          }
        };

        window.addEventListener('message', handleMessage);
        
        // Сохраняем обработчик для очистки
        (window as any).__pochtaIframeHandler = handleMessage;

        setLoading(false);
        setError(null);
      };

      tryLoadScript(0);

      document.head.appendChild(script);
      scriptRef.current = script;
    };

    // Инициализация виджета
    const initializeWidget = () => {
      if (!window.ecomStartCartWidget) {
        setError('Функция корзинного виджета не найдена. Проверьте, что скрипт загружен.');
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 Инициализируем корзинный виджет Почты России...', {
          widgetId,
          cartValue,
          cartWeight
        });

        // Инициализируем корзинный виджет
        window.ecomStartCartWidget({
          id: widgetId,
          target: 'pochta-cart-widget',
          cartValue: cartValue, // Сумма корзины в рублях
          cartWeight: cartWeight, // Вес корзины в граммах
          onSelect: (data: any) => {
            console.log('🎯 Виджет вернул данные о выбранной доставке:', data);
            
            // Сохраняем данные
            setSelectedData(data);
            
            // Обрабатываем данные от виджета
            if (data && onSelect) {
              // Виджет может возвращать данные в разных форматах
              const officeData = {
                office: {
                  id: data.officeId || data.id || data.index || data.postalCode || '',
                  name: data.officeName || data.name || 'Отделение Почты России',
                  address: data.address || data.fullAddress || '',
                  postalCode: data.postalCode || data.index || '',
                  index: data.index || data.postalCode || '',
                },
                cost: data.cost || data.deliveryCost || data.price || 0,
                deliveryTime: data.deliveryTime || data.days || data.deliveryDays || '5-7',
              };
              
              onSelect(officeData);
            }
            
            setLoading(false);
          }
        });
        
        console.log(`✅ Корзинный виджет инициализирован с ID ${widgetId}`);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Ошибка инициализации корзинного виджета:', err);
        setError(`Ошибка инициализации виджета: ${err.message}`);
        setLoading(false);
      }
    };

    loadWidget();

    // Очистка
    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      
      // Удаляем обработчик сообщений от iframe
      if ((window as any).__pochtaIframeHandler) {
        window.removeEventListener('message', (window as any).__pochtaIframeHandler);
        delete (window as any).__pochtaIframeHandler;
      }
      
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [widgetId, cartValue, cartWeight, onSelect]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Доставка Почтой России
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Загрузка виджета доставки...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">{error}</div>
              <div className="text-sm mt-2 space-y-1">
                <p><strong>Что делать:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Проверьте ID виджета в личном кабинете Почты России (otpravka.pochta.ru)</li>
                  <li>Убедитесь, что виджет с ID {widgetId} настроен как <strong>корзинный виджет</strong>, а не карточный</li>
                  <li>Убедитесь, что ваш домен ({window.location.hostname}) добавлен в белый список виджета</li>
                  <li>Проверьте настройки корзинного виджета в разделе "Виджеты" → "Корзинный виджет" личного кабинета</li>
                  <li>Убедитесь, что виджет опубликован (статус "Активен")</li>
                  <li>Если проблема сохраняется, обратитесь в поддержку: support@pochta.ru</li>
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">
                  Примечание: Если скрипт не загружается, виджет попытается загрузиться через iframe.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div ref={containerRef} className="w-full" />

        {selectedData && (
          <Alert className="mt-4">
            <AlertDescription>
              <p className="font-semibold mb-1">Выбрана доставка:</p>
              <p className="text-sm">
                {selectedData.officeName || selectedData.name || 'Отделение Почты России'}
              </p>
              {selectedData.cost && (
                <p className="text-sm font-semibold mt-1">
                  Стоимость доставки: {selectedData.cost} ₽
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <p>
              Выберите точку выдачи Почты России на карте выше. 
              Виджет автоматически рассчитает стоимость доставки на основе вашей корзины.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

