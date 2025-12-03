// Supabase Edge Function для работы с API Почты России
// Это решает проблему CORS - функция выполняется на сервере Supabase

// @deno-types="https://deno.land/x/types/index.d.ts"
// @ts-expect-error - Deno импорт, TypeScript не может разрешить, но работает в runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Базовый URL API Почты России
// Используем otpravka-api.pochta.ru согласно документации
const POST_API_BASE_URL = 'https://otpravka-api.pochta.ru'

interface AddressData {
  city: string;
  region?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Получить OAuth токен доступа
 */
async function getAccessToken(apiKey: string): Promise<string> {
  try {
    // Согласно документации, сначала нужно получить токен через OAuth
    // Но для API Почты России может использоваться другой метод авторизации
    // Пробуем использовать apiKey напрямую как токен
    console.log('Попытка получения токена для API ключа')
    
    // Для API Почты России может использоваться apiKey как токен
    // Или нужно использовать другой метод авторизации
    return apiKey
  } catch (error: any) {
    console.error('Ошибка получения токена:', error)
    return apiKey
  }
}

/**
 * Выполнить запрос к API Почты России
 * Обрабатывает возможные проблемы с SSL/TLS сертификатами
 */
async function makePostApiRequest(
  endpoint: string,
  apiToken: string, // Токен авторизации приложения (AccessToken)
  userAuthKey: string | null, // Ключ авторизации пользователя base64(login:password) для X-User-Authorization
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  const url = `${POST_API_BASE_URL}${endpoint}`
  
  // Детальное логирование для отладки
  console.log(`📡 Отправка запроса к Почте России: ${method} ${url}`)
  console.log(`📋 Endpoint: ${endpoint}`)
  console.log(`🌐 Полный URL: ${url}`)
  console.log(`🔗 Base URL: ${POST_API_BASE_URL}`)
  
  // Для API Почты России используется два заголовка авторизации:
  // 1. Authorization: AccessToken <токен_приложения> - токен авторизации приложения
  // 2. X-User-Authorization: Basic <base64(login:password)> - ключ авторизации пользователя
  // Согласно документации: https://otpravka.pochta.ru/help
  const headers: Record<string, string> = {
    'Authorization': `AccessToken ${apiToken}`, // Токен авторизации приложения
    'Content-Type': 'application/json;charset=UTF-8', // Почта России требует charset=UTF-8
    'Accept': 'application/json;charset=UTF-8', // Почта России требует charset=UTF-8
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
  }
  
  // Добавляем X-User-Authorization если передан userAuthKey
  // userAuthKey должен быть base64(login:password) согласно документации
  // ВАЖНО: убираем префикс "Basic " если он уже есть (на случай, если пользователь сохранил с префиксом)
  if (userAuthKey) {
    let basicAuthValue = userAuthKey.trim();
    // Убираем префикс "Basic " если он присутствует
    if (basicAuthValue.startsWith('Basic ')) {
      basicAuthValue = basicAuthValue.substring(6).trim();
    }
    headers['X-User-Authorization'] = `Basic ${basicAuthValue}`
  }
  
  // Детальное логирование заголовков (без чувствительных данных)
  console.log('📬 Заголовки запроса:', {
    'Authorization': headers['Authorization'] ? `AccessToken ${apiToken.substring(0, 10)}...` : 'ОТСУТСТВУЕТ!',
    'X-User-Authorization': headers['X-User-Authorization'] ? `Basic ${userAuthKey?.substring(0, 10)}...` : 'ОТСУТСТВУЕТ!',
    'Content-Type': headers['Content-Type'],
    'Accept': headers['Accept'],
    hasToken: !!apiToken,
    hasUserAuth: !!userAuthKey,
    tokenLength: apiToken?.length || 0,
    userAuthLength: userAuthKey?.length || 0,
    endpoint: endpoint,
    method: method
  })

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && method === 'POST') {
    const bodyString = JSON.stringify(body)
    options.body = bodyString
    console.log('📄 Тело запроса:', bodyString)
    console.log('📄 Тело запроса (первые 500 символов):', bodyString.substring(0, 500))
  } else {
    console.log('📄 Тело запроса: Нет тела (GET запрос)')
  }
  
  // Финальная проверка перед отправкой
  console.log('✅ Все готово к отправке запроса')

  try {
    // В Deno fetch может иметь проблемы с SSL, но обычно работает
    // Если есть проблемы, они проявятся как сетевые ошибки
    const response = await fetch(url, options)
    
    console.log(`Ответ API: ${response.status} ${response.statusText}`)
    console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Ошибка API: ${response.status}`, errorText.substring(0, 500))
      
      // Специальная обработка ошибки 407 (неправильный endpoint или метод)
      if (response.status === 407) {
        throw new Error('Ошибка 407: Неправильный endpoint или метод API. Возможно, API Почты России изменился. Проверьте актуальную документацию: https://otpravka.pochta.ru/specification')
      }
      
      // Специальная обработка ошибки 401 (неправильный токен)
      if (response.status === 401) {
        const errorMsg = errorText.toLowerCase();
        if (errorMsg.includes('token') || errorMsg.includes('unauthorized')) {
          throw new Error('Ошибка 401: Неправильный AccessToken. Проверьте, что в поле api_key таблицы delivery_services сохранен правильный токен приложения (AccessToken) из личного кабинета Почты России. Токен должен быть длинной строкой символов, а не base64(login:password).')
        }
        throw new Error(`Ошибка 401: Не авторизован. Проверьте правильность AccessToken в настройках доставки. Детали: ${errorText.substring(0, 200)}`)
      }
      
      // Специальная обработка ошибки 417 (блокировка)
      if (response.status === 417) {
        throw new Error('API Почты России заблокировал запрос. Возможные причины: IP-адрес заблокирован, требуется настройка белого списка IP в личном кабинете Почты России, или неправильная авторизация.')
      }
      
      // Обработка ошибки SSL/TLS (если есть)
      if (response.status === 0 || errorText.includes('certificate') || errorText.includes('SSL') || errorText.includes('TLS')) {
        throw new Error('Проблема с SSL/TLS сертификатом API Почты России. Рекомендуется использовать прокси-сервер или обратиться в поддержку Почты России.')
      }
      
      throw new Error(`API Почты России вернул ошибку ${response.status}: ${errorText.substring(0, 200) || response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json()
      console.log('✅ Успешный ответ API Почты России (полный JSON):', JSON.stringify(data, null, 2))
      console.log('📊 Размер данных:', JSON.stringify(data).length, 'символов')
      return data
    } else {
      // Если ответ не JSON, читаем текст для отладки
      const text = await response.text()
      console.error('⚠️ API вернул не JSON ответ:', {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        responseText: text.substring(0, 500)
      })
      
      // Пытаемся распарсить как JSON, если это возможно
      try {
        const parsed = JSON.parse(text)
        return parsed
      } catch (parseError) {
        // Если не JSON, выбрасываем ошибку с деталями
        throw new Error(`API вернул не JSON ответ (${response.status} ${response.statusText}): ${text.substring(0, 200)}`)
      }
    }
  } catch (error: any) {
    console.error(`Ошибка запроса к API Почты России (${endpoint}):`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    })
    
    // Проверяем, не связана ли ошибка с SSL/TLS
    if (error.message?.includes('certificate') || 
        error.message?.includes('SSL') || 
        error.message?.includes('TLS') ||
        error.message?.includes('cert') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      throw new Error('Проблема подключения к API Почты России. Возможно, проблема с SSL/TLS сертификатом. Рекомендуется использовать прокси-сервер.')
    }
    
    throw error
  }
}

serve(async (req) => {
  // Обработка preflight запроса
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, apiKey, apiToken, apiSecret, userAuth, address, from, to, weight, declaredValue, officeId, top } = body

    // Токен авторизации приложения обязателен
    if (!apiToken && !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Токен авторизации приложения (AccessToken) не предоставлен. Укажите apiToken или apiKey.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // API Token - это токен авторизации приложения (AccessToken)
    // Если не передан apiToken, используем apiKey как токен (для обратной совместимости)
    const token = apiToken || apiKey
    
    // apiSecret - это base64(login:password) для заголовка X-User-Authorization (ОБЯЗАТЕЛЕН!)
    // Приоритет: apiSecret > userAuth > apiKey (если похож на base64)
    let userAuthKey = apiSecret || userAuth || (apiKey && apiKey.length > 20 ? apiKey : null)
    
    // Убираем префикс "Basic " если он присутствует (на случай, если пользователь сохранил с префиксом)
    if (userAuthKey && userAuthKey.startsWith('Basic ')) {
      userAuthKey = userAuthKey.substring(6).trim();
    }
    
    // Логируем наличие секрета для отладки
    if (!userAuthKey) {
      console.warn('⚠️ ВНИМАНИЕ: X-User-Authorization не будет отправлен. API может вернуть ошибку 407.')
    }
    
    // Логируем наличие токена для отладки
    if (!token) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: AccessToken не предоставлен. API вернет ошибку 401.')
    } else {
      console.log('✅ AccessToken предоставлен, длина:', token.length)
    }

    // Поиск точек выдачи
    if (action === 'search_post_offices') {
      const searchTop = top || 50; // Получаем top из тела, по умолчанию 50

      if (!address || (!address.city && !address.address)) {
        return new Response(
          JSON.stringify({ error: 'Не указан адрес или город для поиска' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      try {
        // --- ИСПОЛЬЗУЕМ GET-ENDPOINT ДЛЯ ПОИСКА ПО АДРЕСУ ---
        const endpoint = '/postoffice/1.0/by-address' // <-- ЭТО ТОТ САМЫЙ URL!
        
        const queryParams = new URLSearchParams()
        
        // Передаем наиболее полный адрес, который есть
        const fullAddress = address.address || 
                           (address.region ? `${address.region}, ${address.city}` : address.city) ||
                           address.city
        
        queryParams.append('address', fullAddress.trim())
        queryParams.append('top', String(searchTop)) 
        
        const url = `${endpoint}?${queryParams.toString()}`

        console.log(`🔍 Запрос поиска отделений (GET): ${POST_API_BASE_URL}${url}`)
        
        // Используем makePostApiRequest (это просто обертка fetch)
        // Метод: GET, body: undefined
        const officesResponse = await makePostApiRequest(
          url,
          token,
          userAuthKey,
          'GET' // <-- МЕТОД GET
        )

        // API возвращает объект с полем 'postoffices' или массив индексов
        let rawOffices: any[] = []
        if (officesResponse && Array.isArray(officesResponse.postoffices)) {
            // API возвращает список почтовых индексов в виде строк
            rawOffices = officesResponse.postoffices
        } else if (Array.isArray(officesResponse)) {
            // Или массив напрямую
            rawOffices = officesResponse
        } else if (officesResponse && Array.isArray(officesResponse.offices)) {
            // Или в поле offices
            rawOffices = officesResponse.offices
        } else {
            rawOffices = []
        }
        
        // ВНИМАНИЕ: Этот endpoint может возвращать ТОЛЬКО список индексов!
        // Чтобы получить детали (адрес, координаты, часы работы),
        // нужно вызвать getPostOfficeById для каждого индекса.
        // Но сначала попробуем обработать то, что получили
        
        const postOffices = rawOffices
          .slice(0, searchTop) // Ограничиваем количество
          .map((office: any) => {
            // Если это просто строка (индекс), создаем базовый объект
            if (typeof office === 'string') {
              return {
                id: office,
                index: office,
                postalCode: office,
                name: `Отделение ${office}`,
                address: `Почтовый индекс: ${office}`,
                latitude: 0,
                longitude: 0,
                workingHours: 'Получение деталей через getPostOfficeById',
                type: 'post_office'
              }
            }
            
            // Если это объект с данными, обрабатываем как обычно
            let type = 'post_office'
            if (office.type === 'POSTAMAT' || office.type === 'постамат') {
              type = 'postamat'
            } else if (office.type === 'TERMINAL' || office.type === 'терминал') {
              type = 'terminal'
            }

            const officeAddress = office.address?.source || 
                                office.address?.addressString ||
                                `${office.address?.city || ''}, ${office.address?.street || ''}, ${office.address?.house || ''}`.trim() ||
                                office.address ||
                                'Адрес не указан'

            const officeName = office.name || 
                              office.description ||
                              `Отделение Почты России ${office.index || office.postalCode || ''}` ||
                              'Отделение Почты России'

            const workingHours = office.workTime || 
                               office.workingHours ||
                               office.schedule ||
                               'Не указано'

            return {
              id: office.index || office.postalCode || office.id || `${office.latitude}_${office.longitude}`,
              index: office.index || office.postalCode,
              postalCode: office.postalCode || office.index,
              name: officeName,
              address: officeAddress,
              latitude: office.latitude || office.coordinates?.latitude || 0,
              longitude: office.longitude || office.coordinates?.longitude || 0,
              workingHours: workingHours,
              distance: office.distance || null,
              type: type,
            }
          })

        if (postOffices.length === 0) {
          console.warn('API Почты России не вернул отделений для адреса:', fullAddress)
          return new Response(
            JSON.stringify({ 
              postOffices: [],
              error: 'Отделения не найдены. Проверьте правильность названия города и настройки API ключа.',
              debug: {
                address: fullAddress,
                hasApiKey: !!apiKey,
                hasToken: !!token,
              }
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        return new Response(
          JSON.stringify({ postOffices }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (error: any) {
        console.error('Ошибка поиска отделений:', error)
        
        // Возвращаем ошибку вместо тестовых данных
        // Это поможет понять, что именно не работает
        const errorMessage = error.message || 'Неизвестная ошибка при поиске отделений'
        const errorDetails = error.toString()
        
        return new Response(
          JSON.stringify({ 
            postOffices: [],
            error: `Ошибка API Почты России: ${errorMessage}`,
            details: errorDetails,
            debug: {
              city: address.city,
              hasApiKey: !!apiKey,
              hasToken: !!token,
            }
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Расчет стоимости доставки
    if (action === 'calculate_delivery') {
      if (!from || !to || !weight) {
        return new Response(
          JSON.stringify({ error: 'Недостаточно данных для расчета доставки' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      try {
        // Расчет стоимости доставки через API Почты России
        // Актуальный эндпоинт: POST /1.0/tariff (согласно документации)
        // Согласно документации API Почты России, формат запроса использует camelCase:
        // - indexFrom: индекс отправителя (строка)
        // - indexTo: индекс получателя (строка)
        // - weight: вес в граммах (минимум 100)
        // - declaredValue: объявленная стоимость в копейках (минимум 1)
        // - mailType: тип отправления (POSTAL_PARCEL)
        // - mailCategory: категория (ORDINARY)
        
        // Получаем индексы (должны быть строками)
        const indexFrom = String(from.postalCode || '101000')
        const indexTo = String(to.postalCode || '101000')
        
        // Вес должен быть минимум 100 граммов для надежности
        const weightInGrams = Math.max(100, Math.ceil(weight))
        
        // Объявленная стоимость: если передана в рублях, конвертируем в копейки
        // Минимум 1 копейка, чтобы API не отклонил запрос
        const declaredValueInKopecks = declaredValue ? Math.max(1, Math.ceil(declaredValue * 100)) : 1
        
        // Формат запроса согласно документации API Почты России:
        // Используем kebab-case (через дефис) и поле 'mass' вместо 'weight'
        // ВАЖНО: Если declaredValue > 0, обязательно нужен сервис "Объявленная ценность" (ID: 2)
        const tariffRequest: any = {
          'index-from': indexFrom, // Индекс отправителя (строка, kebab-case)
          'index-to': indexTo, // Индекс получателя (строка, kebab-case)
          'mass': weightInGrams, // Вес в граммах (минимум 100) - ВАЖНО: 'mass', а не 'weight'!
          'declared-value': declaredValueInKopecks, // Объявленная стоимость в копейках (минимум 1)
          'mail-type': 'POSTAL_PARCEL', // Тип отправления: POSTAL_PARCEL (посылка)
          'mail-category': 'ORDINARY', // Категория: ORDINARY (обычная), REGISTERED (с объявленной ценностью)
        }
        
        // Добавляем обязательный сервис "Объявленная ценность" если declaredValue > 0
        if (declaredValueInKopecks > 0) {
          tariffRequest.service = [
            { id: 2 } // Сервис "Объявленная ценность" (обязателен при declaredValue > 0)
          ]
        }

        console.log('Запрос расчета тарифа:', JSON.stringify(tariffRequest))
        console.log('📊 Параметры:', {
          from: indexFrom,
          to: indexTo,
          weight: weight,
          weightInGrams: weightInGrams,
          declaredValue: declaredValue,
          declaredValueInKopecks: declaredValueInKopecks
        })

        // ВАЖНО: Используем правильный endpoint согласно документации: /1.0/tariff (не /tariff/1.0/calculate)
        const tariffResponse = await makePostApiRequest(
          '/1.0/tariff',
          token,
          userAuthKey,
          'POST',
          tariffRequest
        )

        // Логируем полный ответ API для отладки
        console.log('📦 Полный ответ API Почты России (calculate_delivery):', JSON.stringify(tariffResponse, null, 2))
        
        // Проверяем наличие ошибок в ответе
        if (!tariffResponse) {
          throw new Error('API Почты России вернул пустой ответ')
        }
        
        if (tariffResponse.error || tariffResponse.errors) {
          const errorMessage = tariffResponse.error || 
                              (Array.isArray(tariffResponse.errors) ? tariffResponse.errors.join(', ') : JSON.stringify(tariffResponse.errors))
          console.error('❌ Ошибка в ответе API:', errorMessage)
          throw new Error(`API Почты России вернул ошибку: ${errorMessage}`)
        }

        // Извлекаем стоимость из ответа
        // Проверяем разные варианты названий полей (kebab-case и camelCase)
        let cost = 0
        let deliveryTime = '5-7'
        let type = 'standard'
        let description = 'Стандартная доставка Почтой России'

        // Стоимость может быть в разных полях в зависимости от версии API
        // Проверяем как kebab-case, так и camelCase варианты
        cost = tariffResponse['total-rate'] ||      // kebab-case
               tariffResponse.totalRate ||          // camelCase
               tariffResponse['total'] ||           // kebab-case
               tariffResponse.total ||              // camelCase
               tariffResponse['total-vat'] ||       // kebab-case
               tariffResponse.totalVat ||           // camelCase
               tariffResponse['delivery-cost'] ||   // kebab-case
               tariffResponse.deliveryCost ||       // camelCase
               tariffResponse.cost ||               // просто cost
               0

        console.log('💰 Извлеченная стоимость:', cost, 'копеек')

        // Срок доставки
        const deliveryTimeObj = tariffResponse['delivery-time'] || 
                               tariffResponse.deliveryTime ||
                               tariffResponse.days
        if (deliveryTimeObj) {
          if (typeof deliveryTimeObj === 'object') {
            deliveryTime = `${deliveryTimeObj.min || 5}-${deliveryTimeObj.max || 7}`
          } else {
            deliveryTime = String(deliveryTimeObj)
          }
        }

        // Тип доставки
        const mailType = tariffResponse['mail-type'] || tariffResponse.mailType
        if (mailType === 'EMS') {
          type = 'express'
        } else if (mailType === 'FIRST_CLASS') {
          type = 'first_class'
        }

        description = tariffResponse.description || description

        // Если API не вернул стоимость, возвращаем ошибку с деталями
        if (cost === 0 || cost === null || cost === undefined) {
          console.error('❌ API не вернул стоимость доставки. Доступные поля в ответе:', Object.keys(tariffResponse))
          throw new Error('API Почты России не вернул стоимость доставки. Возможные причины: доставка невозможна между указанными индексами, неправильный тип отправления, или ошибка в параметрах запроса. Проверьте логи для деталей.')
        }

        return new Response(
          JSON.stringify({
            cost: Math.ceil(cost / 100), // Конвертируем из копеек в рубли
            deliveryTime,
            type,
            description,
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (error: any) {
        console.error('Ошибка расчета стоимости доставки:', error)
        
        // Проверяем, не связана ли ошибка с SSL/TLS
        const isSSLError = error.message?.includes('certificate') || 
                          error.message?.includes('SSL') || 
                          error.message?.includes('TLS') ||
                          error.message?.includes('cert') ||
                          (error.name === 'TypeError' && error.message?.includes('fetch'))
        
        const errorMessage = isSSLError 
          ? 'Проблема подключения к API Почты России. Возможно, проблема с SSL/TLS сертификатом. Рекомендуется использовать прокси-сервер или обратиться в поддержку Почты России.'
          : error.message || 'Не удалось рассчитать стоимость доставки'

        return new Response(
          JSON.stringify({
            error: errorMessage,
            details: process.env.DENO_ENV === 'development' ? error.toString() : undefined,
            type: isSSLError ? 'ssl_error' : 'api_error'
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Получение информации о точке выдачи
    if (action === 'get_post_office') {
      if (!officeId) {
        return new Response(
          JSON.stringify({ error: 'Не указан ID точки выдачи' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      try {
        // Получение информации об отделении по индексу
        // Актуальный эндпоинт: GET /1.0/office/{index}
        const officeResponse = await makePostApiRequest(
          `/1.0/office/${officeId}`,
          token,
          userAuthKey,
          'GET'
        )

        if (officeResponse) {
          let type = 'post_office'
          if (officeResponse.type === 'POSTAMAT' || officeResponse.type === 'постамат') {
            type = 'postamat'
          } else if (officeResponse.type === 'TERMINAL' || officeResponse.type === 'терминал') {
            type = 'terminal'
          }

          const officeAddress = officeResponse.address?.source || 
                              officeResponse.address?.addressString ||
                              `${officeResponse.address?.city || ''}, ${officeResponse.address?.street || ''}, ${officeResponse.address?.house || ''}`.trim() ||
                              officeResponse.address ||
                              'Адрес не указан'

          const officeName = officeResponse.name || 
                            officeResponse.description ||
                            `Отделение Почты России ${officeResponse.index || officeId}` ||
                            'Отделение Почты России'

          return new Response(
            JSON.stringify({
              id: officeResponse.index || officeId,
              name: officeName,
              address: officeAddress,
              latitude: officeResponse.latitude || officeResponse.coordinates?.latitude || 0,
              longitude: officeResponse.longitude || officeResponse.coordinates?.longitude || 0,
              workingHours: officeResponse.workTime || officeResponse.workingHours || officeResponse.schedule || 'Не указано',
              type: type,
            }),
            { 
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }

        // Если не найдено, возвращаем базовую информацию
        return new Response(
          JSON.stringify({
            id: officeId,
            name: 'Отделение Почты России',
            address: 'Адрес не указан',
            latitude: 0,
            longitude: 0,
            workingHours: 'Не указано',
            type: 'post_office',
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (error: any) {
        console.error('Ошибка получения информации об отделении:', error)
        
        // Возвращаем базовую информацию при ошибке
        return new Response(
          JSON.stringify({
            id: officeId,
            name: 'Отделение Почты России',
            address: 'Адрес не указан',
            latitude: 0,
            longitude: 0,
            workingHours: 'Не указано',
            type: 'post_office',
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Неизвестное действие' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Ошибка в функции russian-post-api:', error)
    console.error('Тип ошибки:', error.constructor?.name)
    console.error('Сообщение:', error.message)
    console.error('Стек ошибки:', error.stack)
    
    // Возвращаем детальную информацию об ошибке для отладки
    const errorResponse = {
      error: error.message || 'Внутренняя ошибка сервера',
      type: error.constructor?.name || 'UnknownError',
      // Не включаем stack в продакшн для безопасности
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

