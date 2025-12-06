// Supabase Edge Function для создания платежа ЮКассы
// Это решает проблему CORS - функция выполняется на сервере Supabase

// @deno-types="https://deno.land/x/types/index.d.ts"
// @ts-expect-error - Deno импорт, TypeScript не может разрешить, но работает в runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Получаем параметры из запроса
    const { shopId, secretKey, amount, orderId, orderNumber, description, returnUrl, testMode } = await req.json()

    if (!shopId || !secretKey || !amount || !orderId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Недостаточно параметров для создания платежа. Проверьте Shop ID и Secret Key.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Проверяем формат Shop ID (должен быть числом)
    if (isNaN(parseInt(shopId))) {
      return new Response(
        JSON.stringify({ error: 'Неверный формат Shop ID. Должно быть число.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Создаем платеж через API ЮКассы
    const paymentRequest = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description: description || `Заказ №${orderNumber || orderId}`,
      metadata: {
        orderId: orderId,
        orderNumber: orderNumber || orderId,
        testMode: testMode ? 'true' : 'false',
      },
      capture: true, // Автоматическое подтверждение платежа
    }

    // Используем правильный URL API (продакшн или тестовый)
    const apiUrl = testMode 
      ? 'https://api.yookassa.ru/v3/payments' // Тестовый режим использует тот же URL
      : 'https://api.yookassa.ru/v3/payments'

    // ДИАГНОСТИКА: Лог перед запросом к ЮКассе для отслеживания таймаутов
    console.log('--- START YOOKASSA REQUEST for order:', orderId, 'amount:', amount, '---')
    console.log('API URL:', apiUrl)
    console.log('Shop ID:', shopId)
    console.log('Test Mode:', testMode)
    console.log('Request body:', JSON.stringify(paymentRequest))

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': `${orderId}-${Date.now()}`,
        'Authorization': `Basic ${btoa(`${shopId}:${secretKey}`)}`,
      },
      body: JSON.stringify(paymentRequest),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // ДИАГНОСТИКА: Вывод детальной ошибки от ЮКассы в логи Supabase
      console.error('❌ Ошибка API ЮКассы:', {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData,
        orderId: orderId,
        shopId: shopId,
        testMode: testMode
      })
      
      // Дополнительная информация для диагностики 401 ошибки
      if (response.status === 401) {
        console.error('⚠️ 401 Unauthorized - Проверьте правильность Shop ID и Secret Key')
        console.error('Shop ID тип:', typeof shopId, 'значение:', shopId)
        console.error('Secret Key длина:', secretKey ? secretKey.length : 0, 'начинается с:', secretKey ? secretKey.substring(0, 10) + '...' : 'отсутствует')
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorData.description || `Ошибка создания платежа: ${response.status}`,
          status: response.status,
          details: errorData
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await response.json()
    
    // ДИАГНОСТИКА: Лог успешного ответа
    console.log('✅ Успешный ответ от ЮКассы:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      hasConfirmationUrl: !!paymentData.confirmation?.confirmation_url,
      orderId: orderId
    })

    if (!paymentData.confirmation?.confirmation_url) {
      return new Response(
        JSON.stringify({ error: 'Не получен URL для оплаты от ЮКассы' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        paymentUrl: paymentData.confirmation.confirmation_url,
        paymentId: paymentData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Ошибка в функции create-yookassa-payment:', error)
    console.error('Тип ошибки:', error.constructor?.name)
    console.error('Сообщение:', error.message)
    console.error('Стек ошибки:', error.stack)
    
    // Возвращаем детальную информацию об ошибке для отладки
    const errorResponse = {
      error: error.message || 'Не удалось создать платеж',
      type: error.constructor?.name || 'UnknownError',
      details: process.env.DENO_ENV === 'development' ? error.toString() : 'См. логи Edge Function'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

