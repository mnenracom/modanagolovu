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
import { useState, useEffect } from 'react';
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

  // Загружаем категории для выпадающего меню
  useEffect(() => {
    if (isAdminRoute) return; // Не загружаем категории в админке
    
    const loadCategories = async () => {
      try {
        const data = await categoriesService.getActive();
        const transformed = data.map(transformCategoryFromSupabase);
        setCategories(transformed);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, [isAdminRoute]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
      toast.success('Выход выполнен');
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      toast.error('Ошибка при выходе');
    }
  };

  const navigation = [
    { name: 'Главная', href: '/' },
    { name: 'Каталог', href: '/catalog' },
    { name: 'Блог', href: '/blog' },
    { name: 'О нас', href: '/about' },
    { name: 'Контакты', href: '/contacts' },
  ];

  return (
    <>
    <header className={`sticky top-0 z-50 w-full border-b bg-card shadow-sm relative overflow-hidden ${
      activeTheme === 'newyear' ? 'new-year-shadow' : 
      activeTheme === 'spring' ? 'spring-shadow' : 
      ''
    }`}>
      {/* Праздничный акцент на header */}
      {activeTheme === 'newyear' && (
        <div className="absolute top-0 left-0 right-0 h-1 new-year-garland opacity-60" />
      )}
      {activeTheme === 'spring' && (
        <div className="absolute top-0 left-0 right-0 h-1 spring-garland opacity-60" />
      )}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <h1 className={`text-2xl font-bold ${
              activeTheme === 'newyear' ? 'new-year-gradient' : 
              activeTheme === 'spring' ? 'spring-gradient' : 
              'bg-gradient-primary bg-clip-text text-transparent'
            }`}>
              {activeTheme === 'newyear' && '🎄 МОДАНАГОЛОВУ ✨'}
              {activeTheme === 'spring' && '🌸 МОДАНАГОЛОВУ 🌸'}
              {activeTheme === 'none' && 'МОДАНАГОЛОВУ'}
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              // Для "Каталог" добавляем выпадающее меню категорий
              if (item.name === 'Каталог' && categories.length > 0) {
                return (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger asChild>
                      <button className="text-foreground hover:text-primary transition-smooth font-medium flex items-center gap-1">
                        {item.name}
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <Link to={item.href}>
                        <DropdownMenuItem>
                          <Package className="h-4 w-4 mr-2" />
                          Все товары
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      {categories.map((category) => (
                        <Link key={category.id} to={`/category/${category.slug}`}>
                          <DropdownMenuItem>
                            {category.name}
                          </DropdownMenuItem>
                        </Link>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-foreground hover:text-primary transition-smooth font-medium"
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            {/* Auth Buttons / User Menu */}
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-medium">
                      <User className="h-4 w-4 mr-2" />
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
              <div className="hidden md:flex items-center space-x-2">
                <Link to="/auth/login">
                  <Button variant="ghost" className="font-medium">
                    ВХОД
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button className="font-medium">
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

            {/* Mobile Navigation */}
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px]">
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
                        <Link to="/account?tab=wishlist">
                          <Button variant="ghost" className="w-full justify-start font-medium">
                            <Heart className="h-4 w-4 mr-2" />
                            Избранное {wishlistCount > 0 && `(${wishlistCount})`}
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start font-medium"
                          onClick={handleLogout}
                        >
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
          </div>
        </div>
      </div>
    </header>
    {/* Marketplace Stats - показываем на всех страницах кроме админки */}
    {!isAdminRoute && <MarketplaceStats />}
    </>
  );
};
