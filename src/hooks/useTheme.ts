import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { ThemeId, DEFAULT_THEME } from '@/types/themes';

const THEME_STORAGE_KEY = 'active_theme';

// Получить тему из localStorage
const getCachedTheme = (): ThemeId => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const cached = localStorage.getItem(THEME_STORAGE_KEY);
    if (cached && ['none', 'newyear', 'spring'].includes(cached)) {
      return cached as ThemeId;
    }
  } catch (error) {
    console.warn('Ошибка чтения темы из localStorage:', error);
  }
  return DEFAULT_THEME;
};

// Сохранить тему в localStorage
const setCachedTheme = (theme: ThemeId): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Ошибка сохранения темы в localStorage:', error);
  }
};

export const useTheme = () => {
  // Загружаем тему из кеша сразу, чтобы избежать мигания
  const [activeTheme, setActiveTheme] = useState<ThemeId>(getCachedTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        setLoading(true);
        const theme = await settingsService.getActiveTheme();
        const themeId = theme as ThemeId;
        setActiveTheme(themeId);
        // Кешируем тему для мгновенной загрузки при следующих переходах
        setCachedTheme(themeId);
      } catch (error) {
        console.error('Ошибка загрузки темы:', error);
        const cachedTheme = getCachedTheme();
        setActiveTheme(cachedTheme);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();

    // Слушаем изменения темы в других вкладках
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const newTheme = e.newValue as ThemeId;
        if (['none', 'newyear', 'spring'].includes(newTheme)) {
          setActiveTheme(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const changeTheme = async (themeId: ThemeId) => {
    try {
      await settingsService.setActiveTheme(themeId);
      setActiveTheme(themeId);
      // Кешируем новую тему сразу
      setCachedTheme(themeId);
      return true;
    } catch (error) {
      console.error('Ошибка изменения темы:', error);
      return false;
    }
  };

  return {
    activeTheme,
    loading,
    changeTheme,
  };
};

