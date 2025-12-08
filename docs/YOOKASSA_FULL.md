# Полный комплект по оплате / ЮКасса

## Файлы (текущие пути)
- `supabase/functions/create-yookassa-payment/index.ts` — Edge Function (Deno) для вызова API ЮКассы.
- `src/services/yookassaService.ts` — клиентский сервис, вызывает Edge Function.
- `src/pages/Payment.tsx` — страница оплаты (розница) с виджетом ЮКассы.
- `src/pages/Checkout.tsx` — страница оплаты (опт).
- `src/pages/CheckoutSuccess.tsx` — проверка статуса платежа после возврата.
- `YOOKASSA_INTEGRATION_SUMMARY.md` — прежняя краткая сводка.

## Текущий код Edge Function (create-yookassa-payment)
Файл: `supabase/functions/create-yookassa-payment/index.ts`
```typescript
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shopId: rawShopId, secretKey, amount: rawAmount, orderId, orderNumber, description, returnUrl, testMode, useWidget } = await req.json()

    if (!rawShopId || !secretKey || !rawAmount || !orderId || !returnUrl) {
      return new Response(JSON.stringify({ error: 'Недостаточно параметров для создания платежа. Проверьте Shop ID и Secret Key.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const shopId = String(rawShopId)
    const amount = Number(rawAmount)

    if (isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Неверная сумма платежа. Сумма должна быть положительным числом.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!secretKey || secretKey.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Secret Key не настроен. Проверьте настройки в админ-панели.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const paymentRequest = {
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      confirmation: { type: useWidget ? 'embedded' : 'redirect', return_url: returnUrl },
      description: description || `Заказ №${orderNumber || orderId}`,
      capture: true,
    }

    const apiUrl = 'https://api.yookassa.ru/v3/payments'
    const authToken = btoa(`${shopId}:${secretKey}`)

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
        JSON.stringify({ error: errorData.description || `Ошибка создания платежа: ${response.status}`, status: response.status, details: errorData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // 200, чтобы Supabase SDK вернул тело в data
      )
    }

    const paymentData = await response.json()

    if (useWidget) {
      if (!paymentData.confirmation?.confirmation_token) {
        return new Response(JSON.stringify({ error: 'Не получен токен для виджета от ЮКассы' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ confirmationToken: paymentData.confirmation.confirmation_token, paymentId: paymentData.id, paymentStatus: paymentData.status }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      if (!paymentData.confirmation?.confirmation_url) {
        return new Response(JSON.stringify({ error: 'Не получен URL для оплаты от ЮКассы' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ paymentUrl: paymentData.confirmation.confirmation_url, paymentId: paymentData.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (error: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в функции create-yookassa-payment:', error)
    return new Response(JSON.stringify({ error: error.message || 'Не удалось создать платеж', type: error.constructor?.name || 'UnknownError', details: error.toString() }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
```

## Клиентский сервис (фрагмент)
Файл: `src/services/yookassaService.ts`
```typescript
export const yookassaService = {
  async createPayment(gateway, amount, orderId, orderNumber, description, returnUrl, useWidget = false) {
    const shopId = gateway.shopId || ''
    const secretKey = gateway.testMode ? (gateway.testSecretKey || gateway.secretKey || '') : (gateway.secretKey || '')
    if (!shopId || !secretKey) throw new Error('Не настроены ключи ЮКассы. Проверьте настройки в админ-панели.')

    const { data, error } = await supabase.functions.invoke('create-yookassa-payment', {
      body: { shopId, secretKey, amount, orderId, orderNumber, description, returnUrl, testMode: gateway.testMode || false, useWidget: true },
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

    return {
      paymentUrl: data.paymentUrl,
      paymentId: data.paymentId,
      confirmationToken: data.confirmationToken,
    }
  },
}
```

## Основные ошибки, которые фиксировали
- TLS: `peer closed connection without sending TLS close_notify` — чаще всего неверный Secret Key или отказ на стороне ЮКассы.
- Таймауты (15–30–60s) — уменьшали/увеличивали, затем убрали таймаут и retries.
- FunctionsHttpError (non-2xx) — сейчас возвращаем 200 при ошибках, чтобы Supabase SDK отдавал `data` с ошибкой.
- 401 Unauthorized — неверные ключи.
- 400 invalid_request — неверный формат запроса.

## Логи (примеры сообщений)
- `❌ КРИТИЧЕСКАЯ ОШИБКА в функции create-yookassa-payment: TypeError: error sending request ... peer closed connection without sending TLS close_notify`
- `Таймаут запроса к API ЮКассы (30 секунд)` (устранено: сейчас таймаутов нет)
- `Edge Function returned a non-2xx status code` (устранено: возвращаем 200 при ошибках)

## Коммиты по оплате (ключевые)
- 4babf42 / fb32611 — возврат 200 при ошибках, чтобы SDK не ронял FunctionsHttpError.
- d3e4074 / a4ab3f0 / 7a4a7cb / f4f89f3 — эксперименты с таймаутами, keepalive, retry; всё убрано.
- f9ee1c4 (07 Dec) — упрощённая версия по докам (Basic Auth, idempotence-key, без лишних проверок).
- b96e2b9 — фикс двойного authToken.
- c9b82d4 — диагностика TLS/Network ошибок.
- 2b5dba0 — интеграция виджета ЮКассы на фронте.

## Проверка настроек
1. Shop ID — число, из кабинета ЮКассы.
2. Secret Key — `test_...` для теста, `live_...` для прод.
3. В админке (`/admin/delivery`) включить платёжку и режим (test/prod), заполнить ключи.
4. В Supabase задеплоить функцию: `npx supabase functions deploy create-yookassa-payment`.

## Как диагностировать сейчас
1) Запуск платежа и смотреть консоль браузера — в `data` придёт тело ошибки от Edge Function (статус 200).
2) Логи Supabase → Edge Functions → create-yookassa-payment → Logs — там полные ошибки TLS/HTTP.
3) Если TLS `peer closed connection` — почти всегда неверный/неактивный Secret Key или отказ ЮКассы; проверить ключ и статус магазина.

## Пример запроса к Edge Function (текущий формат)
```json
{
  "shopId": "1214606",
  "secretKey": "live_xxx или test_xxx",
  "amount": 270,
  "orderId": "123",
  "orderNumber": "123",
  "description": "Заказ №123",
  "returnUrl": "https://modanagolovu.ru/checkout/success?orderId=123",
  "testMode": false,
  "useWidget": true
}
```

## Пример тела запроса к API ЮКассы (формирует Edge Function)
```json
{
  "amount": { "value": "270.00", "currency": "RUB" },
  "confirmation": { "type": "embedded", "return_url": "https://modanagolovu.ru/checkout/success?orderId=123" },
  "description": "Заказ №123",
  "capture": true
}
```

## Пример заголовков к API ЮКассы
```
Content-Type: application/json
Idempotence-Key: 123-1699999999999
Authorization: Basic base64(shopId:secretKey)
```

## Где смотреть ошибки
- Supabase Dashboard → Edge Functions → create-yookassa-payment → Logs
- Консоль браузера (yookassaService): поле `data.error` и `data.details`


