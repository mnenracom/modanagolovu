import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
        const callbackFunction = (data: any) => {
          console.log('Выбрано отделение из виджета:', data);
          
          if (onOfficeSelected && data) {
            // Преобразуем данные виджета в наш формат
            onOfficeSelected({
              id: data.id || data.index || data.postalCode || '',
              name: data.name || data.fullName || 'Отделение Почты России',
              address: data.address || data.fullAddress || data.addressString || '',
              postalCode: data.postalCode || data.index || postalCode || '',
              index: data.index || data.postalCode || '',
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
            Выберите отделение Почты России на карте выше. После выбора отделение будет автоматически добавлено в заказ.
            {city && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Город: {city}{region ? `, ${region}` : ''}
              </span>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

