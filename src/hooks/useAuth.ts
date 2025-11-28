import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'manager' | 'content' | 'user';
  fullName?: string;
}

interface UseAuthReturn {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Инициализация - проверка текущей сессии
  useEffect(() => {
    let mounted = true;

    // Проверяем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setSupabaseUser(session.user);
        // Преобразуем Supabase user в наш формат
        setUser(transformUser(session.user));
      }
      setLoading(false);
    });

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setSupabaseUser(session.user);
        setUser(transformUser(session.user));
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Преобразование Supabase user в наш формат
  const transformUser = (supabaseUser: SupabaseUser): User => {
    // Получаем метаданные пользователя (role и другие данные могут быть в user_metadata)
    const metadata = supabaseUser.user_metadata || {};
    const appMetadata = supabaseUser.app_metadata || {};
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: metadata.name || metadata.full_name || supabaseUser.email?.split('@')[0] || '',
      fullName: metadata.full_name || metadata.name || supabaseUser.email || '',
      // Роль можно получить из user_metadata или app_metadata
      // Если роль не установлена, используем 'user' по умолчанию
      // Админ-панель должна проверять роль отдельно через ProtectedRoute
      role: (metadata.role || appMetadata.role || 'user') as 'admin' | 'manager' | 'content' | 'user',
    };
  };

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
        setUser(transformUser(data.user));
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

  return {
    user,
    supabaseUser,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user && !!supabaseUser,
  };
};

