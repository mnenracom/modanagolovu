import { supabase } from '@/lib/supabase';
import { defaultContentSettings } from '@/constants/contentDefaults';

export interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingsMap {
  [key: string]: string;
}

/**
 * Получить все настройки
 */
export const getAllSettings = async (): Promise<SettingsMap> => {
  // Всегда возвращаем Promise с валидными данными
  return new Promise((resolve) => {
    // Пытаемся загрузить настройки
    supabase
      .from('settings')
      .select('key, value')
      .order('key')
      .then(({ data, error }) => {
        if (error) {
          // Если таблица не существует или любая другая ошибка
          if (error.code === '42P01' || 
              error.message?.includes('does not exist') || 
              error.message?.includes('relation "settings" does not exist')) {
            console.warn('Таблица settings не существует. Используются значения по умолчанию.');
          } else {
            console.warn('Ошибка загрузки настроек (будет использован fallback):', error.code, error.message);
          }
          
          // Возвращаем значения по умолчанию
          resolve({
            'min_retail_order': '0',
            'min_wholesale_order': '5000',
            'active_theme': 'none',
            ...defaultContentSettings,
          });
          return;
        }

        // Если данные успешно загружены
        const settingsMap: SettingsMap = {};
        if (data && Array.isArray(data)) {
          data.forEach((setting) => {
            if (setting && setting.key && setting.value) {
              settingsMap[setting.key] = setting.value;
            }
          });
        }

        // Если настройки пустые, возвращаем значения по умолчанию
        if (Object.keys(settingsMap).length === 0) {
          resolve({
            'min_retail_order': '0',
            'min_wholesale_order': '5000',
            'active_theme': 'none',
            ...defaultContentSettings,
          });
          return;
        }
        
        // Убеждаемся, что active_theme есть в настройках
        if (!settingsMap['active_theme']) {
          settingsMap['active_theme'] = 'none';
        }

        resolve(settingsMap);
      })
      .catch((error: any) => {
        // В случае любой неожиданной ошибки возвращаем значения по умолчанию
        console.error('Unexpected error fetching settings:', error);
        resolve({
          'min_retail_order': '0',
          'min_wholesale_order': '5000',
          'active_theme': 'none',
          ...defaultContentSettings,
        });
      });
  });
};

/**
 * Получить значение настройки по ключу
 */
export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Настройка не найдена
        return null;
      }
      // Если таблица не существует, возвращаем null (будет использован defaultValue)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn(`Таблица settings не существует. Настройка ${key} не найдена.`);
        return null;
      }
      console.warn(`Ошибка загрузки настройки ${key}:`, error);
      return null;
    }

    return data?.value || null;
  } catch (error: any) {
    // Если таблица не существует или любая другая ошибка, возвращаем null
    console.warn(`Ошибка при получении настройки ${key}:`, error);
    return null;
  }
};

/**
 * Получить числовое значение настройки
 */
export const getSettingAsNumber = async (key: string, defaultValue: number = 0): Promise<number> => {
  try {
    const value = await getSetting(key);
    if (!value) return defaultValue;
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  } catch (error) {
    console.error(`Error fetching setting ${key} as number:`, error);
    return defaultValue;
  }
};

/**
 * Обновить значение настройки
 */
export const updateSetting = async (key: string, value: string, description?: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      // Если таблица не существует, просто логируем ошибку
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn(`Таблица settings не существует. Не удалось обновить настройку ${key}.`);
        throw new Error(`Таблица настроек не создана. Выполните SQL-скрипт create_settings_table.sql`);
      }
      console.error(`Ошибка обновления настройки ${key}:`, error);
      throw new Error(`Не удалось обновить настройку ${key}: ${error.message || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
};

/**
 * Обновить несколько настроек одновременно
 */
export const updateSettings = async (settings: { key: string; value: string; description?: string }[]): Promise<void> => {
  try {
    const updates = settings.map(({ key, value, description }) => ({
      key,
      value,
      description,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('settings')
      .upsert(updates, {
        onConflict: 'key',
      });

    if (error) {
      // Если таблица не существует, просто логируем ошибку
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Таблица settings не существует. Не удалось обновить настройки.');
        throw new Error('Таблица настроек не создана. Выполните SQL-скрипт create_settings_table.sql');
      }
      console.error('Ошибка обновления настроек:', error);
      throw new Error(`Не удалось обновить настройки: ${error.message || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

/**
 * Получить минимальные суммы заказов
 */
export const getOrderMinimums = async (): Promise<{ minRetailOrder: number; minWholesaleOrder: number }> => {
  try {
    const [minRetailOrder, minWholesaleOrder] = await Promise.all([
      getSettingAsNumber('min_retail_order', 0),
      getSettingAsNumber('min_wholesale_order', 5000),
    ]);

    return {
      minRetailOrder,
      minWholesaleOrder,
    };
  } catch (error) {
    console.error('Error fetching order minimums:', error);
    // Возвращаем значения по умолчанию при ошибке
    return {
      minRetailOrder: 0,
      minWholesaleOrder: 5000,
    };
  }
};

/**
 * Получить активную тему сайта
 */
export const getActiveTheme = async (): Promise<string> => {
  const theme = await getSetting('active_theme');
  return theme || 'none';
};

/**
 * Установить активную тему сайта
 */
export const setActiveTheme = async (themeId: string): Promise<void> => {
  await updateSetting(
    'active_theme',
    themeId,
    'Активная тема оформления сайта (none, newyear, spring)'
  );
};

/**
 * Сервис для работы с настройками
 */
export const settingsService = {
  getAllSettings,
  getSetting,
  getSettingAsNumber,
  updateSetting,
  updateSettings,
  getOrderMinimums,
  getActiveTheme,
  setActiveTheme,
};

