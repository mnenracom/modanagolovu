import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

// Расширяем Window для функции виджета
declare global {
  interface Window {
    ecomStartWidget?: (config: {
      id: number;
      callbackFunction: ((data: any) => void) | null;
      containerId: string;
    }) => void;
  }
}

interface RussianPostWidgetProps {
  city: string;
  region?: string;
  postalCode?: string;
  widgetId?: number; // ID виджета из личного кабинета
  onOfficeSelected?: (office: {
    id: string;
    name: string;
    address: string;
    postalCode: string;
    index?: string;
  }) => void;
}

/**
 * Виджет Почты России для выбора отделения
 * Используется как fallback, когда API заблокирован
 */
export const RussianPostWidget = ({ 
  city, 
  region, 
  postalCode,
  widgetId = 60084, // ID виджета по умолчанию (можно настроить в админ-панели)
  onOfficeSelected 
}: RussianPostWidgetProps) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!widgetRef.current) {
      return;
    }

    // Создаем контейнер для виджета точно как в документации
    widgetRef.current.innerHTML = '<div id="ecom-widget" style="height: 500px"></div>';

    // Глобальный обработчик postMessage для виджета
    const handleMessage = (event: MessageEvent) => {
      // Проверяем, что сообщение от виджета Почты России
      if (!event.origin.includes('pochta.ru') && !event.origin.includes('widget.pochta.ru')) {
        return;
      }

      console.log('📨 Получено сообщение от виджета:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data
      });

      // Виджет может отправлять данные в разных форматах
      if (event.data && typeof event.data === 'object') {
        const widgetData = event.data;

        // Формат 1: прямое событие выбора
        if (widgetData.event === 'office_selected' || widgetData.event === 'selected') {
          const officeData = widgetData.data || widgetData;
          console.log('✅ Офис выбран через postMessage:', officeData);
          if (onOfficeSelected) {
            onOfficeSelected({
              id: officeData.id || officeData.index || officeData.postalCode || '',
              name: officeData.name || officeData.officeName || 'Отделение Почты России',
              address: officeData.address || officeData.fullAddress || officeData.officeAddress || '',
              postalCode: officeData.postalCode || officeData.index || postalCode || '',
              index: officeData.index || officeData.postalCode || '',
            });
          }
          setLoading(false);
          return;
        }

        // Формат 2: данные содержат поля отделения
        if (widgetData.id || widgetData.address || widgetData.index || widgetData.postalCode) {
          console.log('✅ Найдены данные офиса в сообщении:', widgetData);
          if (onOfficeSelected) {
            onOfficeSelected({
              id: widgetData.id || widgetData.index || widgetData.postalCode || '',
              name: widgetData.name || widgetData.officeName || 'Отделение Почты России',
              address: widgetData.address || widgetData.fullAddress || widgetData.officeAddress || '',
              postalCode: widgetData.postalCode || widgetData.index || postalCode || '',
              index: widgetData.index || widgetData.postalCode || '',
            });
          }
          setLoading(false);
          return;
        }
      }

      // Попробуем парсить строку
      if (typeof event.data === 'string') {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.id || parsed.address || parsed.index || parsed.postalCode) {
            console.log('✅ Данные из строки JSON:', parsed);
            if (onOfficeSelected) {
              onOfficeSelected({
                id: parsed.id || parsed.index || parsed.postalCode || '',
                name: parsed.name || parsed.officeName || 'Отделение Почты России',
                address: parsed.address || parsed.fullAddress || parsed.officeAddress || '',
                postalCode: parsed.postalCode || parsed.index || postalCode || '',
                index: parsed.index || parsed.postalCode || '',
              });
            }
            setLoading(false);
          }
        } catch (e) {
          // Не JSON строка, игнорируем
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Загружаем скрипт виджета
    const loadWidget = () => {
      // Проверяем, не загружен ли уже скрипт
      const existingScript = document.getElementById('pochta-widget-script');
      if (existingScript && window.ecomStartWidget) {
        // Скрипт уже загружен, сразу инициализируем
        setTimeout(() => initializeWidget(), 100);
        return;
      }

      // Если скрипт есть, но функция еще не готова, ждем
      if (existingScript) {
        const checkFunction = setInterval(() => {
          if (window.ecomStartWidget) {
            clearInterval(checkFunction);
            initializeWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(checkFunction), 5000);
        return;
      }

      // Создаем и загружаем скрипт виджета
      const script = document.createElement('script');
      script.id = 'pochta-widget-script';
      script.src = 'https://widget.pochta.ru/map/widget/widget.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Скрипт виджета Почты России загружен');
        // Даем время скрипту на инициализацию
        setTimeout(() => {
          if (window.ecomStartWidget) {
            initializeWidget();
          } else {
            setError('Функция ecomStartWidget не найдена после загрузки скрипта');
            setLoading(false);
          }
        }, 200);
      };
      
      script.onerror = () => {
        console.error('Ошибка загрузки скрипта виджета Почты России');
        setError('Не удалось загрузить скрипт виджета. Проверьте подключение к интернету.');
        setLoading(false);
      };

      document.head.appendChild(script);
      scriptRef.current = script;
    };

    // Инициализируем виджет
    const initializeWidget = () => {
      if (!window.ecomStartWidget) {
        setError('Функция виджета не найдена. Проверьте, что скрипт загружен.');
        setLoading(false);
        return;
      }

      try {
        // Callback функция для обработки выбора отделения
        // Согласно документации виджета, callback получает объект с данными отделения
        const callbackFunction = (data: any) => {
          console.log('🔔 Callback вызван! Данные от виджета:', data);
          console.log('Тип данных:', typeof data);
          console.log('Ключи объекта:', data ? Object.keys(data) : 'null');
          
          if (!data) {
            console.warn('Виджет вернул пустые данные');
            setError('Виджет не вернул данные об отделении');
            setLoading(false);
            return;
          }
          
          if (onOfficeSelected) {
            // Виджет может передавать данные в разных форматах
            // Пробуем извлечь все возможные поля
            const officeData = {
              id: data.id || data.officeId || data.index || data.postalCode || String(data.id || ''),
              name: data.name || data.fullName || data.officeName || data.title || 'Отделение Почты России',
              address: data.address || data.fullAddress || data.addressString || data.officeAddress || data.street || '',
              postalCode: data.postalCode || data.index || data.postalIndex || postalCode || '',
              index: data.index || data.postalCode || data.postalIndex || '',
            };
            
            console.log('📦 Обработанные данные отделения:', officeData);
            
            // Проверяем, что есть хотя бы минимальные данные
            if (!officeData.id && !officeData.postalCode) {
              console.error('Недостаточно данных от виджета:', data);
              setError('Виджет вернул неполные данные. Попробуйте выбрать другое отделение.');
              setLoading(false);
              return;
            }
            
            onOfficeSelected(officeData);
          }
          
          setLoading(false);
        };

        // Проверяем наличие контейнера
        const container = document.getElementById('ecom-widget');
        if (!container) {
          setError('Контейнер виджета не найден');
          setLoading(false);
          return;
        }

        // Инициализируем виджет
        window.ecomStartWidget({
          id: widgetId,
          callbackFunction: callbackFunction,
          containerId: 'ecom-widget'
        });

      } catch (err: any) {
        console.error('Ошибка инициализации виджета:', err);
        setError(`Ошибка инициализации виджета: ${err.message}`);
        setLoading(false);
      }
    };

    loadWidget();

    // Очистка при размонтировании
    return () => {
      // Удаляем обработчик сообщений
      window.removeEventListener('message', handleMessage);
      
      // Останавливаем observer
      if ((window as any).__pochtaWidgetObserver) {
        (window as any).__pochtaWidgetObserver.disconnect();
        delete (window as any).__pochtaWidgetObserver;
      }
      
      // Очищаем интервал проверки глобальных данных
      if ((window as any).__pochtaWidgetCheckInterval) {
        clearInterval((window as any).__pochtaWidgetCheckInterval);
        delete (window as any).__pochtaWidgetCheckInterval;
      }
      
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
    };
  }, [widgetId, onOfficeSelected]); // Не добавляем city, region, postalCode в зависимости, так как виджет сам определяет местоположение

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Выбор отделения Почты России
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Загрузка виджета...</span>
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
                  <li>Убедитесь, что ваш домен добавлен в белый список виджета</li>
                  <li>Проверьте настройки виджета в разделе "Виджеты" личного кабинета</li>
                  <li>Если проблема сохраняется, обратитесь в поддержку: support@pochta.ru</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div ref={widgetRef} className="w-full" />

        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <p className="mb-2">
              Выберите отделение Почты России на карте выше. После выбора отделения нажмите кнопку "Подтвердить выбор" ниже.
            </p>
            {city && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Город: {city}{region ? `, ${region}` : ''}
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Кнопка для ручного подтверждения выбора отделения */}
        {/* Виджет может не вызывать callback автоматически, поэтому добавляем кнопку */}
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              console.log('🔄 Ручное подтверждение выбора...');
              
              // Функция извлечения данных из DOM
              const extractOfficeFromDOM = (element: Element) => {
                const text = element.textContent || '';
                const html = element.innerHTML || '';
                
                // Ищем индекс (6 цифр)
                const indexMatch = text.match(/\b(\d{6})\b/) || html.match(/\b(\d{6})\b/);
                // Ищем адрес
                const addressMatch = text.match(/Адрес[:\s]+([^\n\r]+)/i) || 
                                    text.match(/г\s+[\w\s]+(?:,\s*ул\s+[\w\s]+)?/i);
                // Ищем название отделения
                const nameMatch = text.match(/Почта[:\s]*№?\s*(\d+)/i) ||
                                 text.match(/Отделение[:\s]+([^\n\r]+)/i);
                
                if (indexMatch && indexMatch[1]) {
                  return {
                    id: indexMatch[1],
                    index: indexMatch[1],
                    postalCode: indexMatch[1],
                    address: addressMatch ? addressMatch[1].trim() : text.substring(0, 100),
                    name: nameMatch ? nameMatch[0] : 'Отделение Почты России'
                  };
                }
                
                return null;
              };
              
              // 1. Ищем данные в iframe виджета
              const iframe = document.querySelector('iframe[src*="pochta.ru"]') as HTMLIFrameElement;
              if (iframe) {
                try {
                  const iframeWindow = iframe.contentWindow;
                  if (iframeWindow && (iframeWindow as any).ecomWidgetData) {
                    console.log('🎯 Данные из iframe:', (iframeWindow as any).ecomWidgetData);
                    const widgetData = (iframeWindow as any).ecomWidgetData;
                    if (onOfficeSelected) {
                      onOfficeSelected({
                        id: widgetData.id || widgetData.index || '',
                        name: widgetData.name || 'Отделение Почты России',
                        address: widgetData.address || '',
                        postalCode: widgetData.postalCode || widgetData.index || '',
                        index: widgetData.index || widgetData.postalCode || '',
                      });
                    }
                    return;
                  }
                } catch (e) {
                  console.log('⚠️ Нет доступа к iframe (CORS):', e);
                }
              }
              
              // 2. Ищем в глобальном объекте
              if ((window as any).ecomWidgetData) {
                console.log('🌍 Глобальные данные:', (window as any).ecomWidgetData);
                const widgetData = (window as any).ecomWidgetData;
                if (onOfficeSelected) {
                  onOfficeSelected({
                    id: widgetData.id || widgetData.index || '',
                    name: widgetData.name || 'Отделение Почты России',
                    address: widgetData.address || '',
                    postalCode: widgetData.postalCode || widgetData.index || '',
                    index: widgetData.index || widgetData.postalCode || '',
                  });
                }
                return;
              }
              
              // 3. Парсим данные из UI виджета
              const panels = document.querySelectorAll('[class*="office"], [class*="selected"], [class*="widget-panel"], [id*="office"]');
              for (const panel of Array.from(panels)) {
                const officeData = extractOfficeFromDOM(panel);
                if (officeData) {
                  console.log('📦 Используем данные из UI:', officeData);
                  if (onOfficeSelected) {
                    onOfficeSelected(officeData);
                  }
                  return;
                }
              }
              
              // 4. Ищем в контейнере виджета
              const container = document.getElementById('ecom-widget');
              if (container) {
                const officeData = extractOfficeFromDOM(container);
                if (officeData) {
                  console.log('📦 Данные из контейнера виджета:', officeData);
                  if (onOfficeSelected) {
                    onOfficeSelected(officeData);
                  }
                  return;
                }
              }
              
              // 5. Если ничего не нашли, используем fallback
              console.log('⚠️ Данные не найдены, используем fallback');
              if (onOfficeSelected) {
                onOfficeSelected({
                  id: 'unknown',
                  index: postalCode || '652600',
                  postalCode: postalCode || '652600',
                  address: city ? `г ${city}` : 'Выбрано отделение Почты России',
                  name: 'Отделение Почты России',
                });
              }
            }}
            className="w-full"
            size="lg"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Подтвердить выбор отделения
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

