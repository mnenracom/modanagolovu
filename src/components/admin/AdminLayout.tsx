import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { auditLogger } from '@/lib/auditLogger';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  History,
  Image,
  FileText,
  BookOpen,
  FolderOpen,
  BarChart3,
  TrendingUp,
  TestTube,
  Store,
  DollarSign,
  MessageSquare,
  Send,
  Truck,
  CreditCard,
} from 'lucide-react';

const AdminLayout = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const userEmail = user?.email || '';
      await signOut();
      // Логируем выход
      auditLogger.logLogout(userEmail).catch(err => 
        console.error('Ошибка логирования выхода:', err)
      );
      navigate('/admin/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      // В любом случае перенаправляем на страницу входа
      navigate('/admin/login');
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Дашборд', path: '/admin', roles: ['admin', 'manager', 'content'] },
    { icon: Package, label: 'Товары', path: '/admin/products', roles: ['admin', 'manager', 'content'] },
    { icon: FolderTree, label: 'Категории', path: '/admin/categories', roles: ['admin', 'manager', 'content'] },
    { icon: Image, label: 'Баннеры', path: '/admin/banners', roles: ['admin', 'manager', 'content'] },
    { icon: BookOpen, label: 'Статьи блога', path: '/admin/articles', roles: ['admin', 'manager', 'content'] },
    { icon: FolderOpen, label: 'Медиа-библиотека', path: '/admin/media', roles: ['admin', 'manager', 'content'] },
    { icon: ShoppingCart, label: 'Заказы', path: '/admin/orders', roles: ['admin', 'manager'] },
    { icon: Users, label: 'Клиенты', path: '/admin/clients', roles: ['admin', 'manager'] },
    { icon: BarChart3, label: 'Аналитика', path: '/admin/analytics', roles: ['admin', 'manager'] },
    { icon: TrendingUp, label: 'Отчёты', path: '/admin/analytics/reports', roles: ['admin', 'manager'] },
    { icon: TestTube, label: 'A/B тесты', path: '/admin/analytics/ab-testing', roles: ['admin'] },
    { icon: Store, label: 'Дашборд МП', path: '/admin/marketplace/dashboard', roles: ['admin', 'manager'] },
    { icon: Settings, label: 'Настройки МП', path: '/admin/marketplace', roles: ['admin', 'manager'] },
    { icon: DollarSign, label: 'Управление ценами', path: '/admin/marketplace/prices', roles: ['admin', 'manager'] },
    { icon: MessageSquare, label: 'Модерация отзывов', path: '/admin/reviews', roles: ['admin', 'manager', 'content'] },
    { icon: Send, label: 'Telegram уведомления', path: '/admin/telegram', roles: ['admin'] },
    { icon: Truck, label: 'Службы доставки', path: '/admin/delivery', roles: ['admin'] },
    { icon: CreditCard, label: 'Платежные системы', path: '/admin/payments', roles: ['admin'] },
    { icon: BarChart3, label: 'Аналитика', path: '/admin/analytics/settings', roles: ['admin'] },
    { icon: History, label: 'История входов', path: '/admin/login-history', roles: ['admin'] },
    { icon: FileText, label: 'Логи действий', path: '/admin/audit-logs', roles: ['admin', 'manager'] },
    { icon: Settings, label: 'Настройки', path: '/admin/settings', roles: ['admin'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50
            w-56 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
            lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <nav className="h-full px-3 py-4 overflow-y-auto">
            <ul className="space-y-1">
              {menuItems
                .filter((item) => !item.roles || item.roles.includes(user?.role || ''))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                          location.pathname === item.path
                            ? 'bg-primary text-primary-foreground'
                            : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </nav>
        </aside>

        {/* Overlay для мобильных устройств */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

