// Типы для работы с медиа-библиотекой в Supabase

export interface MediaSupabase {
  id: number;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  title: string | null;
  description: string | null;
  uploaded_by: string | null;
  folder_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Media {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileType: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  altText?: string;
  title?: string;
  description?: string;
  uploadedBy?: string;
  folderPath: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaFormData {
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileType: string;
  mimeType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  altText?: string;
  title?: string;
  description?: string;
  folderPath?: string;
}

// Функция для преобразования Supabase формата в клиентский
export const transformMediaFromSupabase = (media: MediaSupabase): Media => {
  return {
    id: media.id.toString(),
    fileName: media.file_name,
    filePath: media.file_path,
    fileUrl: media.file_url,
    fileType: media.file_type,
    mimeType: media.mime_type || undefined,
    fileSize: media.file_size || undefined,
    width: media.width || undefined,
    height: media.height || undefined,
    altText: media.alt_text || undefined,
    title: media.title || undefined,
    description: media.description || undefined,
    uploadedBy: media.uploaded_by || undefined,
    folderPath: media.folder_path,
    isActive: media.is_active,
    createdAt: media.created_at,
    updatedAt: media.updated_at || undefined,
  };
};

// Функция для преобразования клиентского формата в Supabase
export const transformMediaToSupabase = (media: Partial<MediaFormData>, uploadedBy?: string): Partial<MediaSupabase> => {
  const data: any = {};
  
  if (media.fileName !== undefined) data.file_name = media.fileName;
  if (media.filePath !== undefined) data.file_path = media.filePath;
  if (media.fileUrl !== undefined) data.file_url = media.fileUrl;
  if (media.fileType !== undefined) data.file_type = media.fileType;
  if (media.mimeType !== undefined) data.mime_type = media.mimeType || null;
  if (media.fileSize !== undefined) data.file_size = media.fileSize || null;
  if (media.width !== undefined) data.width = media.width || null;
  if (media.height !== undefined) data.height = media.height || null;
  if (media.altText !== undefined) data.alt_text = media.altText || null;
  if (media.title !== undefined) data.title = media.title || null;
  if (media.description !== undefined) data.description = media.description || null;
  if (uploadedBy !== undefined) data.uploaded_by = uploadedBy || null;
  if (media.folderPath !== undefined) data.folder_path = media.folderPath || '/';
  
  return data;
};




