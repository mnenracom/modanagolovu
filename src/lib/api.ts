import axios from 'axios';

// Базовый URL API (замените на реальный URL вашего бэкенда)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Создаем экземпляр axios с базовой конфигурацией
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Неавторизован - перенаправляем на страницу логина
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints для админ-панели
export const adminAPI = {
  // Аутентификация
  login: (email: string, password: string) =>
    apiClient.post('/admin/auth/login', { email, password }),
  
  logout: () => apiClient.post('/admin/auth/logout'),
  
  // Восстановление пароля (для обычных пользователей)
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
  
  // Регистрация и авторизация пользователей
  userRegister: (data: any) =>
    apiClient.post('/auth/register', data),
  
  userLogin: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  // Товары
  getProducts: (params?: { page?: number; limit?: number; search?: string; category?: string }) =>
    apiClient.get('/admin/products', { params }),
  
  getProduct: (id: string) =>
    apiClient.get(`/admin/products/${id}`),
  
  createProduct: (data: FormData) =>
    apiClient.post('/admin/products', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  updateProduct: (id: string, data: FormData) =>
    apiClient.put(`/admin/products/${id}`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  deleteProduct: (id: string) =>
    apiClient.delete(`/admin/products/${id}`),
  
  // Импорт/экспорт
  exportProductsCSV: () =>
    apiClient.get('/admin/products/export/csv', { responseType: 'blob' }),
  
  importProductsCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/admin/products/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Категории
  getCategories: () =>
    apiClient.get('/admin/categories'),
  
  createCategory: (data: any) =>
    apiClient.post('/admin/categories', data),
  
  updateCategory: (id: string, data: any) =>
    apiClient.put(`/admin/categories/${id}`, data),
  
  deleteCategory: (id: string) =>
    apiClient.delete(`/admin/categories/${id}`),
  
  // Статистика
  getDashboardStats: () =>
    apiClient.get('/admin/dashboard/stats'),
  
  // Клиенты
  getClients: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/admin/clients', { params }),
  
  getClient: (id: string) =>
    apiClient.get(`/admin/clients/${id}`),
  
  getClientOrders: (id: string) =>
    apiClient.get(`/admin/clients/${id}/orders`),
  
  updateClientStatus: (id: string, status: string) =>
    apiClient.patch(`/admin/clients/${id}/status`, { status }),
  
  // История входов
  getLoginHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/auth/login-history', { params }),
  
  // Заказы
  getOrders: (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    date?: string;
    search?: string;
  }) =>
    apiClient.get('/admin/orders', { params }),
  
  getOrder: (id: string) =>
    apiClient.get(`/admin/orders/${id}`),
  
  updateOrderStatus: (id: string, status: string, comment?: string) =>
    apiClient.patch(`/admin/orders/${id}/status`, { status, comment }),
  
  updateOrder: (id: string, data: any) =>
    apiClient.put(`/admin/orders/${id}`, data),
  
  deleteOrder: (id: string) =>
    apiClient.delete(`/admin/orders/${id}`),
};

export default apiClient;

