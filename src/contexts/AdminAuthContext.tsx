import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'content' | 'user';
  fullName?: string;
}

interface AdminAuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем сохраненный токен при загрузке
    const savedToken = localStorage.getItem('admin_token');
    const savedUser = localStorage.getItem('admin_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // TODO: Заменить на реальный API запрос
      // const response = await axios.post('/api/admin/login', { email, password });
      
      // TODO: Заменить на реальный API запрос
      // const response = await apiClient.post('/admin/auth/login', { email, password });
      // const { token, user } = response.data;
      
      // Временная моковая реализация с разными ролями
      let mockUser;
      if (email === 'admin@example.com' && password === 'admin123') {
        mockUser = {
          id: '1',
          email: 'admin@example.com',
          name: 'Администратор',
          role: 'admin' as const,
          fullName: 'Администратор Системы',
        };
      } else if (email === 'manager@example.com' && password === 'manager123') {
        mockUser = {
          id: '2',
          email: 'manager@example.com',
          name: 'Менеджер',
          role: 'manager' as const,
          fullName: 'Менеджер Отдела',
        };
      } else if (email === 'content@example.com' && password === 'content123') {
        mockUser = {
          id: '3',
          email: 'content@example.com',
          name: 'Контент-менеджер',
          role: 'content' as const,
          fullName: 'Контент Менеджер',
        };
      } else {
        throw new Error('Неверный email или пароль');
      }
      
      // Генерация JWT-подобного токена
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ userId: mockUser.id, role: mockUser.role, exp: Date.now() + 86400000 }))}.mock_signature`;
      
      setUser(mockUser);
      setToken(mockToken);
      localStorage.setItem('admin_token', mockToken);
      localStorage.setItem('admin_user', JSON.stringify(mockUser));
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    loading
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

