import { supabase } from '@/lib/supabase';
import { CartItem } from '@/types/product';

export interface UserCart {
  id: number;
  user_id: string;
  cart_items: CartItem[];
  created_at: string;
  updated_at: string;
}

export const cartService = {
  // Сохранить корзину пользователя
  async saveCart(userId: string, items: CartItem[]): Promise<void> {
    try {
      // Сериализуем товары корзины (убираем функции и лишние данные)
      const cartItems = items.map(item => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          image: item.product.image,
          price: item.product.price,
          retailPrice: item.product.retailPrice,
          wholesalePrice: item.product.wholesalePrice,
          wholesaleThreshold: item.product.wholesaleThreshold,
          priceRanges: item.product.priceRanges,
          sku: item.product.sku,
          category: item.product.category,
        },
        quantity: item.quantity,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
      }));

      // Используем upsert для обновления или создания
      const { error } = await supabase
        .from('user_carts')
        .upsert(
          {
            user_id: userId,
            cart_items: cartItems,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        console.error('Ошибка сохранения корзины:', error);
        throw error;
      }
    } catch (error: any) {
      // Если таблица не существует, просто игнорируем ошибку
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Таблица user_carts не существует. Создайте её через SQL Editor (create_user_carts_table.sql)');
        return;
      }
      throw error;
    }
  },

  // Загрузить корзину пользователя
  async loadCart(userId: string): Promise<CartItem[]> {
    try {
      const { data, error } = await supabase
        .from('user_carts')
        .select('cart_items')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Если записи нет, возвращаем пустую корзину
        if (error.code === 'PGRST116') {
          return [];
        }
        throw error;
      }

      if (!data || !data.cart_items) {
        return [];
      }

      // Десериализуем товары корзины
      // Загружаем полную информацию о продуктах
      const cartItems: CartItem[] = [];
      
      for (const item of data.cart_items as any[]) {
        try {
          // Загружаем полную информацию о продукте
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', item.product.id)
            .single();

          if (productError || !productData) {
            // Если продукт не найден, пропускаем его
            console.warn(`Продукт с ID ${item.product.id} не найден, пропускаем`);
            continue;
          }

          // Преобразуем продукт из формата Supabase в наш формат
          const product = {
            id: productData.id.toString(),
            name: productData.name,
            image: productData.images?.[0] || productData.image || '',
            price: parseFloat(productData.price || 0),
            retailPrice: productData.retail_price ? parseFloat(productData.retail_price) : undefined,
            wholesalePrice: productData.wholesale_price ? parseFloat(productData.wholesale_price) : undefined,
            wholesaleThreshold: productData.wholesale_threshold || undefined,
            priceRanges: productData.price_ranges || [],
            sku: productData.sku || '',
            category: productData.category || 'scarves',
            description: productData.description || '',
            material: productData.material || '',
            colors: productData.colors || [],
            sizes: productData.sizes || [],
            inStock: productData.in_stock !== false,
          };

          cartItems.push({
            product,
            quantity: item.quantity,
            selectedColor: item.selectedColor || undefined,
            selectedSize: item.selectedSize || undefined,
          });
        } catch (err) {
          console.error('Ошибка загрузки продукта для корзины:', err);
          // Продолжаем с другими товарами
        }
      }

      return cartItems;
    } catch (error: any) {
      // Если таблица не существует, возвращаем пустую корзину
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        console.warn('Таблица user_carts не существует. Создайте её через SQL Editor (create_user_carts_table.sql)');
        return [];
      }
      console.error('Ошибка загрузки корзины:', error);
      return [];
    }
  },

  // Очистить корзину пользователя
  async clearCart(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_carts')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Ошибка очистки корзины:', error);
        // Не бросаем ошибку, так как корзина может быть уже пустой
      }
    } catch (error: any) {
      // Игнорируем ошибки, если таблица не существует
      if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
        return;
      }
      console.error('Ошибка очистки корзины:', error);
    }
  },
};




