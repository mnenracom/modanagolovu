import { supabase } from '@/lib/supabase';
import { AnalyticsSettings, PageView, PageViewStats, AnalyticsFormData } from '@/types/analytics';

// Преобразование из Supabase формата
function transformAnalyticsSettingsFromSupabase(data: any): AnalyticsSettings {
  return {
    id: data.id,
    yandexMetrikaEnabled: data.yandex_metrika_enabled ?? false,
    yandexMetrikaCounterId: data.yandex_metrika_counter_id,
    yandexMetrikaToken: data.yandex_metrika_token,
    googleAnalyticsEnabled: data.google_analytics_enabled ?? false,
    googleAnalyticsTrackingId: data.google_analytics_tracking_id,
    googleAnalyticsMeasurementId: data.google_analytics_measurement_id,
    googleAnalyticsApiKey: data.google_analytics_api_key,
    googleAnalyticsViewId: data.google_analytics_view_id,
    settings: data.settings || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Преобразование в Supabase формат
function transformAnalyticsSettingsToSupabase(data: Partial<AnalyticsFormData>): any {
  const result: any = {};
  if ('yandexMetrikaEnabled' in data) result.yandex_metrika_enabled = data.yandexMetrikaEnabled;
  if ('yandexMetrikaCounterId' in data) result.yandex_metrika_counter_id = data.yandexMetrikaCounterId;
  if ('yandexMetrikaToken' in data) result.yandex_metrika_token = data.yandexMetrikaToken;
  if ('googleAnalyticsEnabled' in data) result.google_analytics_enabled = data.googleAnalyticsEnabled;
  if ('googleAnalyticsTrackingId' in data) result.google_analytics_tracking_id = data.googleAnalyticsTrackingId;
  if ('googleAnalyticsMeasurementId' in data) result.google_analytics_measurement_id = data.googleAnalyticsMeasurementId;
  if ('googleAnalyticsApiKey' in data) result.google_analytics_api_key = data.googleAnalyticsApiKey;
  if ('googleAnalyticsViewId' in data) result.google_analytics_view_id = data.googleAnalyticsViewId;
  return result;
}

export const analyticsService = {
  /**
   * Получить настройки аналитики
   */
  async getSettings(): Promise<AnalyticsSettings | null> {
    try {
      const { data, error } = await supabase
        .from('analytics_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Создаем запись по умолчанию
          return {
            id: 1,
            yandexMetrikaEnabled: false,
            googleAnalyticsEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        // Если таблица не существует, возвращаем null
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.log('Таблица analytics_settings не существует');
          return null;
        }
        // Игнорируем ошибки, связанные с отсутствием API key или правами доступа
        if (error.code === 'PGRST301' || error.message?.includes('API key') || error.message?.includes('apikey')) {
          console.log('Настройки аналитики недоступны (нет прав доступа или таблица не создана)');
          return null;
        }
        console.error('Ошибка получения настроек аналитики:', error);
        throw new Error(`Ошибка получения настроек аналитики: ${error.message}`);
      }

      return data ? transformAnalyticsSettingsFromSupabase(data) : null;
    } catch (error: any) {
      // Если таблица не существует или нет прав доступа, возвращаем null
      if (error?.code === '42P01' || 
          error?.code === 'PGRST301' ||
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') ||
          error?.message?.includes('API key') ||
          error?.message?.includes('apikey')) {
        return null;
      }
      // Для всех остальных ошибок просто возвращаем null, чтобы не ломать приложение
      console.warn('Ошибка получения настроек аналитики (игнорируем):', error?.message || error);
      return null;
    }
  },

  /**
   * Обновить настройки аналитики
   */
  async updateSettings(settings: Partial<AnalyticsFormData>): Promise<AnalyticsSettings> {
    try {
      const supabaseData = transformAnalyticsSettingsToSupabase(settings);

      const { data, error } = await supabase
        .from('analytics_settings')
        .upsert({ id: 1, ...supabaseData }, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        // Если таблица не существует
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          throw new Error('Таблица analytics_settings не существует. Выполните SQL скрипт create_analytics_settings_table.sql');
        }
        console.error('Ошибка обновления настроек аналитики:', error);
        throw new Error(`Ошибка обновления настроек аналитики: ${error.message}`);
      }

      return transformAnalyticsSettingsFromSupabase(data);
    } catch (error: any) {
      if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
        throw new Error('Таблица analytics_settings не существует. Выполните SQL скрипт create_analytics_settings_table.sql');
      }
      throw error;
    }
  },

  /**
   * Записать просмотр страницы
   */
  async trackPageView(pageView: Partial<PageView>): Promise<void> {
    const supabaseData: any = {
      page_path: pageView.pagePath,
      page_title: pageView.pageTitle,
      referrer: pageView.referrer,
      user_id: pageView.userId || null,
      session_id: pageView.sessionId,
      user_agent: pageView.userAgent,
      ip_address: pageView.ipAddress,
      device_type: pageView.deviceType,
      browser: pageView.browser,
      os: pageView.os,
      country: pageView.country,
      city: pageView.city,
      metadata: pageView.metadata || {},
    };

    const { error } = await supabase
      .from('page_views')
      .insert(supabaseData);

    if (error) {
      // Не бросаем ошибку, чтобы не ломать работу сайта
      console.error('Ошибка записи просмотра страницы:', error);
    }
  },

  /**
   * Получить статистику просмотров страниц
   */
  async getPageViewsStats(
    startDate?: string,
    endDate?: string
  ): Promise<PageViewStats[]> {
    try {
      const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const end = endDate || new Date().toISOString();

      const { data, error } = await supabase.rpc('get_page_views_stats', {
        start_date: start,
        end_date: end,
      });

      if (error) {
        // Если функция не существует или таблица не создана, возвращаем пустой массив
        if (error.code === '42883' || error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('function') || error.message?.includes('relation')) {
          console.log('Функция get_page_views_stats или таблица page_views не существует');
          return [];
        }
        console.error('Ошибка получения статистики просмотров:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        pagePath: item.page_path,
        pageTitle: item.page_title,
        viewsCount: parseInt(item.views_count) || 0,
        uniqueVisitors: parseInt(item.unique_visitors) || 0,
      }));
    } catch (error: any) {
      // Если функция не существует, возвращаем пустой массив
      if (error?.code === '42883' || error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('function') || error?.message?.includes('relation')) {
        return [];
      }
      console.error('Ошибка получения статистики просмотров:', error);
      return [];
    }
  },

  /**
   * Получить общую статистику просмотров
   */
  async getTotalStats(startDate?: string, endDate?: string): Promise<{
    totalViews: number;
    uniqueVisitors: number;
    topPages: PageViewStats[];
  }> {
    const stats = await this.getPageViewsStats(startDate, endDate);
    
    const totalViews = stats.reduce((sum, s) => sum + s.viewsCount, 0);
    const uniqueVisitors = stats.reduce((sum, s) => sum + s.uniqueVisitors, 0);
    
    return {
      totalViews,
      uniqueVisitors,
      topPages: stats.slice(0, 10),
    };
  },
};
