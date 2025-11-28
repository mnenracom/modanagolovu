// Supabase Edge Function для проксирования запросов к API WildBerries
// Документация: https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Получаем тело запроса
    let requestBody;
    try {
      // Для OPTIONS запросов тело может быть пустым
      if (req.method !== 'OPTIONS') {
        requestBody = await req.json()
      } else {
        requestBody = {}
      }
    } catch (e) {
      // Если не удалось распарсить JSON, пробуем как пустой объект
      console.warn('Warning parsing request body:', e)
      requestBody = {}
    }

    const { endpoint, params, apiKey, baseUrl: customBaseUrl, method, body } = requestBody || {}
    
    console.log('Request received:', { endpoint, method: method || 'GET', params: params ? Object.keys(params) : [], hasApiKey: !!apiKey, customBaseUrl, hasBody: !!body })

    if (!endpoint || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: endpoint, apiKey' }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Формируем URL для запроса к WB API
    // Если передан customBaseUrl (например, для Content API), используем его
    // Иначе используем Statistics API по умолчанию
    const baseUrl = customBaseUrl || 'https://statistics-api.wildberries.ru'
    const url = `${baseUrl}${endpoint}`
    
    // Определяем метод запроса
    const requestMethod = method || 'GET'
    
    // Для GET запросов формируем query параметры, для POST используем body
    let fullUrl = url
    let wbRequestBody = null
    
    if (requestMethod === 'GET') {
      const queryParams = new URLSearchParams(params || {})
      fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url
    } else if (requestMethod === 'POST') {
      // Для POST используем body из запроса
      wbRequestBody = body || params || {}
    }

    // Формируем заголовок авторизации
    // Если токен уже содержит Bearer, используем как есть, иначе добавляем
    const authHeader = apiKey.startsWith('Bearer ') 
      ? apiKey 
      : (apiKey.startsWith('eyJ') ? `Bearer ${apiKey}` : apiKey)

    console.log('Making request to WB API:', { fullUrl, method: requestMethod, hasAuth: !!authHeader, hasBody: !!wbRequestBody })

    // Выполняем запрос к WB API
    let response;
    try {
      const fetchOptions: RequestInit = {
        method: requestMethod,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
      
      // Для POST запросов добавляем body
      if (requestMethod === 'POST' && wbRequestBody) {
        fetchOptions.body = JSON.stringify(wbRequestBody)
      }
      
      response = await fetch(fullUrl, fetchOptions)
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError)
      console.error('Fetch error name:', fetchError?.name)
      console.error('Fetch error message:', fetchError?.message)
      
      // Обработка DNS ошибок
      if (fetchError?.message?.includes('dns error') || fetchError?.message?.includes('failed to lookup')) {
        console.error('DNS resolution error - возможно, проблема с сетью или доменом')
        return new Response(
          JSON.stringify({ 
            error: 'DNS resolution failed',
            errorType: 'DNS_ERROR',
            details: `Не удалось разрешить домен для ${fullUrl}. Возможно, проблема с сетью Edge Function или домен недоступен.`,
            originalError: fetchError?.message
          }),
          { 
            status: 500, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch from WB API', 
          errorType: 'FETCH_ERROR',
          details: fetchError?.message || 'Unknown fetch error',
          originalError: fetchError?.name || 'Unknown'
        }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    console.log('WB API response status:', response.status, response.statusText)

    // Получаем данные
    const data = await response.text()
    console.log('WB API response data length:', data.length)
    console.log('WB API response data preview:', data.substring(0, 500))
    
    // Парсим JSON, если возможно
    let jsonData;
    try {
      jsonData = JSON.parse(data)
    } catch {
      jsonData = data
    }

    // Возвращаем ответ
    if (!response.ok) {
      // Для ошибок возвращаем 200, но с информацией об ошибке в теле
      // Это нужно, чтобы Supabase не считал это ошибкой Edge Function
      const errorInfo = {
        error: true,
        wbApiStatus: response.status,
        wbApiStatusText: response.statusText,
        wbApiError: typeof jsonData === 'string' ? jsonData : (jsonData?.detail || jsonData?.title || jsonData?.message || JSON.stringify(jsonData)),
        fullResponse: data.length < 1000 ? data : data.substring(0, 1000) + '...',
      }
      
      console.error('WB API error:', errorInfo)
      
      return new Response(
        JSON.stringify(errorInfo),
        { 
          status: 200, // Возвращаем 200, чтобы Supabase не считал это ошибкой
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    return new Response(
      JSON.stringify(jsonData),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )

  } catch (error) {
    console.error('Error in wildberries-proxy:', error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Internal server error',
        errorName: error?.name || 'Unknown',
        details: error?.stack || 'No stack trace available'
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})

