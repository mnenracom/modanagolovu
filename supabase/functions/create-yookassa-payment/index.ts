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
    const paymentRequest = {
      amount: {
        value: amount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: useWidget ? 'embedded' : 'redirect',
        return_url: returnUrl,
      },
      description: description || `Заказ №${orderNumber || orderId}`,
      capture: true, // Автоматическое подтверждение платежа
    }

    // Используем правильный URL API (продакшн или тестовый)
    const apiUrl = 'https://api.yookassa.ru/v3/payments'

    // Формируем Basic Auth токен
    const authToken = btoa(`${shopId}:${secretKey}`)

    // Формируем заголовки с Basic Auth
    const headers = {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${orderId}-${Date.now()}`,
      'Authorization': `Basic ${authToken}`,
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentRequest),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
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
    }
  } catch (error: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в функции create-yookassa-payment:', error)
    
    // Возвращаем 200 статус с ошибкой в теле, чтобы Supabase SDK передал данные
    return new Response(
      JSON.stringify({
        error: error.message || 'Не удалось создать платеж',
        type: error.constructor?.name || 'UnknownError',
        details: error.toString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
