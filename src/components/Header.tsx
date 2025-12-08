import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, User, LogOut, ChevronDown, Package, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useUserAuth } from '@/hooks/useUserAuth';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { categoriesService } from '@/services/categoriesService';
import { transformCategoryFromSupabase } from '@/types/categorySupabase';
import { Category } from '@/types/categorySupabase';
import { useWishlist } from '@/hooks/useWishlist';
import MarketplaceStats from '@/components/MarketplaceStats';
import { useTheme } from '@/hooks/useTheme';

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Проверяем, не находимся ли мы в админке
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Используем useUserAuth (хуки должны вызываться всегда, но можем игнорировать результат в админке)
  const userAuth = useUserAuth();
  
  // Безопасно извлекаем значения с fallback
  // Если в админке, используем дефолтные значения
  const user = !isAdminRoute ? (userAuth.user || null) : null;
  const signOut = !isAdminRoute ? (userAuth.signOut || (async () => {})) : (async () => {});
  const isAuthenticated = !isAdminRoute ? (userAuth.isAuthenticated || false) : false;
  
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { wishlistCount } = useWishlist();
  const { activeTheme } = useTheme();

  // Загружаем категории для выпадающего меню с кешированием
  useEffect(() => {
    if (isAdminRoute) return; // Не загружаем категории в админке
    
    // Загружаем из кеша сразу для мгновенного отображения
    const loadCachedCategories = () => {
      try {
        const cached = localStorage.getItem('header_categories');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Проверяем, что кеш не старше 5 минут
          if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setCategories(parsed.categories || []);
            return true;
          }
        }
      } catch (error) {
        console.warn('Ошибка чтения категорий из кеша:', error);
      }
      return false;
    };

    // Пытаемся загрузить из кеша
    const hasCache = loadCachedCategories();
    
    const loadCategories = async () => {
      try {
        const data = await categoriesService.getActive();
        const transformed = data.map(transformCategoryFromSupabase);
        setCategories(transformed);
        // Кешируем категории
        try {
          localStorage.setItem('header_categories', JSON.stringify({
            categories: transformed,
            timestamp: Date.now(),
          }));
        } catch (error) {
          console.warn('Ошибка сохранения категорий в кеш:', error);
        }
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        // Если загрузка не удалась, но есть кеш - оставляем кеш
        if (!hasCache) {
          setCategories([]);
        }
      }
    };

    // Загружаем с небольшой задержкой, чтобы не блокировать рендеринг
    const timer = setTimeout(loadCategories, 0);
    return () => clearTimeout(timer);
  }, [isAdminRoute]);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      navigate('/');
      toast.success('Выход выполнен');
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      toast.error('Ошибка при выходе');
    }
  }, [signOut, navigate]);

  const navigation = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: 'Блог', href: '/blog' },
    { name: 'О нас', href: '/about' },
    { name: 'Контакты', href: '/contacts' },
  ];

  return (
    <>
    <header className={`sticky top-0 z-[65] w-full border-b bg-card shadow-sm relative overflow-hidden ${
      activeTheme === 'newyear' ? 'new-year-shadow' : 
      activeTheme === 'spring' ? 'spring-shadow' : 
      ''
    }`}>
      {/* Праздничный акцент на header - кастомная мишура, свисающая вниз с центра */}
      {activeTheme === 'newyear' && (
        <div 
          className="absolute top-0 left-0 right-0 h-20 sm:h-24 pointer-events-none z-10"
          style={{
            backgroundImage: 'url(/tinsel-header.png)',
            backgroundSize: 'auto 100%',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'center top',
            opacity: 0.9,
            // Маска для создания эффекта свисания вниз с центра
            maskImage: 'radial-gradient(ellipse 60% 100% at 50% 0%, black 40%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 100% at 50% 0%, black 40%, transparent 70%)',
          }}
        />
      )}
      {activeTheme === 'spring' && (
        <div className="absolute top-0 left-0 right-0 h-1 spring-garland opacity-60" />
      )}
      <div className="container mx-auto px-2 sm:px-3 py-2 sm:py-2">
        {/* Мобильная версия: всё в одну строку */}
        <div className="md:hidden flex items-center justify-between gap-2">
          {/* Мобильное меню слева */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[300px] z-[70]">
              <nav className="flex flex-col space-y-4 mt-8">
                {navigation.map((item) => (
                  <div key={item.name}>
                    <Link
                      to={item.href}
                      className="text-foreground hover:text-primary transition-smooth font-medium text-lg block"
                    >
                      {item.name}
                    </Link>
                    {/* Показываем категории под "Каталог" в мобильном меню */}
                    {item.name === 'Каталог' && categories.length > 0 && (
                      <div className="ml-4 mt-2 space-y-2">
                        <Link
                          to="/catalog"
                          className="text-muted-foreground hover:text-primary transition-smooth text-sm block"
                        >
                          Все товары
                        </Link>
                        {categories.map((category) => (
                          <Link
                            key={category.id}
                            to={`/category/${category.slug}`}
                            className="text-muted-foreground hover:text-primary transition-smooth text-sm block"
                          >
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-4 border-t space-y-2">
                  {isAuthenticated && user ? (
                    <>
                      <Link to="/account">
                        <Button variant="ghost" className="w-full justify-start font-medium">
                          <User className="h-4 w-4 mr-2" />
                          Личный кабинет
                        </Button>
                      </Link>
                      <Button variant="ghost" className="w-full justify-start font-medium text-destructive" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Выйти
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/auth/login">
                        <Button variant="ghost" className="w-full justify-start font-medium">
                          ВХОД
                        </Button>
                      </Link>
                      <Link to="/auth/register">
                        <Button className="w-full justify-start font-medium">
                          РЕГИСТРАЦИЯ
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Логотип по центру */}
          <Link to="/" className="flex items-center flex-1 justify-center">
            <img 
              src="/logo.png" 
              alt="МОДАНАГОЛОВУ" 
              className="h-12 sm:h-16 w-auto object-contain"
              onError={(e) => {
                // Fallback на SVG если PNG не найден
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </Link>
          
          {/* Иконки справа */}
          <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <Link to="/account?tab=wishlist">
                  <Button variant="ghost" size="icon" className="relative h-10 w-10">
                    <Heart className="h-6 w-6" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative h-10 w-10">
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Button>
              </Link>
          </div>
        </div>

        {/* Десктопная версия: всё в одну строку */}
        <div className="hidden md:flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center">
            <img 
              src="/logo.png" 
              alt="МОДАНАГОЛОВУ" 
              className="h-16 md:h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback на SVG если PNG не найден
                (e.target as HTMLImageElement).src = '/logo.svg';
              }}
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="flex items-center space-x-6">
            {navigation.map((item) => {
              // Для "Каталог" всегда показываем выпадающее меню (даже если категории еще загружаются)
              if (item.name === 'Каталог') {
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <button className="text-foreground hover:text-primary transition-smooth font-medium text-base flex items-center gap-1.5">
                        {item.name}
                        <ChevronDown className="h-5 w-5 flex-shrink-0" style={{ willChange: 'auto' }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <Link to={item.href}>
                        <DropdownMenuItem>
                          <Package className="h-4 w-4 mr-2" />
                          Все товары
                        </DropdownMenuItem>
                      </Link>
                      {categories.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          {categories.map((category) => (
                            <Link key={category.id} to={`/category/${category.slug}`}>
                              <DropdownMenuItem>
                                {category.name}
                              </DropdownMenuItem>
                            </Link>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-foreground hover:text-primary transition-smooth font-medium text-base"
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            {/* Auth Buttons / User Menu */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-medium text-base">
                      <User className="h-5 w-5 mr-2" />
                      {user.fullName || user.email?.split('@')[0] || 'Личный кабинет'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <User className="h-4 w-4 mr-2" />
                      Личный кабинет
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth/login">
                  <Button variant="ghost" className="font-medium text-base">
                    ВХОД
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="font-medium text-base">
                    РЕГИСТРАЦИЯ
                  </Button>
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <Link to="/account?tab=wishlist">
                <Button variant="ghost" size="icon" className="relative">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
    {/* Marketplace Stats - показываем на всех страницах кроме админки */}
    {!isAdminRoute && <MarketplaceStats />}
    </>
  );
};
