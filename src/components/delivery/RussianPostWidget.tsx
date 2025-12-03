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
      callbackFunction?: ((data: any) => void) | null;
      containerId: string;
    }) => void;
    lastSelectedOffice?: any;
  }
}

interface RussianPostWidgetProps {
  city: string;
  region?: string;
  postalCode?: string;
  widgetId?: number;
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
 * Работает через мониторинг DOM и события виджета
 */
export const RussianPostWidget = ({ 
  city, 
  region, 
  postalCode,
  widgetId = 60084,
  onOfficeSelected 
}: RussianPostWidgetProps) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedOfficeRef = useRef<any>(null);

  // Парсинг данных из панели виджета
  const parseOfficeFromPanel = (element: Element): any | null => {
    const text = element.textContent || '';
    const html = element.innerHTML || '';

    // Ищем индекс (6 цифр)
    const indexMatch = text.match(/\b(\d{6})\b/) || html.match(/\b(\d{6})\b/);
    // Ищем адрес
    const addressMatch = text.match(/Адрес[:\s]+([^\n\r]+)/i) || 
                        text.match(/г\s+[\w\s]+(?:,\s*ул\s+[\w\s]+)?/i);
    // Ищем стоимость
    const costMatch = text.match(/(\d+)\s*руб/i) || text.match(/(\d+)\s*₽/i);

    if (indexMatch && indexMatch[1]) {
      return {
        id: indexMatch[1],
        index: indexMatch[1],
        postalCode: indexMatch[1],
        address: addressMatch ? addressMatch[1].trim() : text.substring(0, 100),
        cost: costMatch ? parseInt(costMatch[1]) : null,
        name: 'Отделение Почты России',
        type: 'POST_OFFICE'
      };
    }

    return null;
  };

  // Извлечение данных при ручном подтверждении
  const extractOfficeData = () => {
    // 1. Проверяем глобальную переменную (если callback сработал)
    if (window.lastSelectedOffice) {
      console.log('✅ Данные из lastSelectedOffice:', window.lastSelectedOffice);
      const officeData = window.lastSelectedOffice;
      if (onOfficeSelected) {
        onOfficeSelected({
          id: officeData.id || officeData.index || '',
          name: officeData.name || 'Отделение Почты России',
          address: officeData.address || '',
          postalCode: officeData.postalCode || officeData.index || '',
          index: officeData.index || officeData.postalCode || '',
        });
      }
      return;
    }

    // 2. Ищем активную/выбранную панель
    const activePanel = document.querySelector('[class*="active"], [class*="selected"], [class*="chosen"]');
    if (activePanel) {
      const data = parseOfficeFromPanel(activePanel);
      if (data) {
        console.log('📦 Данные из активной панели:', data);
        selectedOfficeRef.current = data;
        if (onOfficeSelected) {
          onOfficeSelected({
            id: data.id,
            name: data.name,
            address: data.address,
            postalCode: data.postalCode,
            index: data.index,
          });
        }
        return;
      }
    }

    // 3. Ищем любую панель с данными об отделении
    const allPanels = document.querySelectorAll('[class*="office"], [class*="point"], [class*="post-office"]');
    for (const panel of Array.from(allPanels)) {
      const data = parseOfficeFromPanel(panel);
      if (data) {
        console.log('📦 Данные из панели:', data);
        selectedOfficeRef.current = data;
        if (onOfficeSelected) {
          onOfficeSelected({
            id: data.id,
            name: data.name,
            address: data.address,
            postalCode: data.postalCode,
            index: data.index,
          });
        }
        return;
      }
    }

    // 4. Ищем в контейнере виджета
    const container = document.getElementById('ecom-widget');
    if (container) {
      const data = parseOfficeFromPanel(container);
      if (data) {
        console.log('📦 Данные из контейнера:', data);
        selectedOfficeRef.current = data;
        if (onOfficeSelected) {
          onOfficeSelected({
            id: data.id,
            name: data.name,
            address: data.address,
            postalCode: data.postalCode,
            index: data.index,
          });
        }
        return;
      }
    }

    // 5. Если ничего не нашли
    console.warn('⚠️ Данные не найдены');
    setError('Не удалось определить выбранное отделение. Убедитесь, что вы выбрали отделение на карте и нажали "Выбрать" в виджете.');
  };

  // Настройка слушателя DOM для виджета
  const setupWidgetListener = () => {
    if (!widgetRef.current) return;

    // Очищаем предыдущий observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Ищем кнопки "Выбрать" в виджете
        const selectButtons = document.querySelectorAll(
          'button:contains("Выбрать"), [class*="select"], [class*="choose"], button[aria-label*="выбрать"]'
        );

        selectButtons.forEach((btn) => {
          if (!(btn as HTMLElement).hasAttribute('data-listener-added')) {
            (btn as HTMLElement).setAttribute('data-listener-added', 'true');
            btn.addEventListener('click', () => {
              console.log('🔘 Кнопка "Выбрать" нажата в виджете');
              // Даем время виджету обновить DOM
              setTimeout(() => {
                extractOfficeData();
              }, 500);
            });
          }
        });

        // Ищем панель с информацией об отделении
        const infoPanels = document.querySelectorAll('[class*="info"], [class*="details"], [class*="office-info"]');
        infoPanels.forEach((panel) => {
          if (!panel.hasAttribute('data-parsed')) {
            panel.setAttribute('data-parsed', 'true');
            const officeData = parseOfficeFromPanel(panel);
            if (officeData) {
              selectedOfficeRef.current = officeData;
              window.lastSelectedOffice = officeData;
            }
          }
        });
      });
    });

    observer.observe(widgetRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });

    observerRef.current = observer;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (!widgetRef.current) {
      return;
    }

    // Создаем контейнер для виджета
    widgetRef.current.innerHTML = '<div id="ecom-widget" style="height: 500px; width: 100%"></div>';

    // Обработчик postMessage от виджета
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('pochta.ru')) return;

      console.log('📨 PostMessage от виджета:', event.data);

      if (event.data && typeof event.data === 'object') {
        const widgetData = event.data;

        // Проверяем разные форматы данных
        if (widgetData.office || widgetData.selectedOffice || widgetData.result) {
          const officeData = widgetData.office || widgetData.selectedOffice || widgetData.result;
          if (officeData && (officeData.id || officeData.index || officeData.postalCode)) {
            console.log('✅ Данные из postMessage:', officeData);
            window.lastSelectedOffice = officeData;
            if (onOfficeSelected) {
              onOfficeSelected({
                id: officeData.id || officeData.index || officeData.postalCode || '',
                name: officeData.name || 'Отделение Почты России',
                address: officeData.address || '',
                postalCode: officeData.postalCode || officeData.index || '',
                index: officeData.index || officeData.postalCode || '',
              });
            }
            setLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Загружаем скрипт виджета
    const loadWidget = () => {
      const existingScript = document.getElementById('pochta-widget-script');
      if (existingScript && window.ecomStartWidget) {
        setTimeout(() => {
          initializeWidget();
        }, 100);
        return;
      }

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

      const script = document.createElement('script');
      script.id = 'pochta-widget-script';
      script.src = 'https://widget.pochta.ru/map/widget/widget.js';
      script.async = true;
      
      script.onload = () => {
        console.log('Скрипт виджета Почты России загружен');
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

    // Инициализация виджета
    const initializeWidget = () => {
      if (!window.ecomStartWidget) {
        setError('Функция виджета не найдена. Проверьте, что скрипт загружен.');
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 Инициализируем виджет...');

        const container = document.getElementById('ecom-widget');
        if (!container) {
          setError('Контейнер виджета не найден');
          setLoading(false);
          return;
        }

        // Инициализируем виджет (callback опционален, так как виджет может не вызывать его)
        window.ecomStartWidget({
          id: widgetId,
          callbackFunction: (data: any) => {
            console.log('🎯 Callback виджета вызван!', data);
            if (data) {
              window.lastSelectedOffice = data;
              if (onOfficeSelected) {
                onOfficeSelected({
                  id: data.id || data.index || data.postalCode || '',
                  name: data.name || 'Отделение Почты России',
                  address: data.address || '',
                  postalCode: data.postalCode || data.index || '',
                  index: data.index || data.postalCode || '',
                });
              }
            }
            setLoading(false);
          },
          containerId: 'ecom-widget'
        });
        
        console.log(`✅ Виджет инициализирован с ID ${widgetId}`);

        // Настраиваем слушатель DOM
        setTimeout(() => {
          setupWidgetListener();
        }, 1000);

        setLoading(false);
      } catch (err: any) {
        console.error('Ошибка инициализации виджета:', err);
        setError(`Ошибка инициализации виджета: ${err.message}`);
        setLoading(false);
      }
    };

    loadWidget();

    // Очистка
    return () => {
      window.removeEventListener('message', handleMessage);
      
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      
      if (widgetRef.current) {
        widgetRef.current.innerHTML = '';
      }
    };
  }, [widgetId, onOfficeSelected, city, region, postalCode]);

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
            <AlertDescription>{error}</AlertDescription>
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
              <li>После этого нажмите кнопку "Я выбрал отделение - подтвердить" ниже</li>
            </ol>
            {city && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Город: {city}{region ? `, ${region}` : ''}
              </span>
            )}
          </AlertDescription>
        </Alert>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={extractOfficeData}
            className="w-full"
            size="lg"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Я выбрал отделение - подтвердить
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
