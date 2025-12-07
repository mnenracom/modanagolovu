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
    if (!confirmationToken) {
      console.log('⚠️ confirmationToken отсутствует, виджет не будет загружен');
      return;
    }

    console.log('🚀 Начинаем загрузку виджета ЮКассы, токен:', confirmationToken.substring(0, 20) + '...');

    // Загружаем скрипт виджета
    if (!scriptLoadedRef.current) {
      const script = document.createElement('script');
      script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Скрипт виджета ЮКассы загружен');
        scriptLoadedRef.current = true;
        // Небольшая задержка для гарантии, что функция доступна
        setTimeout(() => {
          initializeWidget();
        }, 100);
      };
      script.onerror = () => {
        console.error('❌ Ошибка загрузки скрипта виджета ЮКассы');
        onError?.({ message: 'Не удалось загрузить виджет ЮКассы' });
      };
      document.head.appendChild(script);
    } else {
      // Скрипт уже загружен, сразу инициализируем
      setTimeout(() => {
        initializeWidget();
      }, 100);
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
    console.log('🔧 Инициализация виджета...');
    console.log('  - YooMoneyCheckoutWidget доступен:', !!window.YooMoneyCheckoutWidget);
    console.log('  - widgetRef.current:', !!widgetRef.current);
    console.log('  - confirmationToken:', confirmationToken ? confirmationToken.substring(0, 20) + '...' : 'ОТСУТСТВУЕТ');

    if (!window.YooMoneyCheckoutWidget) {
      console.error('❌ YooMoneyCheckoutWidget не найден в window');
      onError?.({ message: 'Библиотека виджета ЮКассы не загружена' });
      return;
    }

    if (!widgetRef.current) {
      console.error('❌ Контейнер виджета не найден');
      onError?.({ message: 'Контейнер для виджета не найден' });
      return;
    }

    if (!confirmationToken) {
      console.error('❌ confirmationToken отсутствует');
      onError?.({ message: 'Токен подтверждения отсутствует' });
      return;
    }

    // Удаляем предыдущий виджет, если он есть
    if (checkoutRef.current) {
      try {
        checkoutRef.current.destroy();
        console.log('🗑️ Предыдущий виджет удален');
      } catch (e) {
        console.log('⚠️ Ошибка при удалении предыдущего виджета (игнорируем):', e);
      }
    }

    // Очищаем контейнер
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
      // Создаем контейнер с правильным ID
      const container = document.createElement('div');
      container.id = 'yookassa-widget-container';
      container.style.minWidth = '288px';
      container.style.width = '100%';
      container.style.minHeight = '400px';
      widgetRef.current.appendChild(container);
    }

    try {
      console.log('🎨 Создаем экземпляр виджета...');
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

      console.log('✅ Экземпляр виджета создан, начинаем рендеринг...');

      // Отображаем виджет
      checkoutRef.current
        .render('yookassa-widget-container')
        .then(() => {
          console.log('✅ Виджет ЮКассы успешно отображен!');
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

