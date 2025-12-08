// src/services/yookassaService.ts
// Использует Vercel Serverless Function для проксирования запросов к API ЮКассы
// Обходит TLS проблемы в Supabase Edge Functions (Deno)

export const yookassaService = {
  /**
   * Создает платеж через Vercel Serverless Function (Node.js), проксирующую запросы к API ЮКассы.
   * @param gateway Объект настроек шлюза (должен содержать shopId, secretKey, testSecretKey, testMode).
   * @param amount Сумма платежа.
   * @param orderId Уникальный ID заказа.
   * @param orderNumber Номер заказа.
   * @param description Описание платежа.
   * @param returnUrl URL, на который ЮКасса вернет пользователя.
   * @param email Email клиента для чека.
   * @param useWidget Флаг: true для встроенного виджета (embedded), false для редиректа (redirect).
   */
  async createPayment(gateway, amount, orderId, orderNumber, description, returnUrl, email, useWidget = false) {
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

    // ИЗМЕНЕНИЕ: Вызов Vercel Serverless Function вместо Supabase Edge Function
    const response = await fetch('/api/yookassa', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        shopId, 
        secretKey, 
        amount, 
        orderId, 
        orderNumber, 
        description, 
        returnUrl, 
        testMode: gateway.testMode || false, 
        useWidget: useWidget, // ИСПРАВЛЕНИЕ #2: Используем аргумент функции
        email: email // Передача email для чека
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Ошибка сети/прокси: ${response.status}`)
    }

    const data = await response.json()

    if (!data) throw new Error('Пустой ответ от прокси/сервера')
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

