import { supabase } from '@/lib/supabase';
import { CategorySupabase, CategoryFormData } from '@/types/categorySupabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';

export const categoriesService = {
  // Получить все категории
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения категорий:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  },

  // Получить активные категории
  async getActive() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения активных категорий:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return data || [];
  },

  // Получить категории для главной страницы
  async getForHomepage() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_homepage', true)
        .order('order_index', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        // Если поле show_on_homepage не существует, возвращаем все активные категории
        if (error.message.includes('show_on_homepage') || error.code === 'PGRST116') {
          console.warn('Поле show_on_homepage не найдено. Выполните SQL-скрипт add_show_on_homepage_to_categories.sql');
          // Fallback: возвращаем все активные категории
          return this.getActive();
        }
        console.error('Ошибка получения категорий для главной страницы:', error);
        const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
      }

      return data || [];
    } catch (error: any) {
      // Если произошла ошибка, возвращаем все активные категории как fallback
      console.warn('Ошибка при получении категорий для главной страницы, используем fallback:', error);
      return this.getActive();
    }
  },

  // Получить категорию по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Категория не найдена');
      }
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    if (!data) {
      throw new Error('Категория не найдена');
    }

    return data;
  },

  // Получить категорию по slug
  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Категория не найдена');
      }
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return data;
  },

  // Создать категорию
  async create(categoryData: CategoryFormData) {
    const insertData: any = {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description || null,
      image: categoryData.image || null,
      order_index: categoryData.order_index ?? 0,
      is_active: categoryData.is_active ?? true,
      // Добавляем show_on_homepage только если оно передано (проверка на существование поля в БД)
      ...(categoryData.show_on_homepage !== undefined && { show_on_homepage: categoryData.show_on_homepage }),
    };

    if (categoryData.parent_id !== undefined && categoryData.parent_id !== null) {
      insertData.parent_id = categoryData.parent_id;
    } else {
      insertData.parent_id = null;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания категории:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем создание категории
    if (data) {
      auditLogger.logCreate('category', data.id, data.name, insertData).catch(err => 
        console.error('Ошибка логирования создания категории:', err)
      );
    }

    return data;
  },

  // Обновить категорию
  async update(id: number, categoryData: Partial<CategoryFormData>) {
    const updateData: any = {};

    if (categoryData.name !== undefined) updateData.name = categoryData.name;
    if (categoryData.slug !== undefined) updateData.slug = categoryData.slug;
    if (categoryData.parent_id !== undefined) updateData.parent_id = categoryData.parent_id;
    if (categoryData.description !== undefined) updateData.description = categoryData.description || null;
    if (categoryData.image !== undefined) updateData.image = categoryData.image || null;
    if (categoryData.order_index !== undefined) updateData.order_index = categoryData.order_index;
    if (categoryData.is_active !== undefined) updateData.is_active = categoryData.is_active;
    // Добавляем show_on_homepage только если оно передано (проверка на существование поля в БД)
    if (categoryData.show_on_homepage !== undefined) {
      try {
        updateData.show_on_homepage = categoryData.show_on_homepage;
      } catch (error) {
        console.warn('Поле show_on_homepage не найдено в БД. Выполните SQL-скрипт add_show_on_homepage_to_categories.sql');
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления категории:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем обновление категории
    if (data) {
      auditLogger.logUpdate('category', id, data.name || 'Категория', {}, updateData).catch(err => 
        console.error('Ошибка логирования обновления категории:', err)
      );
    }

    return data;
  },

  // Удалить категорию
  async delete(id: number) {
    // Получаем данные категории перед удалением для логирования
    let categoryName = 'Категория';
    try {
      const category = await this.getById(id);
      categoryName = category.name || 'Категория';
    } catch (err) {
      // Игнорируем ошибку, если категория не найдена
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления категории:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем удаление категории
    auditLogger.logDelete('category', id, categoryName).catch(err => 
      console.error('Ошибка логирования удаления категории:', err)
    );

    return true;
  },

  // Загрузить изображение категории
  async uploadImage(file: File, categoryId?: number): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${categoryId || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      // Загружаем файл в Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Ошибка загрузки изображения:', uploadError);
        if (uploadError.message.includes('row-level security')) {
          throw new Error(
            'Ошибка доступа к Storage. Выполните SQL из файла fix_all_rls.sql в Supabase Dashboard для настройки политик Storage.'
          );
        }
        throw new Error(uploadError.message);
      }

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Ошибка загрузки изображения категории:', error);
      throw error;
    }
  },

  // Удалить изображение категории
  async deleteImage(imagePath: string) {
    try {
      // Извлекаем путь из URL
      const pathMatch = imagePath.match(/categories\/([^?]+)/);
      if (!pathMatch) {
        throw new Error('Неверный путь к изображению');
      }

      const filePath = `categories/${pathMatch[1]}`;

      const { error } = await supabase.storage
        .from('product-images')
        .remove([filePath]);

      if (error) {
        console.error('Ошибка удаления изображения:', error);
        const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
      }

      return true;
    } catch (error: any) {
      console.error('Ошибка удаления изображения категории:', error);
      throw error;
    }
  },
};






