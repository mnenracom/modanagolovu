import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analyticsService';
import { AnalyticsSettings } from '@/types/analytics';

/**
 * Компонент для встраивания счетчиков аналитики на сайт
 */
export function Analytics() {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null);

  useEffect(() => {
    // Загружаем настройки с небольшой задержкой, чтобы не блокировать рендеринг
    const timer = setTimeout(() => {
      loadSettings().catch(err => {
        // Игнорируем все ошибки, чтобы не ломать приложение
        console.log('Аналитика не загружена:', err);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const loadSettings = async () => {
    try {
      const data = await analyticsService.getSettings();
      setSettings(data);
    } catch (error: any) {
      // Игнорируем все ошибки аналитики, чтобы не ломать приложение
      // Это может быть связано с отсутствием таблицы, прав доступа или API key
      if (error?.code === '42P01' || 
          error?.code === 'PGRST301' ||
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') ||
          error?.message?.includes('API key') ||
          error?.message?.includes('apikey')) {
        // Тихо игнорируем - это нормально, если аналитика не настроена
        return;
      }
      // Для остальных ошибок тоже просто игнорируем, чтобы не засорять консоль
      return;
    }
  };

  useEffect(() => {
    if (!settings) return;
    
    // Проверяем, что document доступен
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Яндекс.Метрика
    if (settings.yandexMetrikaEnabled && settings.yandexMetrikaCounterId) {
      // Удаляем старый счетчик, если есть
      const oldScript = document.getElementById('yandex-metrika');
      if (oldScript) {
        oldScript.remove();
      }

      // Создаем новый скрипт
      const script = document.createElement('script');
      script.id = 'yandex-metrika';
      script.type = 'text/javascript';
      script.innerHTML = `
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(${settings.yandexMetrikaCounterId}, "init", {
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true,
          webvisor:true
        });
      `;
      document.head.appendChild(script);

      // Добавляем noscript для Яндекс.Метрики
      const noscript = document.createElement('noscript');
      noscript.innerHTML = `<div><img src="https://mc.yandex.ru/watch/${settings.yandexMetrikaCounterId}" style="position:absolute; left:-9999px;" alt="" /></div>`;
      document.body.appendChild(noscript);
    }

    // Google Analytics
    if (settings.googleAnalyticsEnabled) {
      // GA4 (Measurement ID)
      if (settings.googleAnalyticsMeasurementId) {
        // Удаляем старый счетчик, если есть
        const oldGAScript = document.getElementById('google-analytics-ga4');
        if (oldGAScript) {
          oldGAScript.remove();
        }

        // Создаем скрипт для GA4
        const ga4Script = document.createElement('script');
        ga4Script.id = 'google-analytics-ga4';
        ga4Script.async = true;
        ga4Script.src = `https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsMeasurementId}`;
        document.head.appendChild(ga4Script);

        ga4Script.onload = () => {
          const initScript = document.createElement('script');
          initScript.id = 'google-analytics-init-ga4';
          initScript.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${settings.googleAnalyticsMeasurementId}');
          `;
          document.head.appendChild(initScript);
        };
      }

      // Universal Analytics (Tracking ID)
      if (settings.googleAnalyticsTrackingId) {
        // Удаляем старый счетчик, если есть
        const oldUAScript = document.getElementById('google-analytics-ua');
        if (oldUAScript) {
          oldUAScript.remove();
        }

        // Создаем скрипт для Universal Analytics
        const uaScript = document.createElement('script');
        uaScript.id = 'google-analytics-ua';
        uaScript.async = true;
        uaScript.src = `https://www.google-analytics.com/analytics.js`;
        document.head.appendChild(uaScript);

        uaScript.onload = () => {
          const initScript = document.createElement('script');
          initScript.id = 'google-analytics-init-ua';
          initScript.innerHTML = `
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
            ga('create', '${settings.googleAnalyticsTrackingId}', 'auto');
            ga('send', 'pageview');
          `;
          document.head.appendChild(initScript);
        };
      }
    }

    // Cleanup при размонтировании
    return () => {
      // Очистка происходит автоматически при перезагрузке страницы
    };
  }, [settings]);

  return null; // Компонент не рендерит ничего видимого
}

