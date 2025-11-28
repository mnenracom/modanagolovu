import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { CartItem, Product } from '@/types/product';
import { toast } from 'sonner';
import { useUserAuth } from '@/hooks/useUserAuth';
import { cartService } from '@/services/cartService';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, color?: string, size?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalEconomy: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useUserAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка корзины при монтировании или изменении пользователя
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      try {
        if (user?.id) {
          // Загружаем корзину из БД для зарегистрированных пользователей
          const savedCart = await cartService.loadCart(user.id);
          if (savedCart.length > 0) {
            setItems(savedCart);
          }
        } else {
          // Загружаем корзину из localStorage для неавторизованных пользователей
          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            try {
              const parsedCart = JSON.parse(savedCart);
              setItems(parsedCart);
            } catch (e) {
              console.error('Ошибка загрузки корзины из localStorage:', e);
              localStorage.removeItem('cart');
            }
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [user?.id]);

  // Сохранение корзины с debounce
  const saveCart = useCallback((cartItems: CartItem[]) => {
    // Очищаем предыдущий timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Устанавливаем новый timeout для debounce (500ms)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (user?.id) {
          // Сохраняем в БД для зарегистрированных пользователей
          await cartService.saveCart(user.id, cartItems);
        } else {
          // Сохраняем в localStorage для неавторизованных пользователей
          localStorage.setItem('cart', JSON.stringify(cartItems));
        }
      } catch (error) {
        console.error('Ошибка сохранения корзины:', error);
      }
    }, 500);
  }, [user?.id]);

  const addToCart = (product: Product, quantity: number, color?: string, size?: string) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => 
          item.product.id === product.id && 
          item.selectedColor === color && 
          item.selectedSize === size
      );

      let newItems: CartItem[];
      if (existingItem) {
        toast.success('Количество товара обновлено в корзине');
        newItems = prevItems.map((item) =>
          item.product.id === product.id && 
          item.selectedColor === color && 
          item.selectedSize === size
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        toast.success('Товар добавлен в корзину');
        newItems = [...prevItems, { product, quantity, selectedColor: color, selectedSize: size }];
      }

      // Сохраняем корзину
      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prevItems) => {
      const newItems = prevItems.filter((item) => item.product.id !== productId);
      saveCart(newItems);
      return newItems;
    });
    toast.success('Товар удален из корзины');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems((prevItems) => {
      const newItems = prevItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      );
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = async () => {
    setItems([]);
    
    // Очищаем корзину в БД или localStorage
    if (user?.id) {
      try {
        await cartService.clearCart(user.id);
      } catch (error) {
        console.error('Ошибка очистки корзины:', error);
      }
    } else {
      localStorage.removeItem('cart');
    }
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => {
      // Получаем dual-цены
      const retailPrice = item.product.retailPrice ?? item.product.price ?? 0;
      const wholesalePrice = item.product.wholesalePrice ?? 0;
      const wholesaleThreshold = item.product.wholesaleThreshold ?? 10;
      
      // Если количество >= порога опта и есть оптовая цена, используем оптовую
      let price = retailPrice;
      if (item.quantity >= wholesaleThreshold && wholesalePrice > 0 && wholesalePrice < retailPrice) {
        price = wholesalePrice;
      } else if (item.product.priceRanges && item.product.priceRanges.length > 0) {
        // Иначе используем priceRanges
        const priceRange = item.product.priceRanges.find(
          (range) =>
            item.quantity >= range.minQuantity &&
            (range.maxQuantity === null || item.quantity <= range.maxQuantity)
        );
        price = priceRange ? priceRange.price : item.product.priceRanges[0].price;
      }
      
      return total + price * item.quantity;
    }, 0);
  };
  
  // Функция для получения общей экономии
  const getTotalEconomy = (): number => {
    return items.reduce((total, item) => {
      const retailPrice = item.product.retailPrice ?? item.product.price ?? 0;
      const wholesalePrice = item.product.wholesalePrice ?? 0;
      const wholesaleThreshold = item.product.wholesaleThreshold ?? 10;
      
      if (item.quantity >= wholesaleThreshold && wholesalePrice > 0 && wholesalePrice < retailPrice) {
        return total + (retailPrice - wholesalePrice) * item.quantity;
      }
      return total;
    }, 0);
  };

  // Очистка timeout при размонтировании
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalEconomy,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
