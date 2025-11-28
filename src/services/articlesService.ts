import { supabase } from '@/lib/supabase';
import { 
  ArticleSupabase, 
  ArticleCategorySupabase,
  ArticleFormData,
  transformArticleFromSupabase,
  transformArticleToSupabase,
  transformArticleCategoryFromSupabase,
} from '@/types/articleSupabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';

export const articlesService = {
  // Получить все статьи (для админки)
  async getAll(params?: { 
    status?: 'draft' | 'published' | 'archived';
    categoryId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('articles')
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    if (params?.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,excerpt.ilike.%${params.search}%,content.ilike.%${params.search}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

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

    return (data || []).map((item: any) => {
      const category = item.article_categories ? transformArticleCategoryFromSupabase(item.article_categories) : undefined;
      return transformArticleFromSupabase(item, category);
    });
  },

  // Получить опубликованные статьи (для фронтенда)
  async getPublished(params?: {
    categorySlug?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }) {
    let query = supabase
      .from('articles')
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false });

    if (params?.categorySlug) {
      query = query.eq('article_categories.slug', params.categorySlug);
    }

    if (params?.featured) {
      query = query.eq('is_featured', true);
    }

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,excerpt.ilike.%${params.search}%,content.ilike.%${params.search}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

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

    return (data || []).map((item: any) => {
      const category = item.article_categories ? transformArticleCategoryFromSupabase(item.article_categories) : undefined;
      return transformArticleFromSupabase(item, category);
    });
  },

  // Получить статью по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Статья не найдена');
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

    const category = data.article_categories ? transformArticleCategoryFromSupabase(data.article_categories) : undefined;
    return transformArticleFromSupabase(data, category);
  },

  // Получить статью по slug (для фронтенда)
  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Статья не найдена');
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

    // Увеличиваем счетчик просмотров
    await supabase
      .from('articles')
      .update({ views_count: (data.views_count || 0) + 1 })
      .eq('id', data.id);

    const category = data.article_categories ? transformArticleCategoryFromSupabase(data.article_categories) : undefined;
    return transformArticleFromSupabase(data, category);
  },

  // Создать статью
  async create(article: ArticleFormData) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    const supabaseData = transformArticleToSupabase(article, user.id);
    
    const { data, error } = await supabase
      .from('articles')
      .insert([supabaseData])
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
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
    await auditLogger.logCreate('article', data.id, article.title, supabaseData).catch(err => 
      console.error('Ошибка логирования:', err)
    );

    const category = data.article_categories ? transformArticleCategoryFromSupabase(data.article_categories) : undefined;
    return transformArticleFromSupabase(data, category);
  },

  // Обновить статью
  async update(id: number, article: Partial<ArticleFormData>) {
    const oldData = await this.getById(id).catch(() => null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    const supabaseData = transformArticleToSupabase(article, user.id);
    
    const { data, error } = await supabase
      .from('articles')
      .update(supabaseData)
      .eq('id', id)
      .select(`
        *,
        article_categories (
          id,
          name,
          slug,
          description,
          image_url,
          is_active,
          sort_order
        )
      `)
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
      await auditLogger.logUpdate('article', id, data.title, oldData, supabaseData).catch(err => 
        console.error('Ошибка логирования:', err)
      );
    }

    const category = data.article_categories ? transformArticleCategoryFromSupabase(data.article_categories) : undefined;
    return transformArticleFromSupabase(data, category);
  },

  // Удалить статью
  async delete(id: number) {
    const oldData = await this.getById(id).catch(() => null);
    
    const { error } = await supabase
      .from('articles')
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
      await auditLogger.logDelete('article', id, oldData.title, oldData).catch(err => 
        console.error('Ошибка логирования:', err)
      );
    }
  },
};




