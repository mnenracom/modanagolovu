import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import { transformProductFromSupabase } from '@/types/productSupabase';

/**
 * Сервис для работы с избранным (Wishlist)
 */
export const wishlistService = {
  /**
   * Получить все товары из избранного пользователя
   */
  async getAll(userId: string): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          product_id,
          products (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка получения избранного:', error);
        throw new Error(`Ошибка получения избранного: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Преобразуем данные из Supabase формата
      const products = data
        .map((item: any) => {
          if (item.products) {
            return transformProductFromSupabase(item.products);
          }
          return null;
        })
        .filter((product): product is Product => product !== null);

      return products;
    } catch (error) {
      console.error('Ошибка получения избранного:', error);
      throw error;
    }
  },

  /**
   * Проверить, есть ли товар в избранном
   */
  async isInWishlist(userId: string, productId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false; // Не найдено
        }
        console.error('Ошибка проверки избранного:', error);
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Ошибка проверки избранного:', error);
      return false;
    }
  },

  /**
   * Добавить товар в избранное
   */
  async add(userId: string, productId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('wishlist')
        .insert({
          user_id: userId,
          product_id: productId,
        });

      if (error) {
        // Если товар уже в избранном, игнорируем ошибку
        if (error.code === '23505') {
          return; // Уже в избранном
        }
        console.error('Ошибка добавления в избранное:', error);
        throw new Error(`Ошибка добавления в избранное: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка добавления в избранное:', error);
      throw error;
    }
  },

  /**
   * Удалить товар из избранного
   */
  async remove(userId: string, productId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        console.error('Ошибка удаления из избранного:', error);
        throw new Error(`Ошибка удаления из избранного: ${error.message}`);
      }
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
      throw error;
    }
  },

  /**
   * Переключить товар в избранном (добавить/удалить)
   */
  async toggle(userId: string, productId: number): Promise<boolean> {
    try {
      const isInWishlist = await this.isInWishlist(userId, productId);
      
      if (isInWishlist) {
        await this.remove(userId, productId);
        return false;
      } else {
        await this.add(userId, productId);
        return true;
      }
    } catch (error) {
      console.error('Ошибка переключения избранного:', error);
      throw error;
    }
  },

  /**
   * Получить количество товаров в избранном
   */
  async getCount(userId: string): Promise<number> {
    try {
      // Используем прямой запрос с подсчетом для надежности
      const { data, error, count } = await supabase
        .from('wishlist')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) {
        console.error('Ошибка получения количества избранного:', error);
        console.error('Детали ошибки:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Пробуем альтернативный способ - получить все записи и посчитать
        try {
          const { data: allData, error: altError } = await supabase
            .from('wishlist')
            .select('id')
            .eq('user_id', userId);
          
          if (altError) {
            console.error('Альтернативный запрос тоже не сработал:', altError);
            return 0;
          }
          
          const altCount = allData?.length || 0;
          console.log('Количество избранного (альтернативный способ):', altCount);
          return altCount;
        } catch (altErr) {
          console.error('Ошибка альтернативного запроса:', altErr);
          return 0;
        }
      }

      const resultCount = count ?? (data ? data.length : 0);
      console.log('Количество избранного из БД:', resultCount, 'для пользователя:', userId);
      return resultCount;
    } catch (error) {
      console.error('Ошибка получения количества избранного:', error);
      return 0;
    }
  },
};

