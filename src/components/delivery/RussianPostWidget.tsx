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
      if ((window as any).__pochtaWidgetMessageHandler) {
        window.removeEventListener('message', (window as any).__pochtaWidgetMessageHandler);
        delete (window as any).__pochtaWidgetMessageHandler;
      }
      
      // Останавливаем observer
      if ((window as any).__pochtaWidgetObserver) {
        (window as any).__pochtaWidgetObserver.disconnect();
        delete (window as any).__pochtaWidgetObserver;
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
              console.log('🔘 Кнопка "Подтвердить выбор" нажата');
              
              // Пытаемся получить данные из виджета через глобальные переменные или DOM
              const container = document.getElementById('ecom-widget');
              if (container) {
                // Проверяем, есть ли в контейнере информация о выбранном отделении
                const widgetIframe = container.querySelector('iframe');
                
                // Пробуем получить данные из глобальных переменных виджета
                const widgetData = (window as any).ecomWidgetData || (window as any).pochtaWidgetData;
                
                if (widgetData) {
                  console.log('✅ Найдены данные виджета в глобальных переменных:', widgetData);
                  if (onOfficeSelected) {
                    onOfficeSelected({
                      id: widgetData.id || widgetData.officeId || widgetData.index || '',
                      name: widgetData.name || widgetData.officeName || 'Отделение Почты России',
                      address: widgetData.address || widgetData.officeAddress || '',
                      postalCode: widgetData.postalCode || widgetData.index || '',
                      index: widgetData.index || widgetData.postalCode || '',
                    });
                  }
                  return;
                }
                
                // Если данных нет, используем данные из панели виджета (если она видна)
                // Виджет обычно показывает панель с информацией об отделении
                const infoPanel = container.querySelector('[class*="office"]') || 
                                 container.querySelector('[class*="selected"]') ||
                                 document.querySelector('[class*="pochta-office"]');
                
                if (infoPanel) {
                  console.log('✅ Найдена панель с информацией об отделении');
                  // Пытаемся извлечь данные из текста панели
                  const panelText = infoPanel.textContent || '';
                  const postalCodeMatch = panelText.match(/\d{6}/);
                  const addressMatch = panelText.match(/г\s+[\w\s]+|ул\s+[\w\s]+/);
                  
                  if (postalCodeMatch || addressMatch) {
                    const officeData = {
                      id: postalCodeMatch?.[0] || 'unknown',
                      name: 'Отделение Почты России',
                      address: addressMatch?.[0] || panelText.substring(0, 100),
                      postalCode: postalCodeMatch?.[0] || '',
                      index: postalCodeMatch?.[0] || '',
                    };
                    
                    console.log('📦 Извлечены данные из панели:', officeData);
                    
                    if (onOfficeSelected) {
                      onOfficeSelected(officeData);
                    }
                    return;
                  }
                }
                
                // Если ничего не найдено, просим пользователя выбрать отделение
                console.warn('⚠️ Не удалось автоматически определить выбранное отделение');
                setError('Пожалуйста, убедитесь, что вы выбрали отделение на карте. Если отделение выбрано, попробуйте обновить страницу и выбрать снова.');
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

