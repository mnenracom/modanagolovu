import { supabase } from '@/lib/supabase';
import { Review, ReviewFormData, ReviewStats } from '@/types/review';

// Преобразование из Supabase формата (snake_case) в camelCase
function transformReviewFromSupabase(data: any): Review {
  return {
    id: data.id,
    productId: data.product_id,
    source: data.source,
    marketplaceType: data.marketplace_type,
    externalReviewId: data.external_review_id,
    authorName: data.author_name,
    authorEmail: data.author_email,
    authorAvatarUrl: data.author_avatar_url,
    rating: data.rating,
    title: data.title,
    text: data.text,
    pros: data.pros,
    cons: data.cons,
    photos: data.photos || [],
    status: data.status || 'pending',
    moderationNotes: data.moderation_notes,
    moderatedBy: data.moderated_by,
    moderatedAt: data.moderated_at,
    verifiedPurchase: data.verified_purchase || false,
    helpfulCount: data.helpful_count || 0,
    replyText: data.reply_text,
    replyDate: data.reply_date,
    metadata: data.metadata || {},
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    externalCreatedAt: data.external_created_at,
  };
}

// Преобразование в Supabase формат (snake_case)
function transformReviewToSupabase(data: Partial<ReviewFormData> | Partial<Review>): any {
  const result: any = {};
  
  if ('productId' in data) result.product_id = data.productId;
  if ('source' in data) result.source = data.source;
  if ('marketplaceType' in data) result.marketplace_type = data.marketplaceType;
  if ('externalReviewId' in data) result.external_review_id = data.externalReviewId;
  if ('authorName' in data) result.author_name = data.authorName;
  if ('authorEmail' in data) result.author_email = data.authorEmail;
  if ('authorAvatarUrl' in data) result.author_avatar_url = data.authorAvatarUrl;
  if ('rating' in data) result.rating = data.rating;
  if ('title' in data) result.title = data.title;
  if ('text' in data) result.text = data.text;
  if ('pros' in data) result.pros = data.pros;
  if ('cons' in data) result.cons = data.cons;
  if ('photos' in data) result.photos = data.photos || [];
  if ('status' in data) result.status = data.status;
  if ('moderationNotes' in data) result.moderation_notes = data.moderationNotes;
  if ('moderatedBy' in data) result.moderated_by = data.moderatedBy;
  if ('moderatedAt' in data) result.moderated_at = data.moderatedAt;
  if ('verifiedPurchase' in data) result.verified_purchase = data.verifiedPurchase;
  if ('helpfulCount' in data) result.helpful_count = data.helpfulCount;
  if ('replyText' in data) result.reply_text = data.replyText;
  if ('replyDate' in data) result.reply_date = data.replyDate;
  if ('metadata' in data) result.metadata = data.metadata || {};
  if ('externalCreatedAt' in data) result.external_created_at = data.externalCreatedAt;
  
  return result;
}

export const reviewsService = {
  /**
   * Получить отзывы для товара
   */
  async getByProduct(productId: number, params?: {
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
  }): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId);

    if (params?.status) {
      query = query.eq('status', params.status);
    } else {
      // По умолчанию показываем только одобренные
      query = query.eq('status', 'approved');
    }

    // Сортировка
    if (params?.sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (params?.sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (params?.sortBy === 'rating_high') {
      query = query.order('rating', { ascending: false });
    } else if (params?.sortBy === 'rating_low') {
      query = query.order('rating', { ascending: true });
    } else if (params?.sortBy === 'helpful') {
      query = query.order('helpful_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения отзывов:', error);
      throw new Error(`Ошибка получения отзывов: ${error.message}`);
    }

    return (data || []).map(transformReviewFromSupabase);
  },

  /**
   * Получить статистику отзывов для товара
   */
  async getStats(productId: number): Promise<ReviewStats> {
    try {
      const { data, error } = await supabase.rpc('calculate_product_rating', {
        product_id_param: productId,
      });

      if (error) {
        console.error('Ошибка получения статистики отзывов:', error);
        // Если функция не существует, считаем вручную
        return await this.calculateStatsManually(productId);
      }

      if (data && data.length > 0) {
        const stats = data[0];
        return {
          averageRating: parseFloat(stats.average_rating || 0),
          totalReviews: stats.total_reviews || 0,
          ratingDistribution: stats.rating_distribution || {
            '5': 0,
            '4': 0,
            '3': 0,
            '2': 0,
            '1': 0,
          },
        };
      }

      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
        },
      };
    } catch (error) {
      console.error('Ошибка получения статистики отзывов:', error);
      return await this.calculateStatsManually(productId);
    }
  },

  /**
   * Рассчитать статистику вручную (fallback)
   */
  async calculateStatsManually(productId: number): Promise<ReviewStats> {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('status', 'approved');

    if (error) {
      console.error('Ошибка расчета статистики:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
        },
      };
    }

    const reviews = data || [];
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          '5': 0,
          '4': 0,
          '3': 0,
          '2': 0,
          '1': 0,
        },
      };
    }

    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const averageRating = sum / totalReviews;

    const distribution = {
      '5': reviews.filter(r => r.rating === 5).length,
      '4': reviews.filter(r => r.rating === 4).length,
      '3': reviews.filter(r => r.rating === 3).length,
      '2': reviews.filter(r => r.rating === 2).length,
      '1': reviews.filter(r => r.rating === 1).length,
    };

    return {
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalReviews,
      ratingDistribution: distribution,
    };
  },

  /**
   * Создать отзыв (для пользователей сайта)
   */
  async create(reviewData: ReviewFormData, userEmail: string, userName: string): Promise<Review> {
    const supabaseData = transformReviewToSupabase({
      ...reviewData,
      source: 'website',
      authorName: userName,
      authorEmail: userEmail,
      status: 'pending', // Требует модерации
    });

    const { data, error } = await supabase
      .from('reviews')
      .insert(supabaseData)
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания отзыва:', error);
      throw new Error(`Ошибка создания отзыва: ${error.message}`);
    }

    // Отправляем уведомление в Telegram о новом отзыве
    if (data) {
      const review = transformReviewFromSupabase(data);
      const { telegramService } = await import('./telegramService');
      telegramService.sendNotification({
        type: 'new_review',
        title: '⭐ Новый отзыв',
        message: `Получен новый отзыв от ${review.authorName}`,
        data: {
          Автор: review.authorName,
          Рейтинг: `${review.rating}/5`,
          Товар_ID: review.productId.toString(),
          Источник: review.source === 'website' ? 'Сайт' : review.source === 'wildberries' ? 'WB' : 'OZON',
          Статус: 'На модерации',
        },
        priority: 'normal',
      }).catch(err => console.error('Ошибка отправки уведомления в Telegram:', err));
    }

    return transformReviewFromSupabase(data);
  },

  /**
   * Обновить статус отзыва (модерация)
   */
  async updateStatus(
    id: number,
    status: 'pending' | 'approved' | 'rejected' | 'hidden',
    moderationNotes?: string,
    moderatorId?: string
  ): Promise<Review> {
    const updateData: any = {
      status,
      moderated_at: new Date().toISOString(),
    };

    if (moderationNotes !== undefined) {
      updateData.moderation_notes = moderationNotes;
    }
    if (moderatorId) {
      updateData.moderated_by = moderatorId;
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления статуса отзыва:', error);
      throw new Error(`Ошибка обновления статуса отзыва: ${error.message}`);
    }

    return transformReviewFromSupabase(data);
  },

  /**
   * Массовое обновление статуса отзывов
   */
  async bulkUpdateStatus(
    ids: number[],
    status: 'pending' | 'approved' | 'rejected' | 'hidden',
    moderatorId?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      moderated_at: new Date().toISOString(),
    };

    if (moderatorId) {
      updateData.moderated_by = moderatorId;
    }

    const { error } = await supabase
      .from('reviews')
      .update(updateData)
      .in('id', ids);

    if (error) {
      console.error('Ошибка массового обновления статуса:', error);
      throw new Error(`Ошибка массового обновления статуса: ${error.message}`);
    }
  },

  /**
   * Добавить ответ продавца на отзыв
   */
  async addReply(id: number, replyText: string): Promise<Review> {
    const { data, error } = await supabase
      .from('reviews')
      .update({
        reply_text: replyText,
        reply_date: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка добавления ответа:', error);
      throw new Error(`Ошибка добавления ответа: ${error.message}`);
    }

    return transformReviewFromSupabase(data);
  },

  /**
   * Увеличить счетчик "Полезно"
   */
  async markHelpful(id: number): Promise<void> {
    const { error } = await supabase.rpc('increment_helpful_count', {
      review_id: id,
    });

    if (error) {
      // Если функция не существует, обновляем вручную
      const { data: review } = await supabase
        .from('reviews')
        .select('helpful_count')
        .eq('id', id)
        .single();

      if (review) {
        await supabase
          .from('reviews')
          .update({ helpful_count: (review.helpful_count || 0) + 1 })
          .eq('id', id);
      }
    }
  },

  /**
   * Получить все отзывы (для админки)
   */
  async getAll(params?: {
    productId?: number;
    status?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.productId) {
      query = query.eq('product_id', params.productId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.source) {
      query = query.eq('source', params.source);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения отзывов:', error);
      throw new Error(`Ошибка получения отзывов: ${error.message}`);
    }

    return (data || []).map(transformReviewFromSupabase);
  },

  /**
   * Создать или обновить отзыв с маркетплейса
   */
  async upsertMarketplaceReview(review: Partial<Review>): Promise<Review> {
    const supabaseData = transformReviewToSupabase(review);

    const { data, error } = await supabase
      .from('reviews')
      .upsert(supabaseData, {
        onConflict: 'source,external_review_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения отзыва с маркетплейса:', error);
      throw new Error(`Ошибка сохранения отзыва: ${error.message}`);
    }

    return transformReviewFromSupabase(data);
  },
};

