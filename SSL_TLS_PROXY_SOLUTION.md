# Решение проблемы SSL/TLS с API Почты России

## Проблема

Supabase Edge Functions (Deno) могут иметь проблемы с SSL/TLS сертификатами API Почты России, что приводит к ошибкам подключения.

## Решение: Создание прокси-сервера

Если Edge Function не работает из-за SSL/TLS проблем, создайте простой прокси-сервер на Node.js.

### Вариант 1: Vercel Serverless Functions (рекомендуется)

Если ваш сайт на Vercel, создайте API route:

**`api/pochta/search.js`**:
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city, region, postalCode } = req.body;

  try {
    const response = await fetch('https://otpravka-api.pochta.ru/1.0/office?filter=ALL&top=50', {
      method: 'POST',
      headers: {
        'Authorization': `AccessToken ${process.env.POCHTA_API_TOKEN}`,
        'Authorization-Key': process.env.POCHTA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ city, region, postalCode }])
    });

    const data = await response.json();
    res.status(200).json({ postOffices: data });
  } catch (error) {
    console.error('Pochta API error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

**`api/pochta/calculate.js`**:
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { from, to, weight, value } = req.body;

  try {
    const response = await fetch('https://otpravka-api.pochta.ru/1.0/tariff', {
      method: 'POST',
      headers: {
        'Authorization': `AccessToken ${process.env.POCHTA_API_TOKEN}`,
        'Authorization-Key': process.env.POCHTA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexFrom: from.postalCode || '101000',
        indexTo: to.postalCode,
        mailCategory: 'ORDINARY',
        mailType: 'POSTAL_PARCEL',
        weight: weight,
        declaredValue: value || 0
      })
    });

    const data = await response.json();
    
    // Приводим к нашему формату
    res.status(200).json({
      cost: Math.ceil((data.total || data.totalRate || 0) / 100),
      deliveryTime: data.deliveryTime ? `${data.deliveryTime.min}-${data.deliveryTime.max}` : '5-7',
      type: 'standard',
      description: 'Стандартная доставка Почтой России'
    });
  } catch (error) {
    console.error('Pochta API error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### Вариант 2: Отдельный Node.js сервер (Render, Railway, Heroku)

**`server.js`**:
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const POCHTA_TOKEN = process.env.POCHTA_API_TOKEN || 'ty2372MFNCTRiqBF8OfmoBBuMh785Ldy';
const POCHTA_KEY = process.env.POCHTA_API_KEY;

app.post('/api/pochta/search', async (req, res) => {
  try {
    const { city, region, postalCode } = req.body;

    const response = await fetch('https://otpravka-api.pochta.ru/1.0/office?filter=ALL&top=50', {
      method: 'POST',
      headers: {
        'Authorization': `AccessToken ${POCHTA_TOKEN}`,
        'Authorization-Key': POCHTA_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ city, region, postalCode }])
    });

    if (!response.ok) {
      throw new Error(`API вернул ошибку: ${response.status}`);
    }

    const data = await response.json();
    res.json({ postOffices: data });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pochta/calculate', async (req, res) => {
  try {
    const { from, to, weight, value } = req.body;

    const response = await fetch('https://otpravka-api.pochta.ru/1.0/tariff', {
      method: 'POST',
      headers: {
        'Authorization': `AccessToken ${POCHTA_TOKEN}`,
        'Authorization-Key': POCHTA_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        indexFrom: from.postalCode || '101000',
        indexTo: to.postalCode,
        mailCategory: 'ORDINARY',
        mailType: 'POSTAL_PARCEL',
        weight: weight,
        declaredValue: value || 0
      })
    });

    if (!response.ok) {
      throw new Error(`API вернул ошибку: ${response.status}`);
    }

    const data = await response.json();
    
    res.json({
      cost: Math.ceil((data.total || data.totalRate || 0) / 100),
      deliveryTime: data.deliveryTime ? `${data.deliveryTime.min}-${data.deliveryTime.max}` : '5-7',
      type: 'standard',
      description: 'Стандартная доставка Почтой России'
    });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Прокси-сервер для Почты России запущен на порту ${PORT}`);
});
```

**`package.json`**:
```json
{
  "name": "pochta-proxy",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```

## Обновление фронтенда для использования прокси

Если создали прокси-сервер, обновите `russianPostService.ts`:

```typescript
// Добавьте переменную окружения для URL прокси
const PROXY_SERVER_URL = import.meta.env.VITE_POCHTA_PROXY_URL || '';

export const russianPostService = {
  async searchPostOffices(address: AddressData): Promise<PostOffice[]> {
    try {
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ не настроен');
      }

      // Если есть прокси-сервер, используем его
      if (PROXY_SERVER_URL) {
        const response = await fetch(`${PROXY_SERVER_URL}/api/pochta/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: address.city,
            region: address.region,
            postalCode: address.postalCode
          })
        });

        const data = await response.json();
        return data.postOffices || [];
      }

      // Иначе используем Edge Function
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'search_post_offices',
          apiKey,
          apiToken,
          address
        }
      });

      if (error) throw error;
      return data.postOffices || [];
    } catch (error: any) {
      throw new Error(error.message || 'Не удалось найти точки выдачи');
    }
  },

  async calculateDelivery(from: AddressData, to: AddressData, weight: number, declaredValue?: number): Promise<DeliveryCalculation> {
    try {
      const { apiKey, apiToken } = await this.getApiCredentials();
      
      if (!apiKey) {
        throw new Error('API ключ не настроен');
      }

      // Если есть прокси-сервер, используем его
      if (PROXY_SERVER_URL) {
        const response = await fetch(`${PROXY_SERVER_URL}/api/pochta/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { postalCode: from.postalCode || '101000' },
            to: { postalCode: to.postalCode },
            weight,
            value: declaredValue
          })
        });

        const data = await response.json();
        return {
          cost: data.cost,
          deliveryTime: data.deliveryTime,
          type: data.type || 'standard',
          description: data.description
        };
      }

      // Иначе используем Edge Function
      const { data, error } = await supabase.functions.invoke('russian-post-api', {
        body: {
          action: 'calculate_delivery',
          apiKey,
          apiToken,
          from,
          to,
          weight,
          declaredValue
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'Не удалось рассчитать стоимость доставки');
    }
  }
};
```

## Проверка SSL сертификата

```bash
# Проверка SSL сертификата Почты России
openssl s_client -connect otpravka-api.pochta.ru:443 -showcerts

# Или через curl
curl -v https://otpravka-api.pochta.ru/1.0/office \
  --header "Authorization: AccessToken YOUR_TOKEN" \
  --header "Authorization-Key: YOUR_KEY"
```

## Рекомендации

1. **Сначала проверьте Edge Function** - возможно, проблема не в SSL, а в блокировке IP
2. **Если Edge Function не работает** - создайте прокси-сервер на Vercel (если сайт там) или на отдельном хостинге
3. **Используйте переменные окружения** для хранения API ключей
4. **Не отключайте проверку SSL** в продакшене без крайней необходимости

