import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';
import { ThemeId, DEFAULT_THEME } from '@/types/themes';

export const useTheme = () => {
  const [activeTheme, setActiveTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        setLoading(true);
        const theme = await settingsService.getActiveTheme();
        setActiveTheme(theme as ThemeId);
      } catch (error) {
        console.error('Ошибка загрузки темы:', error);
        setActiveTheme(DEFAULT_THEME);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, []);

  const changeTheme = async (themeId: ThemeId) => {
    try {
      await settingsService.setActiveTheme(themeId);
      setActiveTheme(themeId);
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

