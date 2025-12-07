import { useEffect, useRef } from 'react';

interface YooKassaWidgetProps {
  confirmationToken: string;
  returnUrl: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    YooMoneyCheckoutWidget: any;
  }
}

export const YooKassaWidget: React.FC<YooKassaWidgetProps> = ({
  confirmationToken,
  returnUrl,
  onSuccess,
  onError,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Загружаем скрипт виджета
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        initializeWidget();
      };
      script.onerror = () => {
        console.error('❌ Ошибка загрузки скрипта виджета ЮКассы');
        onError?.({ message: 'Не удалось загрузить виджет ЮКассы' });
      };
      document.head.appendChild(script);
    } else {
      initializeWidget();
    }

    return () => {
      // Удаляем виджет при размонтировании
      if (checkoutRef.current) {
        try {
          checkoutRef.current.destroy();
        } catch (e) {
          console.error('Ошибка при удалении виджета:', e);
        }
      }
    };
  }, [confirmationToken]);

  const initializeWidget = () => {
    if (!window.YooMoneyCheckoutWidget || !widgetRef.current) {
      console.error('Виджет ЮКассы не загружен или контейнер не найден');
      return;
    }

    // Удаляем предыдущий виджет, если он есть
    if (checkoutRef.current) {
      try {
        checkoutRef.current.destroy();
      } catch (e) {
        // Игнорируем ошибки при удалении
      }
    }

    // Очищаем контейнер
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
    }

    try {
      // Инициализируем виджет
      checkoutRef.current = new window.YooMoneyCheckoutWidget({
        confirmation_token: confirmationToken,
        return_url: returnUrl,
        error_callback: (error: any) => {
          console.error('❌ Ошибка виджета ЮКассы:', error);
          onError?.(error);
        },
        // Настройка цветовой схемы
        customization: {
          colors: {
            control_primary: '#8b5cf6', // Фиолетовый цвет (как в вашем дизайне)
            background: '#ffffff',
          },
        },
      });

      // Отображаем виджет
      checkoutRef.current
        .render('yookassa-widget-container')
        .then(() => {
          console.log('✅ Виджет ЮКассы успешно отображен');
        })
        .catch((error: any) => {
          console.error('❌ Ошибка отображения виджета:', error);
          onError?.(error);
        });
    } catch (error: any) {
      console.error('❌ Ошибка инициализации виджета:', error);
      onError?.(error);
    }
  };

  return (
    <div className="w-full">
      <div
        id="yookassa-widget-container"
        ref={widgetRef}
        className="min-w-[288px] w-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

