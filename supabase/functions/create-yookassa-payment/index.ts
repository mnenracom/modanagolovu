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
    const { shopId: rawShopId, secretKey, amount: rawAmount, orderId, orderNumber, description, returnUrl, testMode, useWidget } = await req.json()

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
    // Для виджета используем тип "embedded", для редиректа - "redirect"
    
    const paymentRequest = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: useWidget ? 'embedded' : 'redirect', // embedded для виджета, redirect для редиректа
        return_url: returnUrl, // Нужен даже для embedded
      },
      description: description || `Заказ №${orderNumber || orderId}`,
      capture: true, // Автоматическое подтверждение платежа
    }

    // API endpoint согласно документации: https://api.yookassa.ru/v3/
    // Для тестового режима используем тот же endpoint, но с тестовыми ключами
    const apiUrl = 'https://api.yookassa.ru/v3/payments'
    
    // Логируем режим работы
    console.log('🔧 Режим работы:', testMode ? 'ТЕСТОВЫЙ' : 'ПРОДАКШН')

    // HTTP Basic Auth согласно документации: -u <Идентификатор магазина>:<Секретный ключ>
    // В заголовке это: Authorization: Basic base64(shopId:secretKey)
    const authToken = btoa(`${shopId}:${secretKey}`)

    // Логирование перед запросом (без чувствительных данных)
    console.log('📤 Подготовка запроса к API ЮКассы:', {
      apiUrl: apiUrl,
      shopId: shopId,
      shopIdLength: shopId.length,
      secretKeyLength: secretKey.length,
      secretKeyPrefix: secretKey.substring(0, 10) + '...',
      authTokenLength: authToken.length,
      amount: amount,
      orderId: orderId,
      testMode: testMode
    })

    // Формируем заголовки согласно документации
    const headers = {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${orderId}-${Date.now()}`, // Для обеспечения идемпотентности
      'Authorization': `Basic ${authToken}`, // HTTP Basic Auth
      'User-Agent': 'ModnaGolovu/1.0', // Добавляем User-Agent для лучшей совместимости
    }

    console.log('📋 Заголовки запроса:', {
      'Content-Type': headers['Content-Type'],
      'Idempotence-Key': headers['Idempotence-Key'],
      'Authorization': `Basic ${authToken.substring(0, 20)}...`,
      'User-Agent': headers['User-Agent']
    })

    console.log('📦 Тело запроса:', JSON.stringify(paymentRequest, null, 2))

    // Пропускаем тестовый запрос - он может не существовать в API ЮКассы
    // Сразу переходим к созданию платежа

    // Таймаут 15 секунд - достаточно для API ЮКассы
    // Если запрос не проходит за 15 секунд, скорее всего проблема с ключами или сетью
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 секунд

    console.log('⏱️ Таймаут установлен: 15 секунд')
    const requestStartTime = Date.now()

    let response: Response
    try {
      console.log('🚀 Отправка запроса к API ЮКассы...')
      console.log('📡 URL:', apiUrl)
      console.log('🔑 Basic Auth: shopId=' + shopId + ', secretKeyLength=' + secretKey.length)
      console.log('📋 Метод: POST')
      console.log('📦 Размер тела запроса:', JSON.stringify(paymentRequest).length, 'байт')
      
      // Отправляем запрос к API ЮКассы
      // Используем минимальные настройки для максимальной совместимости
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(paymentRequest),
        signal: controller.signal,
      })

      const requestDuration = Date.now() - requestStartTime
      console.log(`✅ Получен ответ от API ЮКассы за ${requestDuration}ms, статус: ${response.status}`)
      clearTimeout(timeoutId) // Очищаем таймаут при успешном ответе
    } catch (fetchError: any) {
      clearTimeout(timeoutId) // Очищаем таймаут при ошибке
      
      // Обработка ошибки таймаута
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
        const requestDuration = Date.now() - requestStartTime
        console.error('⏱️ Таймаут запроса к API ЮКассы (30 секунд)')
        console.error('⏱️ Время ожидания:', requestDuration, 'ms')
        console.error('🔍 Диагностика:')
        console.error('  - Shop ID:', shopId)
        console.error('  - Secret Key длина:', secretKey.length)
        console.error('  - Secret Key начинается с:', secretKey.substring(0, 15))
        console.error('  - API URL:', apiUrl)
        console.error('  - Это может означать:')
        console.error('    1. Неверный Secret Key (сервер не отвечает)')
        console.error('    2. Проблемы с сетью между Supabase и ЮКассой')
        console.error('    3. API ЮКассы перегружен')
        
        // Возвращаем 200 статус, но с информацией об ошибке в теле
        // Это нужно, чтобы Supabase SDK передал тело ответа в data
        return new Response(
          JSON.stringify({ 
            error: 'Таймаут запроса к API ЮКассы. Проверьте правильность Shop ID и Secret Key.',
            type: 'TIMEOUT',
            details: `Запрос к API ЮКассы превысил 30 секунд. Время ожидания: ${requestDuration}ms`,
            suggestion: 'Возможные причины: 1) Неверный Secret Key (проверьте в личном кабинете ЮКассы), 2) Проблемы с сетью, 3) Аккаунт ЮКассы не активирован. Проверьте ключи в админ-панели и убедитесь, что используете правильный Secret Key (начинается с live_ для продакшн или test_ для тестов)'
          }),
          { 
            status: 200, // Возвращаем 200, чтобы Supabase передал тело ответа
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
      
      // Возвращаем 200 статус, но с информацией об ошибке в теле
      // Это нужно, чтобы Supabase SDK передал тело ответа в data
      return new Response(
        JSON.stringify({ 
          error: errorData.description || `Ошибка создания платежа: ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          details: errorData,
          type: 'YOOKASSA_API_ERROR'
        }),
        { 
          status: 200, // Возвращаем 200, чтобы Supabase передал тело ответа
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const paymentData = await response.json()

    // Для виджета нужен confirmation_token, для редиректа - confirmation_url
    if (useWidget) {
      if (!paymentData.confirmation?.confirmation_token) {
        return new Response(
          JSON.stringify({ error: 'Не получен токен для виджета от ЮКассы' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          confirmationToken: paymentData.confirmation.confirmation_token,
          paymentId: paymentData.id,
          paymentStatus: paymentData.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Редирект (старый способ)
      if (!paymentData.confirmation?.confirmation_url) {
        return new Response(
          JSON.stringify({ 
            error: 'Не получен URL для оплаты от ЮКассы',
            type: 'MISSING_URL',
            details: 'API ЮКассы вернул платеж, но без confirmation_url для редиректа'
          }),
          { 
            status: 200, // Возвращаем 200, чтобы Supabase передал тело ответа
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
    }
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
    // Возвращаем 200 статус, но с информацией об ошибке в теле
    // Это нужно, чтобы Supabase SDK передал тело ответа в data
    const errorResponse = {
      error: error.message || 'Не удалось создать платеж',
      type: error.constructor?.name || 'UnknownError',
      details: error.toString(),
      stack: process.env.DENO_ENV === 'development' ? error.stack : undefined
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 200, // Возвращаем 200, чтобы Supabase передал тело ответа
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
