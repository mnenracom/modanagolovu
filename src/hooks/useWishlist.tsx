import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUserAuth } from './useUserAuth';
import { wishlistService } from '@/services/wishlistService';
import { Product } from '@/types/product';
import { toast } from 'sonner';

interface WishlistContextType {
  wishlist: Product[];
  wishlistCount: number;
  loading: boolean;
  isInWishlist: (productId: number | string) => boolean;
  addToWishlist: (product: Product) => Promise<boolean>;
  removeFromWishlist: (productId: number | string) => Promise<boolean>;
  toggleWishlist: (product: Product) => Promise<boolean>;
  checkIsInWishlist: (productId: number | string) => Promise<boolean>;
  loadWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useUserAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInWishlistMap, setIsInWishlistMap] = useState<Record<number, boolean>>({});
  
  // Счетчик вычисляется на основе длины массива wishlist для мгновенного обновления
  const wishlistCount = wishlist.length;

  /**
   * Загрузить все товары из избранного
   */
  const loadWishlist = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const products = await wishlistService.getAll(user.id);
      setWishlist(products);
      
      // Создаем карту для быстрой проверки
      const map: Record<number, boolean> = {};
      products.forEach(product => {
        const productId = parseInt(product.id);
        if (!isNaN(productId)) {
          map[productId] = true;
        }
      });
      setIsInWishlistMap(map);
      
      console.log('Загружено товаров в избранное:', products.length);
    } catch (error: any) {
      console.error('Ошибка загрузки избранного:', error);
      toast.error('Не удалось загрузить избранное');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Загружаем избранное при изменении пользователя
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadWishlist();
    } else {
      setWishlist([]);
      setIsInWishlistMap({});
    }
  }, [isAuthenticated, user?.id, loadWishlist]);

  /**
   * Проверить, есть ли товар в избранном
   */
  const checkIsInWishlist = useCallback(async (productId: number | string): Promise<boolean> => {
    if (!user?.id) return false;

    const id = typeof productId === 'string' ? parseInt(productId) : productId;
    if (isNaN(id)) {
      return false;
    }

    // Сначала проверяем локальную карту
    if (isInWishlistMap[id] !== undefined) {
      return isInWishlistMap[id];
    }

    // Если нет в карте, проверяем на сервере
    try {
      const isInWishlist = await wishlistService.isInWishlist(user.id, id);
      setIsInWishlistMap(prev => ({
        ...prev,
        [id]: isInWishlist,
      }));
      return isInWishlist;
    } catch (error) {
      console.error('Ошибка проверки избранного:', error);
      return false;
    }
  }, [user?.id, isInWishlistMap]);

  /**
   * Добавить товар в избранное
   */
  const addToWishlist = useCallback(async (product: Product) => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Войдите в аккаунт, чтобы добавить товар в избранное');
      return false;
    }

    const productId = parseInt(product.id);
    if (isNaN(productId)) {
      console.error('Неверный ID товара:', product.id);
      return false;
    }

    // Проверяем, не добавлен ли уже товар
    const alreadyInWishlist = isInWishlistMap[productId] || false;
    if (alreadyInWishlist) {
      console.log('Товар уже в избранном');
      return false;
    }

    try {
      await wishlistService.add(user.id, productId);
      
      // Обновляем локальное состояние СРАЗУ
      setWishlist(prev => {
        if (prev.find(p => p.id === product.id)) {
          return prev; // Уже есть в избранном (на всякий случай)
        }
        return [product, ...prev];
      });
      
      setIsInWishlistMap(prev => ({
        ...prev,
        [productId]: true,
      }));
      
      toast.success('Товар добавлен в избранное');
      return true;
    } catch (error: any) {
      console.error('Ошибка добавления в избранное:', error);
      toast.error(error.message || 'Не удалось добавить товар в избранное');
      return false;
    }
  }, [isAuthenticated, user?.id, isInWishlistMap]);

  /**
   * Удалить товар из избранного
   */
  const removeFromWishlist = useCallback(async (productId: number | string) => {
    if (!user?.id) return false;

    const id = typeof productId === 'string' ? parseInt(productId) : productId;
    if (isNaN(id)) {
      console.error('Неверный ID товара:', productId);
      return false;
    }

    // Проверяем, есть ли товар в избранном
    const wasInWishlist = isInWishlistMap[id] || false;

    try {
      await wishlistService.remove(user.id, id);
      
      // Обновляем локальное состояние СРАЗУ
      setWishlist(prev => prev.filter(p => parseInt(p.id) !== id));
      
      setIsInWishlistMap(prev => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
      
      toast.success('Товар удален из избранного');
      return true;
    } catch (error: any) {
      console.error('Ошибка удаления из избранного:', error);
      toast.error(error.message || 'Не удалось удалить товар из избранного');
      return false;
    }
  }, [user?.id, isInWishlistMap]);

  /**
   * Переключить товар в избранном (добавить/удалить)
   */
  const toggleWishlist = useCallback(async (product: Product) => {
    if (!isAuthenticated || !user?.id) {
      toast.error('Войдите в аккаунт, чтобы добавить товар в избранное');
      return false;
    }

    const productId = parseInt(product.id);
    if (isNaN(productId)) {
      console.error('Неверный ID товара:', product.id);
      return false;
    }

    const isInWishlist = isInWishlistMap[productId] || false;

    let result = false;
    if (isInWishlist) {
      result = await removeFromWishlist(productId);
    } else {
      result = await addToWishlist(product);
    }

    return result;
  }, [isAuthenticated, user?.id, isInWishlistMap, addToWishlist, removeFromWishlist]);

  const value: WishlistContextType = {
    wishlist,
    wishlistCount,
    loading,
    isInWishlist: (productId: number | string) => {
      const id = typeof productId === 'string' ? parseInt(productId) : productId;
      return isNaN(id) ? false : (isInWishlistMap[id] || false);
    },
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    checkIsInWishlist,
    loadWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    // Возвращаем дефолтные значения вместо ошибки, чтобы избежать белого экрана
    console.warn('useWishlist must be used within a WishlistProvider');
    return {
      wishlist: [],
      wishlistCount: 0,
      loading: false,
      isInWishlist: () => false,
      addToWishlist: async () => false,
      removeFromWishlist: async () => false,
      toggleWishlist: async () => false,
      checkIsInWishlist: async () => false,
      loadWishlist: async () => {},
    };
  }
  return context;
};

