import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  address?: string;
  telegram?: string;
  whatsapp?: string;
  role?: 'admin' | 'manager' | 'content' | 'user';
}

interface UseUserAuthReturn {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
}

export const useUserAuth = (): UseUserAuthReturn => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Загрузка профиля пользователя из таблицы users (упрощенная версия)
  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    // Сначала устанавливаем базовые данные из метаданных
    const metadata = authUser.user_metadata || {};
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      fullName: metadata.full_name || metadata.fullName || '',
      phone: metadata.phone || '',
      address: metadata.address || '',
      telegram: metadata.telegram || '',
      whatsapp: metadata.whatsapp || '',
      role: metadata.role || 'user',
    });

    // Затем пытаемся загрузить из таблицы users (асинхронно, не блокируя)
    setTimeout(async () => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!error && userData) {
          setUser({
            id: userData.id,
            email: userData.email || authUser.email || '',
            fullName: userData.full_name || metadata.full_name || metadata.fullName || '',
            phone: userData.phone || metadata.phone || '',
            address: userData.address || metadata.address || '',
            telegram: userData.telegram || metadata.telegram || '',
            whatsapp: userData.whatsapp || metadata.whatsapp || '',
            role: userData.role || metadata.role || 'user',
          });
        }
      } catch (err) {
        // Игнорируем ошибки загрузки из таблицы
        console.warn('Не удалось загрузить профиль из таблицы users:', err);
      }
    }, 100);
  }, []);

  // Инициализация - проверка текущей сессии
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    // Функция для безопасной установки loading в false
    const safelySetLoadingFalse = () => {
      if (mounted && timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (mounted) {
        setLoading(false);
      }
    };

    // Устанавливаем таймаут для гарантированного завершения загрузки
    timeoutId = setTimeout(() => {
      safelySetLoadingFalse();
    }, 3000); // Максимум 3 секунды на загрузку

    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setSupabaseUser(session.user);
        // Загружаем профиль синхронно (базовые данные из метаданных)
        loadUserProfile(session.user);
        safelySetLoadingFalse();
      } else {
        safelySetLoadingFalse();
      }
    }).catch((err) => {
      console.error('Ошибка получения сессии:', err);
      if (mounted) {
        safelySetLoadingFalse();
      }
    });

    // Слушаем изменения аутентификации (только для обновлений, не для начальной загрузки)
    let isInitialLoad = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return; // Пропускаем первое событие, так как getSession уже обработал его
      }
      
      if (!mounted) return;
      
      try {
        if (session?.user) {
          setSupabaseUser(session.user);
          loadUserProfile(session.user);
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Ошибка в onAuthStateChange:', err);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []); // Пустой массив зависимостей - хук должен запускаться только один раз

  // Вход в систему
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setSupabaseUser(data.user);
        await loadUserProfile(data.user);
      }
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      throw new Error(error.message || 'Ошибка при входе. Проверьте данные.');
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      setSupabaseUser(null);
      setUser(null);
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      throw new Error(error.message || 'Ошибка при выходе из системы.');
    } finally {
      setLoading(false);
    }
  };

  // Обновление профиля
  const updateProfile = async (data: Partial<UserProfile>): Promise<void> => {
    if (!supabaseUser) {
      throw new Error('Пользователь не авторизован');
    }

    try {
      // Обновляем метаданные в auth.users
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          telegram: data.telegram,
          whatsapp: data.whatsapp,
        },
      });

      if (authError) {
        throw authError;
      }

      // Обновляем запись в таблице users (если есть)
      try {
        const { error: userError } = await supabase
          .from('users')
          .update({
            full_name: data.fullName,
            phone: data.phone,
            address: data.address,
            telegram: data.telegram,
            whatsapp: data.whatsapp,
          })
          .eq('id', supabaseUser.id);

        if (userError && !userError.message.includes('does not exist')) {
          console.warn('Ошибка обновления записи в users:', userError);
        }
      } catch (dbError) {
        // Игнорируем, если таблицы нет
        console.warn('Не удалось обновить запись в users:', dbError);
      }

      // Перезагружаем профиль
      await loadUserProfile(supabaseUser);
    } catch (error: any) {
      console.error('Ошибка обновления профиля:', error);
      throw new Error(error.message || 'Не удалось обновить профиль.');
    }
  };

  // Смена пароля
  const changePassword = async (newPassword: string): Promise<void> => {
    if (!supabaseUser) {
      throw new Error('Пользователь не авторизован');
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Ошибка смены пароля:', error);
      throw new Error(error.message || 'Не удалось изменить пароль.');
    }
  };

  return {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
    updateProfile,
    changePassword,
    isAuthenticated: !!user && !!supabaseUser,
  };
};

