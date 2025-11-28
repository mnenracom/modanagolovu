import { useState, useEffect } from 'react';
import { settingsService, SettingsMap } from '@/services/settingsService';
import { defaultContentSettings } from '@/constants/contentDefaults';

interface UseSettingsReturn {
  settings: SettingsMap;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getSetting: (key: string, defaultValue?: string) => string;
  getSettingAsNumber: (key: string, defaultValue?: number) => number;
  getWholesaleGradations: () => Array<{ amount: number; percent: number }>;
}

/**
 * Хук для работы с настройками
 */
export const useSettings = (): UseSettingsReturn => {
  // Инициализируем с значениями по умолчанию, чтобы компоненты могли работать сразу
  const initialSettings: SettingsMap = {
    'min_retail_order': '0',
    'min_wholesale_order': '5000',
    ...defaultContentSettings,
  };

  const [settings, setSettings] = useState<SettingsMap>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Пытаемся загрузить настройки, но не падаем при ошибке
      try {
        const data = await settingsService.getAllSettings();
        // Проверяем, что данные валидны
        if (data && typeof data === 'object') {
          setSettings(data);
        } else {
          throw new Error('Invalid settings data');
        }
      } catch (loadError: any) {
        // Логируем ошибку, но продолжаем работу с дефолтными значениями
        console.warn('Settings load error (using defaults):', loadError?.message || loadError);
        setError(loadError instanceof Error ? loadError : new Error('Не удалось загрузить настройки'));
        // Используем дефолтные значения - они уже установлены в useState
      }
    } catch (err: any) {
      // Финальная защита - на случай если что-то пошло не так
      console.warn('Unexpected error in loadSettings:', err);
      setError(err instanceof Error ? err : new Error('Неожиданная ошибка'));
      // Значения по умолчанию уже установлены в useState, ничего не делаем
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Загружаем настройки асинхронно, не блокируя рендер
    loadSettings().catch((err) => {
      // Дополнительная защита от ошибок
      console.warn('Failed to load settings in useEffect:', err);
      setSettings(initialSettings);
      setLoading(false);
    });
  }, []);

  const getSetting = (key: string, defaultValue: string = ''): string => {
    return settings[key] || defaultValue;
  };

  const getSettingAsNumber = (key: string, defaultValue: number = 0): number => {
    const value = settings[key];
    if (!value) return defaultValue;
    const numValue = parseFloat(value);
    return isNaN(numValue) ? defaultValue : numValue;
  };

  const getWholesaleGradations = (): Array<{ amount: number; percent: number }> => {
    const gradationsStr = settings['wholesale_gradations'];
    if (!gradationsStr) return [];
    try {
      return JSON.parse(gradationsStr);
    } catch (e) {
      console.error('Ошибка парсинга градаций оптовых цен:', e);
      return [];
    }
  };

  return {
    settings,
    loading,
    error,
    refresh: loadSettings,
    getSetting,
    getSettingAsNumber,
    getWholesaleGradations,
  };
};

