import { PaymentGateway } from '@/types/delivery';

interface YooKassaPaymentRequest {
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: 'redirect';
    return_url: string;
  };
  description: string;
  metadata?: {
    orderId?: string;
    orderNumber?: string;
  };
}

interface YooKassaPaymentResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    confirmation_url: string;
  };
  created_at: string;
  description: string;
  metadata?: any;
}

import { supabase } from '@/lib/supabase';

export const yookassaService = {
  /**
   * Создать платеж через ЮКассу
   * Использует Supabase Edge Function для обхода CORS ограничений
   */
  async createPayment(
    gateway: PaymentGateway,
    amount: number,
    orderId: string,
    orderNumber: string,
    description: string,
    returnUrl: string,
    useWidget: boolean = false
  ): Promise<{ paymentUrl: string; paymentId: string; confirmationToken?: string }> {
    try {
      // Используем тестовые или продакшн ключи
      const shopId = gateway.shopId || '';
      // Точная логика выбора ключа: тестовый ключ только из testSecretKey, боевой — из secretKey
      let secretKey = '';
      if (gateway.testMode) {
        secretKey = gateway.testSecretKey || '';
      } else {
        secretKey = gateway.secretKey || '';
      }

      if (!shopId || !secretKey) {
        throw new Error('Не настроены ключи ЮКассы. Проверьте настройки в админ-панели.');
      }

      // Вызываем Supabase Edge Function вместо прямого вызова API ЮКассы
      // Это решает проблему CORS
      console.log('📤 Отправка запроса к Edge Function:', {
        shopId,
        secretKeyLength: secretKey.length,
        secretKeyPrefix: secretKey.substring(0, 10) + '...',
        amount,
        orderId,
        testMode: gateway.testMode || false,
        useWidget
      });

      let response;
      try {
        response = await supabase.functions.invoke('create-yookassa-payment', {
          body: {
            shopId,
            secretKey,
            amount,
            orderId,
            orderNumber,
            description,
            returnUrl,
            testMode: gateway.testMode || false,
            useWidget,
          },
        });
      } catch (invokeError: any) {
        console.error('❌ Ошибка вызова Edge Function:', invokeError);
        throw new Error(`Не удалось вызвать Edge Function: ${invokeError.message || invokeError}`);
      }

      const { data, error } = response;

      console.log('📥 Ответ от Edge Function:', {
        hasError: !!error,
        errorType: error?.constructor?.name,
        errorMessage: error?.message,
        errorDetails: error,
        hasData: !!data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        fullData: data, // Полные данные для диагностики
        confirmationToken: data?.confirmationToken ? data.confirmationToken.substring(0, 30) + '...' : 'ОТСУТСТВУЕТ',
        paymentUrl: data?.paymentUrl ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ',
        paymentId: data?.paymentId,
        errorInData: data?.error,
        status: data?.status,
        details: data?.details
      });

      if (error) {
        console.error('❌ Ошибка Edge Function:', {
          error,
          message: error.message,
          name: error.name,
          stack: error.stack,
          // Пытаемся извлечь детали из ошибки
          errorContext: (error as any).context,
          errorResponse: (error as any).response,
          errorBody: (error as any).body
        });
        
        // Пытаемся извлечь детали ошибки из разных источников
        let errorMessage = error.message || 'Ошибка создания платежа через Edge Function';
        let errorDetails: any = null;
        
        // 1. Проверяем data (может содержать ошибку даже при error)
        if (data) {
          errorMessage = data.error || data.details || data.message || errorMessage;
          errorDetails = data.details || data;
        }
        
        // 2. Пытаемся извлечь из контекста ошибки
        if ((error as any).context) {
          try {
            const context = (error as any).context;
            if (context.body) {
              const parsedBody = typeof context.body === 'string' ? JSON.parse(context.body) : context.body;
              errorMessage = parsedBody.error || parsedBody.details || errorMessage;
              errorDetails = parsedBody.details || parsedBody;
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
        
        // 3. Пытаемся извлечь из response
        if ((error as any).response) {
          try {
            const response = (error as any).response;
            if (response.body) {
              const parsedBody = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
              errorMessage = parsedBody.error || parsedBody.details || errorMessage;
              errorDetails = parsedBody.details || parsedBody;
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
        
        // 4. Пытаемся извлечь из body напрямую
        if ((error as any).body) {
          try {
            const body = (error as any).body;
            const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
            errorMessage = parsedBody.error || parsedBody.details || errorMessage;
            errorDetails = parsedBody.details || parsedBody;
          } catch (e) {
            // Игнорируем ошибки парсинга
          }
        }
        
        console.error('📋 Извлеченные детали ошибки:', {
          errorMessage,
          errorDetails
        });
        
        const fullError = new Error(errorMessage);
        (fullError as any).details = errorDetails;
        (fullError as any).originalError = error;
        throw fullError;
      }

      // Проверяем, есть ли ошибка в data (теперь Edge Function всегда возвращает 200, но с error в теле)
      if (data?.error) {
        console.error('❌ Ошибка в ответе Edge Function:', {
          error: data.error,
          type: data.type,
          status: data.status,
          statusText: data.statusText,
          details: data.details,
          suggestion: data.suggestion
        });
        
        // Формируем детальное сообщение об ошибке
        let errorMessage = data.error;
        if (data.suggestion) {
          errorMessage += ` ${data.suggestion}`;
        }
        if (data.details && typeof data.details === 'string') {
          errorMessage += ` (${data.details})`;
        }
        
        const fullError = new Error(errorMessage);
        (fullError as any).details = data.details;
        (fullError as any).type = data.type;
        (fullError as any).status = data.status;
        throw fullError;
      }

      // Для виджета возвращаем confirmationToken, для редиректа - paymentUrl
      if (data?.confirmationToken) {
        console.log('✅ Получен confirmationToken от Edge Function');
        return {
          confirmationToken: data.confirmationToken,
          paymentId: data.paymentId,
          paymentUrl: '', // Не используется для виджета
        };
      }

      if (data?.paymentUrl && data?.paymentId) {
        console.log('⚠️ Получен paymentUrl вместо confirmationToken (fallback на редирект)');
        return {
          paymentUrl: data.paymentUrl,
          paymentId: data.paymentId,
          confirmationToken: '', // Не используется для редиректа
        };
      }

      console.error('❌ Не получен ни confirmationToken, ни paymentUrl');
      throw new Error(data?.error || 'Не получен токен для виджета или URL для оплаты от ЮКассы');

      return {
        paymentUrl: data.paymentUrl,
        paymentId: data.paymentId,
        confirmationToken: '', // Не используется для редиректа
      };
    } catch (error: any) {
      console.error('Ошибка создания платежа ЮКассы:', error);
      throw new Error(
        error.message || 'Не удалось создать платеж. Проверьте настройки ЮКассы и Edge Function.'
      );
    }
  },

  /**
   * Проверить статус платежа
   */
  async checkPaymentStatus(
    gateway: PaymentGateway,
    paymentId: string
  ): Promise<{ status: string; paid: boolean }> {
    try {
      const shopId = gateway.shopId || '';
      const secretKey = gateway.testMode 
        ? (gateway.testSecretKey || gateway.secretKey || '')
        : (gateway.secretKey || '');

      if (!shopId || !secretKey) {
        throw new Error('Не настроены ключи ЮКассы');
      }

      const apiUrl = gateway.testMode 
        ? `https://api.yookassa.ru/v3/payments/${paymentId}`
        : `${gateway.apiUrl || 'https://api.yookassa.ru/v3/payments'}/${paymentId}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Ошибка проверки статуса: ${response.status}`);
      }

      const paymentData: YooKassaPaymentResponse = await response.json();

      return {
        status: paymentData.status,
        paid: paymentData.status === 'succeeded',
      };
    } catch (error: any) {
      console.error('Ошибка проверки статуса платежа:', error);
      throw error;
    }
  },
};

