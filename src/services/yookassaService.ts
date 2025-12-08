// src/services/yookassaService.ts
// Предполагается, что 'supabase' уже импортирован или доступен в этом файле.

import { supabase } from '@/lib/supabase';

export const yookassaService = {
  /**
   * Создает платеж через Supabase Edge Function, вызывающую API ЮКассы.
   * @param gateway Объект настроек шлюза (должен содержать shopId, secretKey, testSecretKey, testMode).
   * @param amount Сумма платежа.
   * @param orderId Уникальный ID заказа.
   * @param orderNumber Номер заказа.
   * @param description Описание платежа.
   * @param returnUrl URL, на который ЮКасса вернет пользователя.
   * @param useWidget Флаг: true для встроенного виджета (embedded), false для редиректа (redirect).
   */
  async createPayment(gateway, amount, orderId, orderNumber, description, returnUrl, useWidget = false) {
    const shopId = gateway.shopId || ''
    
    // ИСПРАВЛЕНИЕ #1: Точный выбор Secret Key в зависимости от режима
    let secretKey = ''
    if (gateway.testMode) {
      // В тестовом режиме используем только testSecretKey
      secretKey = gateway.testSecretKey || '' 
    } else {
      // В боевом режиме используем secretKey
      secretKey = gateway.secretKey || ''
    }

    if (!shopId || !secretKey) throw new Error('Не настроены ключи ЮКассы. Проверьте настройки в админ-панели.')

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
        useWidget: useWidget // ИСПРАВЛЕНИЕ #2: Используем аргумент функции
      },
    })

    if (error) {
      // Пытаемся вытащить подробности из data/response/body/context
      let msg = error.message || 'Ошибка создания платежа через Edge Function'
      if (data) msg = data.error || data.details || data.message || msg
      const err = new Error(msg)
      ;(err as any).details = data?.details || data || error
      throw err
    }

    if (!data) throw new Error('Пустой ответ от Edge Function')
    if (data.error) {
      const err = new Error(data.error)
      ;(err as any).details = data.details
      throw err
    }

    // Возвращаем данные, которые могут содержать URL или токен
    return {
      paymentUrl: data.paymentUrl,
      paymentId: data.paymentId,
      confirmationToken: data.confirmationToken,
    }
  },
}

