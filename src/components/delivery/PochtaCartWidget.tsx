import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

// Расширяем Window для функции корзинного виджета
declare global {
  interface Window {
    // Вариант 1: Объект конфигурации
    ecomStartCartWidget?: (config: {
      id: number;
      target: string;
      cartValue: number;
      cartWeight: number;
      callbackFunction?: (data: any) => void;
      onSelect?: (data: any) => void;
    }) => void;
    // Вариант 2: Отдельные параметры
    ecomStartCartWidget?: (
      id: number,
      target: string,
      cartValue: number,
      cartWeight: number,
      callbackFunction?: (data: any) => void
    ) => void;
    // Общий виджет (fallback)
    ecomStartWidget?: (config: {
      id: number;
      containerId: string;
      callbackFunction?: (data: any) => void;
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

      // Пробуем загрузить скрипт корзинного виджета
      const tryLoadScript = () => {
        // Удаляем предыдущий скрипт, если есть
        const existingScript = document.getElementById('pochta-cart-widget-script');
        if (existingScript && existingScript.parentNode) {
          existingScript.parentNode.removeChild(existingScript);
        }

        const script = document.createElement('script');
        script.id = 'pochta-cart-widget-script';
        // Пробуем разные варианты URL скрипта виджета
        const scriptUrls = [
          'https://widget.pochta.ru/cart/widget/widget.js',
          'https://widget.pochta.ru/widget/widget.js',
          'https://otpravka.pochta.ru/widget/widget.js',
        ];
        script.src = scriptUrls[0]; // Используем первый вариант
        script.async = true;
        script.crossOrigin = 'anonymous'; // Добавляем для CORS
        
        // Сохраняем ссылку на скрипт для использования в обработчиках
        const scriptElement = script;
        
        scriptElement.onload = () => {
          console.log('✅ Скрипт корзинного виджета загружен');
          setTimeout(() => {
            if (window.ecomStartCartWidget) {
              scriptRef.current = scriptElement;
              initializeWidget();
            } else {
              // Функция не найдена, пробуем iframe
              console.warn('Функция ecomStartCartWidget не найдена, пробуем iframe');
              if (scriptElement.parentNode) {
                scriptElement.parentNode.removeChild(scriptElement);
              }
              tryIframe();
            }
          }, 500);
        };
        
        scriptElement.onerror = () => {
          console.warn('❌ Ошибка загрузки скрипта корзинного виджета, пробуем iframe');
          if (scriptElement.parentNode) {
            scriptElement.parentNode.removeChild(scriptElement);
          }
          // Сразу переходим к iframe
          tryIframe();
        };

        document.head.appendChild(scriptElement);
        scriptRef.current = scriptElement;
      };

      // Альтернативный способ через iframe
      const tryIframe = () => {
        if (!containerRef.current) {
          setError('Контейнер виджета не найден');
          setLoading(false);
          return;
        }

        console.log('🔄 Пробуем загрузить виджет через iframe');
        
        // Пробуем разные варианты URL для iframe
        // Согласно документации, виджет корзины может быть доступен по разным URL
        const iframeUrls = [
          `https://widget.pochta.ru/cart/?widgetId=${widgetId}&cartValue=${cartValue}&cartWeight=${cartWeight}`,
          `https://widget.pochta.ru/map/?widgetId=${widgetId}&cartValue=${cartValue}&cartWeight=${cartWeight}`,
          `https://otpravka.pochta.ru/widget/?widgetId=${widgetId}&cartValue=${cartValue}&cartWeight=${cartWeight}`,
        ];

        const iframeUrl = iframeUrls[0]; // Используем первый вариант
        console.log('🔄 Загружаем iframe с URL:', iframeUrl);
        
        containerRef.current.innerHTML = `
          <iframe 
            id="pochta-cart-widget-iframe"
            src="${iframeUrl}"
            width="100%"
            height="500"
            style="border: none; min-height: 500px;"
            allow="geolocation"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          ></iframe>
        `;

        // Слушаем сообщения от iframe
        const handleMessage = (event: MessageEvent) => {
          if (!event.origin.includes('pochta.ru') && !event.origin.includes('widget.pochta.ru')) {
            return;
          }

          console.log('📨 Сообщение от виджета в iframe:', {
            origin: event.origin,
            data: event.data
          });

          if (event.data && typeof event.data === 'object') {
            const data = event.data;
            
            // Обрабатываем разные форматы данных
            if (data.office || data.selectedOffice || data.officeId || data.id || data.index) {
              const officeData = data.office || data.selectedOffice || data;
              
              console.log('✅ Получены данные офиса от виджета:', officeData);
              
              if (onSelect) {
                onSelect({
                  office: {
                    id: officeData.officeId || officeData.id || officeData.index || officeData.postalCode || '',
                    name: officeData.officeName || officeData.name || 'Отделение Почты России',
                    address: officeData.address || officeData.fullAddress || '',
                    postalCode: officeData.postalCode || officeData.index || '',
                    index: officeData.index || officeData.postalCode || '',
                  },
                  cost: data.cost || data.deliveryCost || data.price || 0,
                  deliveryTime: data.deliveryTime || data.days || data.deliveryDays || '5-7',
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

      tryLoadScript();
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

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Используем официальный callbackFunction виджета
        // Согласно документации: https://otpravka.pochta.ru/widget/help/#_2
        // Виджет возвращает данные через callbackFunction с полями:
        // - cashOfDelivery: стоимость в КОПЕЙКАХ (нужно разделить на 100)
        // - indexTo: индекс получателя (6 цифр)
        // - addressTo: полный адрес отделения
        // - cityTo: город получателя
        // - и другие поля
        
        // Создаем глобальную callback функцию для виджета
        const callbackFunction = (widgetData: any) => {
          console.log('🎯 Виджет вернул данные через callbackFunction:', widgetData);
          
          // Сохраняем данные
          setSelectedData(widgetData);
          
          // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Извлекаем данные согласно официальной документации
          if (widgetData && onSelect) {
            // cashOfDelivery приходит в КОПЕЙКАХ, нужно разделить на 100
            const costInRubles = widgetData.cashOfDelivery 
              ? Math.ceil(widgetData.cashOfDelivery / 100) 
              : (widgetData.cost || widgetData.deliveryCost || widgetData.price || 0);
            
            // Извлекаем индекс получателя
            const indexTo = widgetData.indexTo || 
                           widgetData.index || 
                           widgetData.postalCode || 
                           widgetData.officeId || 
                           '';
            
            // Извлекаем полный адрес
            const addressTo = widgetData.addressTo || 
                             widgetData.address || 
                             widgetData.fullAddress || 
                             '';
            
            // Извлекаем город
            const cityTo = widgetData.cityTo || 
                          widgetData.city || 
                          '';
            
            // Формируем полный адрес
            const fullAddress = addressTo 
              ? (cityTo ? `${cityTo}, ${addressTo}` : addressTo)
              : (cityTo || 'Адрес не указан');
            
            // Извлекаем срок доставки
            const deliveryTime = widgetData.deliveryTime || 
                               widgetData.days || 
                               widgetData.deliveryDays || 
                               '5-7';
            
            console.log('📦 Обработанные данные от виджета:', {
              costInRubles,
              costInKopecks: widgetData.cashOfDelivery,
              indexTo,
              addressTo,
              cityTo,
              fullAddress,
              deliveryTime
            });
            
            // Передаем данные в родительский компонент
            onSelect({
              office: {
                id: indexTo || widgetData.officeId || widgetData.id || '',
                name: widgetData.officeName || widgetData.name || 'Отделение Почты России',
                address: fullAddress,
                postalCode: indexTo,
                index: indexTo,
              },
              cost: costInRubles,
              deliveryTime: deliveryTime,
            });
          }
          
          setLoading(false);
        };
        
        // Сохраняем callback в глобальной области для виджета
        (window as any).__pochtaCartWidgetCallback = callbackFunction;

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем, что функция существует и имеет правильную сигнатуру
        // Согласно документации, виджет может использовать разные варианты инициализации
        if (typeof window.ecomStartCartWidget === 'function') {
          try {
            // Пробуем вариант с объектом конфигурации (наиболее распространенный)
            window.ecomStartCartWidget({
              id: widgetId,
              target: 'pochta-cart-widget',
              cartValue: cartValue, // Сумма корзины в рублях
              cartWeight: cartWeight, // Вес корзины в граммах
              callbackFunction: callbackFunction, // КРИТИЧЕСКИ ВАЖНО: Используем callbackFunction
            });
            console.log(`✅ Корзинный виджет инициализирован с ID ${widgetId}`);
          } catch (initError: any) {
            console.error('❌ Ошибка инициализации виджета (вариант 1):', initError);
            // Пробуем альтернативный вариант с отдельными параметрами
            try {
              if (window.ecomStartCartWidget.length >= 4) {
                (window.ecomStartCartWidget as any)(
                  widgetId,
                  'pochta-cart-widget',
                  cartValue,
                  cartWeight,
                  callbackFunction
                );
                console.log(`✅ Корзинный виджет инициализирован (вариант 2) с ID ${widgetId}`);
              } else {
                throw initError; // Пробрасываем ошибку дальше
              }
            } catch (initError2: any) {
              console.error('❌ Ошибка инициализации виджета (вариант 2):', initError2);
              setError(`Ошибка инициализации виджета: ${initError2.message || initError.message}`);
              setLoading(false);
              // Пробуем iframe как fallback
              tryIframe();
              return;
            }
          }
        } else if (typeof window.ecomStartWidget === 'function') {
          // Fallback на общий виджет, если корзинный не найден
          console.warn('⚠️ ecomStartCartWidget не найден, пробуем ecomStartWidget');
          try {
            window.ecomStartWidget({
              id: widgetId,
              containerId: 'pochta-cart-widget',
              callbackFunction: callbackFunction,
            });
            console.log(`✅ Общий виджет инициализирован с ID ${widgetId}`);
          } catch (initError: any) {
            console.error('❌ Ошибка инициализации общего виджета:', initError);
            setError(`Ошибка инициализации виджета: ${initError.message}`);
            setLoading(false);
            tryIframe();
            return;
          }
        } else {
          console.error('❌ Функция ecomStartCartWidget не найдена');
          setError('Функция корзинного виджета не найдена. Проверьте, что скрипт загружен.');
          setLoading(false);
          // Пробуем iframe как fallback
          tryIframe();
          return;
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Ошибка инициализации корзинного виджета:', err);
        setError(`Ошибка инициализации виджета: ${err.message}`);
        setLoading(false);
        // Пробуем iframe как fallback
        tryIframe();
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

