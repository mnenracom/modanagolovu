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
    console.log('📄 Тело запроса (JSON строка):', bodyString)
    console.log('📄 Тело запроса (первые 1000 символов):', bodyString.substring(0, 1000))
    console.log('📄 Тело запроса (объект, для отладки):', JSON.stringify(body, null, 2))
    
    // Специальное логирование для тарифа
    if (endpoint.includes('/tariff') || endpoint.includes('tariff')) {
      console.log('💰 КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ТАРИФА:')
      console.log('💰 Endpoint:', endpoint)
      console.log('💰 Полное тело запроса тарифа:', JSON.stringify(body, null, 2))
      console.log('💰 index-from:', body['index-from'] || body.indexFrom || 'ОТСУТСТВУЕТ!')
      console.log('💰 index-to:', body['index-to'] || body.indexTo || 'ОТСУТСТВУЕТ!')
      console.log('💰 mass:', body.mass || body.weight || 'ОТСУТСТВУЕТ!')
      console.log('💰 declared-value:', body['declared-value'] || body.declaredValue || 'ОТСУТСТВУЕТ!')
      console.log('💰 service:', body.service || 'ОТСУТСТВУЕТ!')
    }
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
            const errorPreview = errorText.substring(0, 1000)
            console.error(`❌ Ошибка API: ${response.status} ${response.statusText}`)
            console.error(`📄 Тело ошибки (первые 1000 символов):`, errorPreview)
            console.error(`📋 Заголовки ответа:`, Object.fromEntries(response.headers.entries()))
            
            // Специальная обработка ошибки 407 (неправильный endpoint или метод)
            if (response.status === 407) {
              const errorDetails = {
                status: response.status,
                statusText: response.statusText,
                endpoint: endpoint,
                method: method,
                errorBody: errorPreview,
                suggestion: 'Попробуйте другой endpoint или метод (GET/POST)'
              }
              console.error(`❌ Детали ошибки 407:`, JSON.stringify(errorDetails, null, 2))
              throw new Error(`Ошибка 407: Неправильный endpoint или метод API. Endpoint: ${method} ${endpoint}, Ответ: ${errorPreview.substring(0, 200)}`)
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
      
      // Специальное логирование для get_post_office
      if (endpoint.includes('/postoffice/1.0/objects') || endpoint.includes('get_post_office')) {
        console.log(`📦 Тело ответа API для get_post_office:`)
        console.log(`📦 Тип данных:`, typeof data, Array.isArray(data) ? '(массив)' : '(объект)')
        console.log(`📦 Полное тело ответа:`, JSON.stringify(data, null, 2))
        if (Array.isArray(data)) {
          console.log(`📦 Размер массива: ${data.length}`)
          data.forEach((item: any, index: number) => {
            console.log(`📦 Элемент ${index}:`, JSON.stringify(item, null, 2))
          })
        }
      }
      
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
        
        // Сначала обрабатываем то, что получили
        const officeIndices: string[] = []
        const postOfficesWithData: any[] = []
        
        rawOffices.slice(0, searchTop).forEach((office: any) => {
          // Если это объект с полными данными, используем их
          if (typeof office === 'object' && office !== null && (office.address || office.name)) {
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

            postOfficesWithData.push({
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
            })
          } else {
            // Если это просто индекс (строка), сохраняем для получения полных данных
            const index = typeof office === 'string' ? office : (office.index || office.postalCode || office.id)
            if (index && index.match(/^\d{6}$/)) {
              officeIndices.push(index)
            }
          }
        })
        
        // Получаем полные данные для отделений, для которых есть только индекс
        console.log(`🔍 Получаем полные данные для ${officeIndices.length} отделений по индексам:`, officeIndices)
        const fullOfficeDataPromises = officeIndices.map(async (index: string) => {
          try {
            console.log(`📮 Запрос данных для отделения ${index}...`)
            // ПРИОРИТЕТ: POST /postoffice/1.0/objects с массивом ID (как в get_post_office)
            let officeResponse: any = null
            try {
              // Вариант 1: POST /postoffice/1.0/objects с массивом (ПРИОРИТЕТНЫЙ!)
              console.log(`🚀 POST /postoffice/1.0/objects с телом [${index}]`)
              officeResponse = await makePostApiRequest(
                `/postoffice/1.0/objects`,
                token,
                userAuthKey,
                'POST',
                [index] // Массив с одним индексом
              )
              
              // Если ответ - массив, берем первый элемент
              if (Array.isArray(officeResponse) && officeResponse.length > 0) {
                officeResponse = officeResponse[0]
                console.log(`✅ Получен массив, используем первый элемент`)
              }
            } catch (error1: any) {
              console.warn(`⚠️ POST /postoffice/1.0/objects не сработал для ${index}, пробуем GET варианты`)
              try {
                officeResponse = await makePostApiRequest(
                  `/postoffice/1.0/object/${index}`,
                  token,
                  userAuthKey,
                  'GET'
                )
                console.log(`✅ Получен ответ для отделения ${index} через /postoffice/1.0/object/${index}`)
              } catch (error2: any) {
                try {
                  officeResponse = await makePostApiRequest(
                    `/postoffice/1.0/objects/${index}`,
                    token,
                    userAuthKey,
                    'GET'
                  )
                  console.log(`✅ Получен ответ для отделения ${index} через /postoffice/1.0/objects/${index}`)
                } catch (error3: any) {
                  try {
                    officeResponse = await makePostApiRequest(
                      `/postoffice/1.0/${index}`,
                      token,
                      userAuthKey,
                      'GET'
                    )
                    console.log(`✅ Получен ответ для отделения ${index} через /postoffice/1.0/${index}`)
                  } catch (error4: any) {
                    // Последняя попытка со старым endpoint
                    officeResponse = await makePostApiRequest(
                      `/1.0/office/${index}`,
                      token,
                      userAuthKey,
                      'GET'
                    )
                    console.log(`✅ Получен ответ для отделения ${index} через /1.0/office/${index}`)
                  }
                }
              }
            }
            
            console.log(`✅ Получен ответ для отделения ${index}:`, JSON.stringify(officeResponse, null, 2))
            
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
                                `Отделение Почты России ${officeResponse.index || index}` ||
                                'Отделение Почты России'

              const workingHours = officeResponse.workTime || 
                                 officeResponse.workingHours ||
                                 officeResponse.schedule ||
                                 'Не указано'

              return {
                id: officeResponse.index || index,
                index: officeResponse.index || index,
                postalCode: officeResponse.index || index,
                name: officeName,
                address: officeAddress,
                latitude: officeResponse.latitude || officeResponse.coordinates?.latitude || 0,
                longitude: officeResponse.longitude || officeResponse.coordinates?.longitude || 0,
                workingHours: workingHours,
                distance: null,
                type: type,
              }
            } else {
              console.warn(`⚠️ Пустой ответ для отделения ${index}`)
            }
          } catch (error: any) {
            console.error(`❌ Ошибка получения данных для отделения ${index}:`, {
              message: error.message,
              stack: error.stack?.substring(0, 200)
            })
            // Возвращаем базовый объект с индексом (но не заглушку адреса)
            return {
              id: index,
              index: index,
              postalCode: index,
              name: `Отделение ${index}`,
              address: '', // Пустой адрес вместо заглушки
              latitude: 0,
              longitude: 0,
              workingHours: '', // Пустые часы работы
              type: 'post_office'
            }
          }
          return null
        })
        
        // Ждем получения всех данных
        const fullOfficeData = await Promise.all(fullOfficeDataPromises)
        const validFullOffices = fullOfficeData.filter((office): office is any => office !== null)
        
        console.log(`✅ Получено ${validFullOffices.length} отделений с полными данными из ${officeIndices.length} запросов`)
        console.log(`📊 Всего отделений: ${postOfficesWithData.length} с данными + ${validFullOffices.length} полученных по индексам`)
        
        // Объединяем отделения с полными данными и те, что получили по индексам
        const postOffices = [...postOfficesWithData, ...validFullOffices]
        
        // Логируем результат для отладки
        console.log(`📦 Итоговый список отделений (${postOffices.length} шт.):`, 
          postOffices.map(o => ({
            id: o.id,
            name: o.name,
            address: o.address?.substring(0, 50) || 'нет адреса',
            hasAddress: !!o.address && !o.address.startsWith('Почтовый индекс:')
          }))
        )

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
        
        // КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ: Логируем входящие данные для диагностики
        console.log('🔍 ВХОДЯЩИЕ ДАННЫЕ calculate_delivery:')
        console.log('🔍 from объект:', JSON.stringify(from, null, 2))
        console.log('🔍 to объект:', JSON.stringify(to, null, 2))
        console.log('🔍 from.postalCode:', from.postalCode)
        console.log('🔍 to.postalCode:', to.postalCode)
        console.log('🔍 from.index:', (from as any).index)
        console.log('🔍 to.index:', (to as any).index)
        
        // Получаем индексы (должны быть строками)
        // Пробуем разные варианты полей для индекса отправителя
        const indexFrom = String(
          from.postalCode || 
          (from as any).index || 
          (from as any).postal_code ||
          '101000' // Fallback на Москву
        )
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Получаем индекс получателя из правильного объекта `to`
        // Пробуем разные варианты полей для индекса получателя
        const indexTo = String(
          to.postalCode || 
          (to as any).index || 
          (to as any).postal_code ||
          (to as any).postalCode || // Дополнительная проверка
          '101000' // Fallback на Москву (только если индекс не указан)
        )
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: Убеждаемся, что индексы разные
        console.log('🔍 ИЗВЛЕЧЕННЫЕ ИНДЕКСЫ:')
        console.log('🔍 indexFrom (отправитель):', indexFrom)
        console.log('🔍 indexTo (получатель):', indexTo)
        
        if (indexFrom === indexTo) {
          console.warn('⚠️ ВНИМАНИЕ: indexFrom и indexTo одинаковые! Это может быть ошибка.')
          console.warn('⚠️ Проверьте, что to.postalCode правильно передается с фронтенда.')
        }
        
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

        console.log('💰 КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ ТАРИФА (перед отправкой):')
        console.log('💰 Запрос расчета тарифа (объект):', JSON.stringify(tariffRequest, null, 2))
        console.log('💰 Запрос расчета тарифа (строка):', JSON.stringify(tariffRequest))
        console.log('💰 📊 Параметры расчета:', {
          'index-from': indexFrom,
          'index-to': indexTo,
          from: from,
          to: to,
          weight: weight,
          weightInGrams: weightInGrams,
          declaredValue: declaredValue,
          declaredValueInKopecks: declaredValueInKopecks,
          'indexFrom (проверка)': tariffRequest['index-from'],
          'indexTo (проверка)': tariffRequest['index-to'],
          'mass (проверка)': tariffRequest.mass,
          'declared-value (проверка)': tariffRequest['declared-value'],
          'service (проверка)': tariffRequest.service
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
        // ПРИОРИТЕТ: POST /postoffice/1.0/objects с массивом ID - самый надежный способ
        let officeResponse: any = null
        let lastError: any = null
        
        // Вариант 1: POST /postoffice/1.0/objects с массивом ID в теле (ПРИОРИТЕТНЫЙ!)
        try {
          console.log(`🚀 ПРИОРИТЕТ: POST /postoffice/1.0/objects с телом [${officeId}]`)
          const requestBody = [officeId] // Массив с одним индексом
          console.log(`📄 Тело запроса (JSON):`, JSON.stringify(requestBody))
          console.log(`📄 Тело запроса (объект):`, requestBody)
          
          // Выполняем запрос напрямую для детального логирования
          const postUrl = `${POST_API_BASE_URL}/postoffice/1.0/objects`
          console.log(`➡️ Отправка POST запроса к API: ${postUrl}`)
          console.log(`📋 Метод: POST`)
          console.log(`📋 Endpoint: /postoffice/1.0/objects`)
          console.log(`📋 Тело запроса:`, JSON.stringify(requestBody, null, 2))
          
          officeResponse = await makePostApiRequest(
            `/postoffice/1.0/objects`,
            token,
            userAuthKey,
            'POST',
            requestBody
          )
          
          console.log(`✅ Успешно получены данные через POST /postoffice/1.0/objects`)
          console.log(`📦 Тип ответа:`, typeof officeResponse, Array.isArray(officeResponse) ? '(массив)' : '(объект)')
          console.log(`📦 Полный ответ API (get_post_office):`, JSON.stringify(officeResponse, null, 2))
          
          // Дополнительное логирование для массива
          if (Array.isArray(officeResponse)) {
            console.log(`📊 Размер массива: ${officeResponse.length} элементов`)
            if (officeResponse.length > 0) {
              console.log(`📦 Первый элемент массива:`, JSON.stringify(officeResponse[0], null, 2))
            }
          }
          
          // Если ответ - массив, берем первый элемент
          if (Array.isArray(officeResponse)) {
            console.log(`📊 Получен массив из ${officeResponse.length} элементов`)
            if (officeResponse.length > 0) {
              officeResponse = officeResponse[0]
              console.log(`✅ Используем первый элемент массива`)
            } else {
              throw new Error('Массив ответа пуст')
            }
          } else {
            console.log(`📦 Ответ - объект, используем как есть`)
          }
        } catch (error1: any) {
          console.warn(`⚠️ Вариант 1 (POST /postoffice/1.0/objects) не сработал:`, {
            message: error1.message,
            status: error1.status,
            response: error1.response?.substring(0, 1000)
          })
          lastError = error1
          
          // Вариант 2: GET /postoffice/1.0/object/{id} (fallback)
          try {
            console.log(`🔍 Попытка 2 (GET): /postoffice/1.0/object/${officeId}`)
            officeResponse = await makePostApiRequest(
              `/postoffice/1.0/object/${officeId}`,
              token,
              userAuthKey,
              'GET'
            )
            console.log(`✅ Успешно получены данные через GET /postoffice/1.0/object/${officeId}`)
            console.log(`📦 Полный ответ API:`, JSON.stringify(officeResponse, null, 2))
          } catch (error2: any) {
            console.warn(`⚠️ Вариант 2 (GET) не сработал:`, {
              message: error2.message,
              status: error2.status,
              response: error2.response?.substring(0, 500)
            })
            lastError = error2
            
            // Вариант 3: GET /postoffice/1.0/objects/{id} (множественное число)
            try {
              console.log(`🔍 Попытка 3 (GET): /postoffice/1.0/objects/${officeId}`)
              officeResponse = await makePostApiRequest(
                `/postoffice/1.0/objects/${officeId}`,
                token,
                userAuthKey,
                'GET'
              )
              console.log(`✅ Успешно получены данные через GET /postoffice/1.0/objects/${officeId}`)
              console.log(`📦 Полный ответ API:`, JSON.stringify(officeResponse, null, 2))
            } catch (error3: any) {
              console.warn(`⚠️ Вариант 3 (GET) не сработал:`, {
                message: error3.message,
                status: error3.status,
                response: error3.response?.substring(0, 500)
              })
              lastError = error3
              
              // Вариант 4: POST /postoffice/1.0/object с телом {id: officeId}
              try {
                console.log(`🔍 Попытка 4 (POST): /postoffice/1.0/object с телом {id: ${officeId}}`)
                officeResponse = await makePostApiRequest(
                  `/postoffice/1.0/object`,
                  token,
                  userAuthKey,
                  'POST',
                  { id: officeId, index: officeId }
                )
                console.log(`✅ Успешно получены данные через POST /postoffice/1.0/object`)
                console.log(`📦 Полный ответ API:`, JSON.stringify(officeResponse, null, 2))
              } catch (error4: any) {
                console.warn(`⚠️ Вариант 4 (POST) не сработал:`, {
                  message: error4.message,
                  status: error4.status,
                  response: error4.response?.substring(0, 500)
                })
                lastError = error4
                
                // Вариант 5: GET /1.0/office/{index} (старый вариант, последний fallback)
                try {
                  console.log(`🔍 Попытка 5 (GET): /1.0/office/${officeId} (старый endpoint)`)
                  officeResponse = await makePostApiRequest(
                    `/1.0/office/${officeId}`,
                    token,
                    userAuthKey,
                    'GET'
                  )
                  console.log(`✅ Успешно получены данные через GET /1.0/office/${officeId}`)
                  console.log(`📦 Полный ответ API:`, JSON.stringify(officeResponse, null, 2))
                } catch (error5: any) {
                  console.error(`❌ Все варианты endpoint'ов не сработали. Последняя ошибка:`, {
                    message: error5.message,
                    status: error5.status,
                    response: error5.response?.substring(0, 1000),
                    stack: error5.stack?.substring(0, 500)
                  })
                  lastError = error5
                  throw error5
                }
              }
            }
          }
        }

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

