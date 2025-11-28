import { supabase } from '@/lib/supabase';
import { 
  ArticleCategorySupabase,
  transformArticleCategoryFromSupabase,
} from '@/types/articleSupabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';

export const articleCategoriesService = {
  // Получить все категории
  async getAll() {
    const { data, error } = await supabase
      .from('article_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return (data || []).map(transformArticleCategoryFromSupabase);
  },

  // Получить активные категории
  async getActive() {
    const { data, error } = await supabase
      .from('article_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    return (data || []).map(transformArticleCategoryFromSupabase);
  },

  // Получить категорию по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('article_categories')
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

    return transformArticleCategoryFromSupabase(data);
  },

  // Получить категорию по slug
  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('article_categories')
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

    return transformArticleCategoryFromSupabase(data);
  },

  // Создать категорию
  async create(category: Partial<ArticleCategorySupabase>) {
    const { data, error } = await supabase
      .from('article_categories')
      .insert([category])
      .select()
      .single();

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем действие
    await auditLogger.logCreate('article_category', data.id, category.name || '', category).catch(err => 
      console.error('Ошибка логирования:', err)
    );

    return transformArticleCategoryFromSupabase(data);
  },

  // Обновить категорию
  async update(id: number, category: Partial<ArticleCategorySupabase>) {
    const oldData = await this.getById(id).catch(() => null);
    
    const { data, error } = await supabase
      .from('article_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем действие
    if (oldData) {
      await auditLogger.logUpdate('article_category', id, category.name || data.name, oldData, category).catch(err => 
        console.error('Ошибка логирования:', err)
      );
    }

    return transformArticleCategoryFromSupabase(data);
  },

  // Удалить категорию
  async delete(id: number) {
    const oldData = await this.getById(id).catch(() => null);
    
    const { error } = await supabase
      .from('article_categories')
      .delete()
      .eq('id', id);

    if (error) {
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем действие
    if (oldData) {
      await auditLogger.logDelete('article_category', id, oldData.name, oldData).catch(err => 
        console.error('Ошибка логирования:', err)
      );
    }
  },
};




