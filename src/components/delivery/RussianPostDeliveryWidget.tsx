import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin } from 'lucide-react';

// Расширяем Window для функции виджета
declare global {
  interface Window {
    ecomStartWidget?: (config: {
      id: number;
      callbackFunction?: (data: any) => void;
      containerId: string;
      weight?: number;
      sumoc?: number;
      start_location?: string;
      startZip?: string;
      order_lines?: Array<{
        quantity: number;
        length: number;
        width: number;
        height: number;
      }>;
    }) => void;
    resetSelectedPlacemarkInEcomWidget?: () => void;
  }
}

interface RussianPostDeliveryWidgetProps {
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
 * Виджет карты Почты России для выбора ПВЗ
 * Интеграция официального виджета от Почты России
 */
export const RussianPostDeliveryWidget = ({
  widgetId = 60084,
  cartValue,
  cartWeight,
  onSelect
}: RussianPostDeliveryWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Создаем контейнер для виджета
    const containerId = 'ecom-widget';
    containerRef.current.innerHTML = `<div id="${containerId}" style="height: 500px; width: 100%"></div>`;

    // Глобальная функция обратного вызова для виджета
    const callbackpochta = (data: any) => {
      console.log('🎯 Виджет вернул данные:', data);
      
      if (!data) {
        console.warn('⚠️ Виджет вернул пустые данные');
        return;
      }

      // Извлекаем данные согласно документации Почты России
      // cashOfDelivery - стоимость доставки в КОПЕЙКАХ
      const cashOfDelivery = data.cashOfDelivery || data.cost || 0;
      const costInRubles = cashOfDelivery ? Math.ceil(cashOfDelivery / 100) : 0;

      // indexTo - индекс получателя (6 цифр)
      const indexTo = data.indexTo || data.index || data.postalCode || '';

      // addressTo - полный адрес отделения
      const addressTo = data.addressTo || data.address || data.fullAddress || '';

      // cityTo - город получателя
      const cityTo = data.cityTo || data.city || '';

      // Формируем полный адрес
      const fullAddress = addressTo 
        ? (cityTo ? `${cityTo}, ${addressTo}` : addressTo)
        : (cityTo || 'Адрес не указан');

      // Название отделения
      const officeName = data.officeName || data.name || 'Отделение Почты России';

      // Срок доставки (если есть)
      const deliveryTime = data.deliveryTime || data.days || data.deliveryDays || '5-7';

      console.log('📦 Обработанные данные от виджета:', {
        costInRubles,
        costInKopecks: cashOfDelivery,
        indexTo,
        addressTo,
        cityTo,
        fullAddress,
        officeName,
        deliveryTime
      });

      // Передаем данные в родительский компонент
      if (onSelect) {
        onSelect({
          office: {
            id: indexTo || data.officeId || data.id || '',
            name: officeName,
            address: fullAddress,
            postalCode: indexTo,
            index: indexTo,
          },
          cost: costInRubles,
          deliveryTime: deliveryTime,
        });
      }
    };

    // Сохраняем callback в глобальной области
    (window as any).callbackpochta = callbackpochta;

    // Загружаем скрипт виджета
    const loadWidget = () => {
      // Проверяем, не загружен ли уже скрипт
      const existingScript = document.getElementById('pochta-widget-script');
      if (existingScript && window.ecomStartWidget) {
        initializeWidget(callbackpochta);
        return;
      }

      if (existingScript) {
        const checkFunction = setInterval(() => {
          if (window.ecomStartWidget) {
            clearInterval(checkFunction);
            initializeWidget(callbackpochta);
          }
        }, 100);
        setTimeout(() => clearInterval(checkFunction), 5000);
        return;
      }

      // Создаем скрипт
      const script = document.createElement('script');
      script.id = 'pochta-widget-script';
      script.src = 'https://widget.pochta.ru/map/widget/widget.js';
      script.async = true;

      script.onload = () => {
        console.log('✅ Скрипт виджета Почты России загружен');
        setTimeout(() => {
          if (window.ecomStartWidget) {
            scriptRef.current = script;
            initializeWidget(callbackpochta);
          } else {
            setError('Функция ecomStartWidget не найдена после загрузки скрипта');
            setLoading(false);
          }
        }, 500);
      };

      script.onerror = () => {
        console.error('❌ Ошибка загрузки скрипта виджета');
        setError('Не удалось загрузить виджет Почты России. Проверьте подключение к интернету.');
        setLoading(false);
      };

      document.head.appendChild(script);
      scriptRef.current = script;
    };

    // Инициализация виджета
    const initializeWidget = (callback: (data: any) => void) => {
      if (!window.ecomStartWidget) {
        setError('Функция ecomStartWidget не найдена. Проверьте, что скрипт загружен.');
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 Инициализируем виджет карты Почты России...', {
          widgetId,
          cartValue,
          cartWeight
        });

        // Инициализируем виджет согласно документации
        window.ecomStartWidget({
          id: widgetId,
          callbackFunction: callback,
          containerId: 'ecom-widget',
          // Передаем вес и стоимость корзины
          weight: cartWeight, // Вес в граммах
          sumoc: cartValue * 100, // Стоимость в КОПЕЙКАХ (cartValue в рублях, умножаем на 100)
        });

        console.log(`✅ Виджет инициализирован с ID ${widgetId}`);
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Ошибка инициализации виджета:', err);
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
      
      // Удаляем callback из глобальной области
      if ((window as any).callbackpochta) {
        delete (window as any).callbackpochta;
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
          Выберите отделение Почты России
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Загрузка карты отделений...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div ref={containerRef} className="w-full" />

        <Alert className="mt-4">
          <AlertDescription className="text-sm">
            <p>
              Выберите отделение Почты России на карте выше. 
              После выбора отделения стоимость доставки будет рассчитана автоматически.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
