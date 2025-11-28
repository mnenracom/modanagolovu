import { supabase } from '@/lib/supabase';
import { 
  MediaSupabase,
  MediaFormData,
  transformMediaFromSupabase,
  transformMediaToSupabase,
} from '@/types/mediaSupabase';
import { handleRLSError, getErrorMessage } from '@/lib/rlsErrorHandler';
import { auditLogger } from '@/lib/auditLogger';

const BUCKET_NAME = 'media-library';

export const mediaService = {
  // Получить все медиа-файлы
  async getAll(params?: {
    fileType?: string;
    folderPath?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('media_library')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (params?.fileType) {
      query = query.eq('file_type', params.fileType);
    }

    if (params?.folderPath) {
      query = query.eq('folder_path', params.folderPath);
    }

    if (params?.search) {
      query = query.or(`file_name.ilike.%${params.search}%,title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
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

    return (data || []).map(transformMediaFromSupabase);
  },

  // Получить медиа-файл по ID
  async getById(id: number) {
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Медиа-файл не найден');
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

    return transformMediaFromSupabase(data);
  },

  // Загрузить файл в Storage и создать запись в БД
  async uploadFile(
    file: File,
    folderPath: string = '/',
    metadata?: {
      altText?: string;
      title?: string;
      description?: string;
    }
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Пользователь не авторизован');
    }

    // Проверяем, что файл валиден
    if (!file) {
      throw new Error('Файл не предоставлен');
    }
    
    if (!(file instanceof File) && !(file instanceof Blob)) {
      throw new Error('Некорректный тип файла. Ожидается File или Blob');
    }
    
    // Если это Blob, конвертируем в File
    let fileToUpload: File;
    if (file instanceof Blob && !(file instanceof File)) {
      fileToUpload = new File([file], 'image.jpg', { type: file.type || 'image/jpeg' });
    } else {
      fileToUpload = file as File;
    }

    // Определяем тип файла (с проверкой на undefined)
    const mimeType = fileToUpload.type || '';
    const fileType = mimeType.startsWith('image/') ? 'image' :
                     mimeType.startsWith('video/') ? 'video' :
                     mimeType.startsWith('audio/') ? 'audio' :
                     'document';

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const originalFileName = fileToUpload.name || 'file';
    const fileExtension = originalFileName.split('.').pop() || (fileType === 'image' ? 'jpg' : 'bin');
    const finalFileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = folderPath === '/' ? finalFileName : `${folderPath}/${finalFileName}`;

    // Загружаем файл в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Ошибка загрузки файла: ${uploadError.message}`);
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    if (!urlData) {
      throw new Error('Не удалось получить URL файла');
    }
    
    const publicUrl = urlData.publicUrl;

    // Получаем размеры изображения (если это изображение)
    let width: number | null = null;
    let height: number | null = null;

    if (fileType === 'image') {
      try {
        const img = new Image();
        img.src = URL.createObjectURL(fileToUpload);
        await new Promise((resolve, reject) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            URL.revokeObjectURL(img.src);
            resolve(null);
          };
          img.onerror = reject;
        });
      } catch (err) {
        console.warn('Не удалось получить размеры изображения:', err);
      }
    }

    // Создаем запись в БД
    const mediaData: Partial<MediaFormData> = {
      fileName: originalFileName,
      filePath: filePath,
      fileUrl: publicUrl,
      fileType: fileType,
      mimeType: mimeType || undefined,
      fileSize: fileToUpload.size || undefined,
      width: width || undefined,
      height: height || undefined,
      altText: metadata?.altText,
      title: metadata?.title || originalFileName,
      description: metadata?.description,
      folderPath: folderPath,
    };

    const supabaseData = transformMediaToSupabase(mediaData, user.id);
    
    const { data, error } = await supabase
      .from('media_library')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      // Если ошибка при создании записи, удаляем загруженный файл
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])
        .catch(console.error);

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
    await auditLogger.logCreate('media', data.id, originalFileName, supabaseData).catch(err => 
      console.error('Ошибка логирования:', err)
    );

    return transformMediaFromSupabase(data);
  },

  // Обновить метаданные медиа-файла
  async update(id: number, metadata: Partial<MediaFormData>) {
    const oldData = await this.getById(id).catch(() => null);
    
    const supabaseData = transformMediaToSupabase(metadata);
    
    const { data, error } = await supabase
      .from('media_library')
      .update(supabaseData)
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
      await auditLogger.logUpdate('media', id, data.file_name, oldData, supabaseData).catch(err => 
        console.error('Ошибка логирования:', err)
      );
    }

    return transformMediaFromSupabase(data);
  },

  // Удалить медиа-файл
  async delete(id: number) {
    const oldData = await this.getById(id).catch(() => null);
    
    if (!oldData) {
      throw new Error('Медиа-файл не найден');
    }

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([oldData.filePath]);

    if (storageError) {
      console.warn('Ошибка удаления файла из Storage:', storageError);
    }

    // Удаляем запись из БД
    const { error } = await supabase
      .from('media_library')
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
    await auditLogger.logDelete('media', id, oldData.fileName, oldData).catch(err => 
      console.error('Ошибка логирования:', err)
    );
  },

  // Получить URL для прямого доступа к файлу
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    return data.publicUrl;
  },
};

