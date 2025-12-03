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
        type: typeof event.data,
        keys: event.data && typeof event.data === 'object' ? Object.keys(event.data) : 'N/A'
      });
      
      // Логируем полную структуру данных для отладки
      if (event.data && typeof event.data === 'object') {
        console.log('📋 Полная структура данных:', JSON.stringify(event.data, null, 2));
      }

      // Виджет может отправлять данные в разных форматах
      if (event.data && typeof event.data === 'object') {
        const widgetData = event.data;
        
        // Логируем все ключи для отладки
        const keys = Object.keys(widgetData);
        console.log('🔑 Ключи в данных виджета:', keys);
        console.log('📋 Полные данные:', JSON.stringify(widgetData, null, 2));

        // Формат 1: прямое событие выбора
        if (widgetData.event === 'office_selected' || widgetData.event === 'selected' || widgetData.type === 'office_selected') {
          const officeData = widgetData.data || widgetData;
          console.log('✅ Офис выбран через postMessage (формат 1):', officeData);
          if (onOfficeSelected) {
            onOfficeSelected({
              id: officeData.id || officeData.index || officeData.postalCode || officeData.postal_index || '',
              name: officeData.name || officeData.officeName || officeData.title || 'Отделение Почты России',
              address: officeData.address || officeData.fullAddress || officeData.officeAddress || officeData.addressString || '',
              postalCode: officeData.postalCode || officeData.index || officeData.postal_index || postalCode || '',
              index: officeData.index || officeData.postalCode || officeData.postal_index || '',
            });
          }
          setLoading(false);
          return;
        }

        // Формат 2: данные содержат поля отделения напрямую
        if (widgetData.id || widgetData.address || widgetData.index || widgetData.postalCode || widgetData.postal_index || widgetData.officeId) {
          console.log('✅ Найдены данные офиса в сообщении (формат 2):', widgetData);
          if (onOfficeSelected) {
            onOfficeSelected({
              id: widgetData.id || widgetData.officeId || widgetData.index || widgetData.postalCode || widgetData.postal_index || '',
              name: widgetData.name || widgetData.officeName || widgetData.title || 'Отделение Почты России',
              address: widgetData.address || widgetData.fullAddress || widgetData.officeAddress || widgetData.addressString || '',
              postalCode: widgetData.postalCode || widgetData.index || widgetData.postal_index || postalCode || '',
              index: widgetData.index || widgetData.postalCode || widgetData.postal_index || '',
            });
          }
          setLoading(false);
          return;
        }
        
        // Формат 3: данные могут быть вложены в другие поля
        if (widgetData.office || widgetData.selectedOffice || widgetData.result) {
          const officeData = widgetData.office || widgetData.selectedOffice || widgetData.result;
          console.log('✅ Найдены данные офиса в вложенном объекте (формат 3):', officeData);
          if (officeData && (officeData.id || officeData.index || officeData.postalCode)) {
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
        }
        
        // Если ничего не подошло, но есть данные - пробуем извлечь что можем
        console.log('⚠️ Неизвестный формат данных виджета, пробуем извлечь что можем:', widgetData);
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

    // Функция нормализации данных виджета
    const normalizeWidgetData = (widgetData: any) => {
      // Виджет может возвращать данные в разных форматах
      // Пытаемся извлечь информацию из разных полей
      
      return {
        // ID отделения
        id: widgetData.id || widgetData.officeId || widgetData.number || 
            widgetData.postalCode || widgetData.index || widgetData.postal_index || `office_${Date.now()}`,
        
        // Название
        name: widgetData.name || widgetData.title || 
              widgetData.officeName || 'Отделение Почты России',
        
        // Адрес
        address: widgetData.address || widgetData.fullAddress || 
                 widgetData.postalAddress || widgetData.location || 
                 widgetData.addressString || widgetData.officeAddress || '',
        
        // Индекс
        postalCode: widgetData.postalCode || widgetData.index || 
                    widgetData.zipCode || widgetData.postal_index || '',
        
        // Дополнительные поля
        index: widgetData.index || widgetData.postalCode || widgetData.postal_index || '',
        latitude: widgetData.latitude || widgetData.lat,
        longitude: widgetData.longitude || widgetData.lng,
        
        // Информация о доставке (если есть)
        deliveryCost: widgetData.cost || widgetData.deliveryCost || widgetData.price || 300,
        deliveryDays: widgetData.days || widgetData.deliveryDays || widgetData.deliveryTime || 5,
        
        // Контактная информация
        phone: widgetData.phone || widgetData.phoneNumber,
        workHours: widgetData.workHours || widgetData.schedule || widgetData.workingTime,
        
        // Тип точки
        type: widgetData.type || widgetData.kind || 'POST_OFFICE'
      };
    };

    // Инициализируем виджет
    const initializeWidget = () => {
      if (!window.ecomStartWidget) {
        setError('Функция виджета не найдена. Проверьте, что скрипт загружен.');
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 Инициализируем виджет с callback...');
        
        // ВАЖНО: передаём callback функцию, а не null!
        const callbackFunction = (data: any) => {
          console.log('🎯 Callback виджета вызван!', data);
          console.log('Тип данных:', typeof data);
          console.log('Ключи объекта:', data ? Object.keys(data) : 'null');
          
          if (!data) {
            console.warn('Виджет вернул пустые данные');
            setError('Виджет не вернул данные об отделении');
            setLoading(false);
            return;
          }
          
          // Нормализуем данные
          const officeData = normalizeWidgetData(data);
          console.log('📦 Нормализованные данные:', officeData);
          
          // Сохраняем в глобальную переменную для ручного доступа
          (window as any).lastSelectedOffice = officeData;
          
          if (onOfficeSelected) {
            // Вызываем обработчик с нормализованными данными
            onOfficeSelected({
              id: officeData.id,
              name: officeData.name,
              address: officeData.address,
              postalCode: officeData.postalCode,
              index: officeData.index,
            });
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

        // Инициализируем виджет с callback функцией
        window.ecomStartWidget({
          id: widgetId,
          callbackFunction: callbackFunction, // ВАЖНО: передаём функцию, а не null!
          containerId: 'ecom-widget'
        });
        
        console.log(`✅ Виджет инициализирован с ID ${widgetId}`);

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
            <h4 className="font-semibold mb-2">Как выбрать отделение:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-2 mb-2">
              <li>Найдите нужный город на карте</li>
              <li>Нажмите на метку отделения Почты России</li>
              <li>В появившейся панели нажмите "Выбрать"</li>
              <li>После этого нажмите кнопку "Подтвердить выбор отделения" ниже</li>
            </ol>
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
              console.log('🔄 Проверяем глобальные данные...');
              
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
              
              // 1. Из глобальной переменной (если виджет её устанавливает)
              if ((window as any).lastSelectedOffice) {
                console.log('✅ Данные из lastSelectedOffice:', (window as any).lastSelectedOffice);
                const officeData = normalizeWidgetData((window as any).lastSelectedOffice);
                if (onOfficeSelected) {
                  onOfficeSelected({
                    id: officeData.id,
                    name: officeData.name,
                    address: officeData.address,
                    postalCode: officeData.postalCode,
                    index: officeData.index,
                  });
                }
                return;
              }
              
              // 2. Ищем данные в iframe виджета
              const iframe = document.querySelector('iframe[src*="pochta.ru"]') as HTMLIFrameElement;
              if (iframe) {
                try {
                  const iframeWindow = iframe.contentWindow;
                  if (iframeWindow && (iframeWindow as any).ecomWidgetData) {
                    console.log('🎯 Данные из iframe:', (iframeWindow as any).ecomWidgetData);
                    const widgetData = normalizeWidgetData((iframeWindow as any).ecomWidgetData);
                    if (onOfficeSelected) {
                      onOfficeSelected({
                        id: widgetData.id,
                        name: widgetData.name,
                        address: widgetData.address,
                        postalCode: widgetData.postalCode,
                        index: widgetData.index,
                      });
                    }
                    return;
                  }
                } catch (e) {
                  console.log('⚠️ Нет доступа к iframe (CORS):', e);
                }
              }
              
              // 3. Ищем в глобальном объекте
              if ((window as any).ecomWidgetData) {
                console.log('🌍 Глобальные данные:', (window as any).ecomWidgetData);
                const widgetData = normalizeWidgetData((window as any).ecomWidgetData);
                if (onOfficeSelected) {
                  onOfficeSelected({
                    id: widgetData.id,
                    name: widgetData.name,
                    address: widgetData.address,
                    postalCode: widgetData.postalCode,
                    index: widgetData.index,
                  });
                }
                return;
              }
              
              // 4. Парсим данные из UI виджета
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
              
              // 5. Ищем в контейнере виджета
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
              
              // 6. Если ничего не нашли, используем fallback
              console.log('⚠️ Данные не найдены, используем fallback');
              if (onOfficeSelected) {
                onOfficeSelected({
                  id: 'default_office',
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

