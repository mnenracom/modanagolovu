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

    // ДИАГНОСТИКА: Проверка ключей перед формированием запроса
    console.log('🔍 ПРОВЕРКА КЛЮЧЕЙ:')
    console.log('Shop ID:', shopId, '| Тип:', typeof shopId, '| Длина:', String(shopId).length)
    console.log('Secret Key длина:', secretKey ? secretKey.length : 0)
    console.log('Secret Key начинается с:', secretKey ? secretKey.substring(0, 20) + '...' : 'ОТСУТСТВУЕТ')
    
    // Проверка формата Secret Key (должен начинаться с test_ или live_)
    if (secretKey && !secretKey.startsWith('test_') && !secretKey.startsWith('live_')) {
      console.error('⚠️ ВНИМАНИЕ: Secret Key не начинается с test_ или live_!')
      console.error('Это может быть Публичный ключ вместо Секретного ключа!')
      console.error('Secret Key первые 50 символов:', secretKey.substring(0, 50))
    }
    
    // Проверка, что Secret Key не пустой и имеет достаточную длину
    if (!secretKey || secretKey.length < 20) {
      console.error('❌ ОШИБКА: Secret Key пустой или слишком короткий!')
      return new Response(
        JSON.stringify({ 
          error: 'Secret Key не настроен или имеет неверный формат. Проверьте настройки в админ-панели.',
          details: 'Secret Key должен начинаться с test_ или live_ и иметь длину не менее 20 символов'
        }),
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
    console.log('Test Mode:', testMode)
    
    // Формируем Basic Auth токен (объявляем один раз)
    const authToken = btoa(`${shopId}:${secretKey}`)
    console.log('Basic Auth токен (первые 30 символов):', authToken.substring(0, 30) + '...')
    console.log('Basic Auth токен длина:', authToken.length)
    
    console.log('Request body:', JSON.stringify(paymentRequest))

    // Формируем заголовки с Basic Auth (используем уже объявленный authToken)
    const headers = {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${orderId}-${Date.now()}`,
      'Authorization': `Basic ${authToken}`,
    }
    
    console.log('📤 Отправка запроса к API ЮКассы...')
    console.log('Headers (без Authorization):', {
      'Content-Type': headers['Content-Type'],
      'Idempotence-Key': headers['Idempotence-Key'],
      'Authorization': 'Basic ' + authToken.substring(0, 20) + '...'
    })

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
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
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в функции create-yookassa-payment:', error)
    console.error('Тип ошибки:', error.constructor?.name)
    console.error('Сообщение:', error.message)
    console.error('Стек ошибки:', error.stack)
    
    // Специальная диагностика для TLS/Network ошибок
    if (error.message && (
      error.message.includes('connection error') ||
      error.message.includes('peer closed connection') ||
      error.message.includes('TLS') ||
      error.message.includes('network')
    )) {
      console.error('🔴 ОБНАРУЖЕНА TLS/Network ошибка!')
      console.error('Это обычно означает проблему с авторизацией (неверный Secret Key)')
      console.error('Проверьте:')
      console.error('1. Secret Key должен начинаться с test_ или live_')
      console.error('2. Secret Key должен быть Секретным ключом, а не Публичным')
      console.error('3. Shop ID должен быть числом')
      console.error('4. Ключи должны быть из правильного режима (тестовый/продакшн)')
    }
    
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

