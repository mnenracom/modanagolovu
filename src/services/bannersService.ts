import { supabase } from '@/lib/supabase';
import { BannerSupabase, transformBannerToSupabase } from '@/types/bannerSupabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';

export const bannersService = {
  async getAll(): Promise<BannerSupabase[]> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching banners:', error);
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

  async getActive(): Promise<BannerSupabase[]> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching active banners:', error);
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

  async getById(id: number): Promise<BannerSupabase> {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching banner by ID:', error);
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

  async create(bannerData: any): Promise<BannerSupabase> {
    const supabaseData = transformBannerToSupabase(bannerData);
    const { data, error } = await supabase
      .from('banners')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('Error creating banner:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем создание баннера
    if (data) {
      auditLogger.logCreate('banner', data.id, data.title || 'Баннер', supabaseData).catch(err => 
        console.error('Ошибка логирования создания баннера:', err)
      );
    }

    return data;
  },

  async update(id: number, bannerData: any): Promise<BannerSupabase> {
    const supabaseData = transformBannerToSupabase(bannerData);
    const { data, error } = await supabase
      .from('banners')
      .update(supabaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating banner:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем обновление баннера
    if (data) {
      auditLogger.logUpdate('banner', id, data.title || 'Баннер', {}, supabaseData).catch(err => 
        console.error('Ошибка логирования обновления баннера:', err)
      );
    }

    return data;
  },

  async delete(id: number): Promise<void> {
    // Получаем данные баннера перед удалением для логирования
    let bannerTitle = 'Баннер';
    try {
      const banner = await this.getById(id);
      bannerTitle = banner.title || 'Баннер';
    } catch (err) {
      // Игнорируем ошибку, если баннер не найден
    }

    const { error } = await supabase
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting banner:', error);
      const rlsError = handleRLSError(error);
      if (rlsError.isRLSError) {
        const customError: any = new Error(rlsError.message);
        customError.isRLSError = true;
        customError.requiresRelogin = rlsError.requiresRelogin;
        throw customError;
      }
      throw new Error(getErrorMessage(error));
    }

    // Логируем удаление баннера
    auditLogger.logDelete('banner', id, bannerTitle).catch(err => 
      console.error('Ошибка логирования удаления баннера:', err)
    );
  },

  async uploadImage(file: File, bannerId?: number): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${bannerId || Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('banner-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading banner image:', uploadError);
      throw new Error(`Failed to upload banner image: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('banner-images')
      .getPublicUrl(uploadData.path);

    return urlData.publicUrl;
  },

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'banner-images');

      if (bucketIndex === -1) {
        throw new Error('Invalid image URL format');
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from('banner-images')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting banner image:', error);
      }
    } catch (error: any) {
      console.error('Error during banner image deletion:', error);
    }
  },
};





