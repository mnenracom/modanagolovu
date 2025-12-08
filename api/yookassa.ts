// Vercel Serverless Function для проксирования запросов к API ЮКассы
// Обходит TLS проблемы в Supabase Edge Functions (Deno)

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Извлечение данных из тела запроса
    const { shopId, secretKey, amount, orderId, orderNumber, description, returnUrl, testMode, useWidget } = req.body;

    // Очистка ключей от пробелов (важно для Basic Auth)
    const cleanShopId = String(shopId || '').trim();
    const cleanSecretKey = String(secretKey || '').trim();

    if (!cleanShopId || !cleanSecretKey || !amount || !orderId || !returnUrl) {
      return res.status(400).json({ 
        error: 'Недостаточно параметров для создания платежа. Проверьте Shop ID и Secret Key.' 
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ 
        error: 'Неверная сумма платежа. Сумма должна быть положительным числом.' 
      });
    }

    // 2. Формирование Basic Auth токена
    const authToken = Buffer.from(`${cleanShopId}:${cleanSecretKey}`).toString('base64');
    const idempotenceKey = `${orderId}-${Date.now()}`;

    // 3. Формирование тела запроса для ЮКассы
    const paymentRequest = {
      amount: {
        value: numAmount.toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: useWidget ? 'embedded' : 'redirect',
        return_url: returnUrl,
      },
      description: description || `Заказ №${orderNumber || orderId}`,
      capture: true,
    };

    // 4. Выполнение запроса к ЮКассе
    const yookassaResponse = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': idempotenceKey,
        'Authorization': `Basic ${authToken}`,
      },
      body: JSON.stringify(paymentRequest),
    });

    const responseData = await yookassaResponse.json().catch(() => ({}));

    // 5. Обработка ответа
    if (!yookassaResponse.ok) {
      return res.status(200).json({
        error: responseData.description || `Ошибка создания платежа: ${yookassaResponse.status}`,
        status: yookassaResponse.status,
        statusText: yookassaResponse.statusText,
        details: responseData,
        type: 'YOOKASSA_API_ERROR'
      });
    }

    // 6. Возврат данных клиенту
    if (useWidget) {
      if (!responseData.confirmation?.confirmation_token) {
        return res.status(200).json({
          error: 'Не получен токен для виджета от ЮКассы'
        });
      }

      return res.status(200).json({
        confirmationToken: responseData.confirmation.confirmation_token,
        paymentId: responseData.id,
        paymentStatus: responseData.status,
      });
    } else {
      if (!responseData.confirmation?.confirmation_url) {
        return res.status(200).json({
          error: 'Не получен URL для оплаты от ЮКассы',
          type: 'MISSING_URL',
          details: 'API ЮКассы вернул платеж, но без confirmation_url для редиректа'
        });
      }

      return res.status(200).json({
        paymentUrl: responseData.confirmation.confirmation_url,
        paymentId: responseData.id,
      });
    }

  } catch (error: any) {
    console.error('❌ Ошибка в Vercel Serverless Function (yookassa):', error);
    
    return res.status(200).json({
      error: error.message || 'Не удалось создать платеж',
      type: error.constructor?.name || 'UnknownError',
      details: error.toString()
    });
  }
}

