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
  apiKey: string,
  apiToken: string | null,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<any> {
  const url = `${POST_API_BASE_URL}${endpoint}`
  
  console.log(`Запрос к API Почты России: ${method} ${url}`)
  
  // Для API Почты России используется Authorization-Key и AccessToken
  // Согласно документации: https://otpravka.pochta.ru/help
  const headers: Record<string, string> = {
    'Authorization': `AccessToken ${apiToken || apiKey}`,
    'Authorization-Key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive',
  }
  
  console.log('Заголовки запроса:', {
    hasAuthKey: !!apiKey,
    hasToken: !!(apiToken || apiKey),
    endpoint: endpoint,
    method: method
  })

  const options: RequestInit = {
    method,
    headers,
  }

  if (body && method === 'POST') {
    options.body = JSON.stringify(body)
    console.log('Тело запроса:', JSON.stringify(body).substring(0, 200))
  }

  try {
    // В Deno fetch может иметь проблемы с SSL, но обычно работает
    // Если есть проблемы, они проявятся как сетевые ошибки
    const response = await fetch(url, options)
    
    console.log(`Ответ API: ${response.status} ${response.statusText}`)
    console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Ошибка API: ${response.status}`, errorText.substring(0, 500))
      
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
      console.log('Успешный ответ от API, размер данных:', JSON.stringify(data).length)
      return data
    } else {
      const text = await response.text()
      console.log('Ответ не JSON:', text.substring(0, 200))
      throw new Error('API вернул не JSON ответ')
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
    const { action, apiKey, apiToken, address, from, to, weight, declaredValue, officeId } = await req.json()

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API ключ (Authorization-Key) не предоставлен' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // API Token может быть опциональным - если не передан, получим через OAuth
    const token = apiToken || null

    // Поиск точек выдачи
    if (action === 'search_post_offices') {
      if (!address || !address.city) {
        return new Response(
          JSON.stringify({ error: 'Не указан адрес для поиска' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      try {
        // Поиск отделений по городу через API Почты России
        // Актуальный эндпоинт: POST /postoffice/1.0/
        const cityName = address.city.trim()
        
        // Формат запроса согласно документации API Почты России
        const searchRequest = {
          city: cityName,
          region: address.region || '',
          postalCode: address.postalCode || '',
          top: 50, // Максимальное количество результатов
          filter: 'ALL' // Все типы: отделения, постаматы, терминалы
        }
        
        console.log('Запрос поиска отделений:', JSON.stringify(searchRequest))
        
        // Пробуем найти отделения через актуальный API endpoint
        const officesResponse = await makePostApiRequest(
          '/postoffice/1.0/',
          apiKey,
          token,
          'POST',
          searchRequest
        )

        // Преобразуем ответ API в наш формат
        let postOffices: any[] = []
        
        if (Array.isArray(officesResponse)) {
          // Фильтруем по городу, если API вернул все отделения
          postOffices = officesResponse
            .filter((office: any) => {
              // Проверяем, что отделение находится в нужном городе
              const officeCity = office?.address?.city || office?.city || ''
              const officeRegion = office?.address?.region || office?.region || ''
              
              // Сравниваем название города (без учета регистра)
              const matchesCity = officeCity.toLowerCase().includes(cityName.toLowerCase()) ||
                                 cityName.toLowerCase().includes(officeCity.toLowerCase())
              
              // Если указан регион, проверяем и его
              if (address.region) {
                const matchesRegion = officeRegion.toLowerCase().includes(address.region.toLowerCase()) ||
                                    address.region.toLowerCase().includes(officeRegion.toLowerCase())
                return matchesCity && matchesRegion
              }
              
              return matchesCity
            })
            .slice(0, 20) // Ограничиваем до 20 результатов
            .map((office: any) => {
              // Определяем тип точки выдачи
              let type = 'post_office'
              if (office.type === 'POSTAMAT' || office.type === 'постамат') {
                type = 'postamat'
              } else if (office.type === 'TERMINAL' || office.type === 'терминал') {
                type = 'terminal'
              }

              // Формируем адрес
              const officeAddress = office.address?.source || 
                                  office.address?.addressString ||
                                  `${office.address?.city || ''}, ${office.address?.street || ''}, ${office.address?.house || ''}`.trim() ||
                                  office.address ||
                                  'Адрес не указан'

              // Формируем название
              const officeName = office.name || 
                                office.description ||
                                `Отделение Почты России ${office.index || office.postalCode || ''}` ||
                                'Отделение Почты России'

              // Рабочие часы
              const workingHours = office.workTime || 
                                 office.workingHours ||
                                 office.schedule ||
                                 'Не указано'

              return {
                id: office.index || office.postalCode || office.id || `${office.latitude}_${office.longitude}`,
                name: officeName,
                address: officeAddress,
                latitude: office.latitude || office.coordinates?.latitude || 0,
                longitude: office.longitude || office.coordinates?.longitude || 0,
                workingHours: workingHours,
                distance: office.distance || null,
                type: type,
              }
            })
        }

        // Если не нашли отделения через API, возвращаем пустой список
        // НЕ возвращаем тестовые данные - это мешает отладке
        if (postOffices.length === 0) {
          console.warn('API Почты России не вернул отделений для города:', cityName)
          // Возвращаем пустой список, чтобы пользователь понял, что нужно проверить настройки
          return new Response(
            JSON.stringify({ 
              postOffices: [],
              error: 'Отделения не найдены. Проверьте правильность названия города и настройки API ключа.',
              debug: {
                city: cityName,
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
        // Актуальный эндпоинт: POST /tariff/1.0/calculate
        const tariffRequest = {
          object: 6430, // Код объекта отправления (6430 - посылка)
          from: from.postalCode || '101000', // Почтовый индекс отправителя
          to: to.postalCode || '101000', // Почтовый индекс получателя
          weight: Math.max(1, Math.ceil(weight)), // Вес в граммах (минимум 1)
          declaredValue: declaredValue || 0, // Объявленная стоимость в копейках
          mailType: 'POSTAL_PARCEL', // Тип отправления: POSTAL_PARCEL (посылка)
          mailCategory: 'ORDINARY', // Категория: ORDINARY (обычная), REGISTERED (с объявленной ценностью)
          payment: declaredValue ? declaredValue : 0, // Сумма наложенного платежа
        }

        console.log('Запрос расчета тарифа:', JSON.stringify(tariffRequest))

        const tariffResponse = await makePostApiRequest(
          '/tariff/1.0/calculate',
          apiKey,
          token,
          'POST',
          tariffRequest
        )

        // Извлекаем стоимость из ответа
        let cost = 0
        let deliveryTime = '5-7'
        let type = 'standard'
        let description = 'Стандартная доставка Почтой России'

        if (tariffResponse) {
          // Стоимость может быть в разных полях в зависимости от версии API
          cost = tariffResponse.total || 
                 tariffResponse.totalRate || 
                 tariffResponse.totalVat || 
                 tariffResponse.deliveryCost ||
                 tariffResponse.cost ||
                 0

          // Срок доставки
          if (tariffResponse.deliveryTime) {
            deliveryTime = `${tariffResponse.deliveryTime.min || 5}-${tariffResponse.deliveryTime.max || 7}`
          } else if (tariffResponse.days) {
            deliveryTime = `${tariffResponse.days.min || 5}-${tariffResponse.days.max || 7}`
          }

          // Тип доставки
          if (tariffResponse.mailType === 'EMS') {
            type = 'express'
          } else if (tariffResponse.mailType === 'FIRST_CLASS') {
            type = 'first_class'
          }

          description = tariffResponse.description || description
        }

        // Если API не вернул стоимость, возвращаем ошибку (не используем fallback)
        if (cost === 0 || cost === null || cost === undefined) {
          throw new Error('API Почты России не вернул стоимость доставки. Проверьте параметры запроса и настройки API.')
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
        // Актуальный эндпоинт: GET /postoffice/1.0/{index}
        const officeResponse = await makePostApiRequest(
          `/postoffice/1.0/${officeId}`,
          apiKey,
          token,
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

