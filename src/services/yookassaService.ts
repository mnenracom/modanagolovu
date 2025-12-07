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
      const secretKey = gateway.testMode 
        ? (gateway.testSecretKey || gateway.secretKey || '')
        : (gateway.secretKey || '');

      if (!shopId || !secretKey) {
        throw new Error('Не настроены ключи ЮКассы. Проверьте настройки в админ-панели.');
      }

      // Вызываем Supabase Edge Function вместо прямого вызова API ЮКассы
      // Это решает проблему CORS
      const { data, error } = await supabase.functions.invoke('create-yookassa-payment', {
        body: {
          shopId,
          secretKey,
          amount,
          orderId,
          orderNumber,
          description,
          returnUrl,
          testMode: gateway.testMode || false,
          useWidget: true, // Используем виджет вместо редиректа
        },
      });

      console.log('📥 Ответ от Edge Function:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        confirmationToken: data?.confirmationToken ? data.confirmationToken.substring(0, 30) + '...' : 'ОТСУТСТВУЕТ',
        paymentUrl: data?.paymentUrl ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ',
        paymentId: data?.paymentId,
        error: data?.error
      });

      if (error) {
        console.error('❌ Ошибка Edge Function:', error);
        throw new Error(error.message || 'Ошибка создания платежа через Edge Function');
      }

      // Проверяем, есть ли ошибка в data
      if (data?.error) {
        console.error('❌ Ошибка в ответе Edge Function:', data.error);
        throw new Error(data.error || 'Ошибка создания платежа');
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

