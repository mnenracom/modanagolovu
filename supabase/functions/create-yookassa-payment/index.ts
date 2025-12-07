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
    const { shopId: rawShopId, secretKey, amount: rawAmount, orderId, orderNumber, description, returnUrl, testMode } = await req.json()

    // Проверка наличия обязательных параметров
    if (!rawShopId || !secretKey || !rawAmount || !orderId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Недостаточно параметров для создания платежа. Проверьте Shop ID и Secret Key.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Принудительное преобразование типов для гарантии корректного формата
    const shopId = String(rawShopId) // Гарантируем, что это строка
    const amount = Number(rawAmount) // Гарантируем, что это число

    // Проверка, что amount является валидным числом
    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Неверная сумма платежа. Сумма должна быть положительным числом.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Проверка, что Secret Key не пустой
    if (!secretKey || secretKey.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Secret Key не настроен. Проверьте настройки в админ-панели.'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Создаем платеж через API ЮКассы согласно документации
    // Документация: https://yookassa.ru/developers/using-api/interaction-format
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
      capture: true, // Автоматическое подтверждение платежа
    }

    // API endpoint согласно документации: https://api.yookassa.ru/v3/
    const apiUrl = 'https://api.yookassa.ru/v3/payments'

    // HTTP Basic Auth согласно документации: -u <Идентификатор магазина>:<Секретный ключ>
    // В заголовке это: Authorization: Basic base64(shopId:secretKey)
    const authToken = btoa(`${shopId}:${secretKey}`)

    // Формируем заголовки согласно документации
    const headers = {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${orderId}-${Date.now()}`, // Для обеспечения идемпотентности
      'Authorization': `Basic ${authToken}`, // HTTP Basic Auth
      'User-Agent': 'ModnaGolovu/1.0', // Добавляем User-Agent для лучшей совместимости
    }

    // Добавляем таймаут для предотвращения долгого ожидания
    // Таймаут 30 секунд согласно документации ЮКассы
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 секунд

    let response: Response
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(paymentRequest),
        signal: controller.signal, // Добавляем сигнал для таймаута
      })

      clearTimeout(timeoutId) // Очищаем таймаут при успешном ответе
    } catch (fetchError: any) {
      clearTimeout(timeoutId) // Очищаем таймаут при ошибке
      
      // Обработка ошибки таймаута
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
        console.error('⏱️ Таймаут запроса к API ЮКассы (30 секунд)')
        return new Response(
          JSON.stringify({ 
            error: 'Таймаут запроса к API ЮКассы. Попробуйте позже.',
            type: 'TIMEOUT',
            details: 'Запрос к API ЮКассы превысил 30 секунд'
          }),
          { 
            status: 504,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Пробрасываем другие ошибки в основной catch блок
      throw fetchError
    }

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
