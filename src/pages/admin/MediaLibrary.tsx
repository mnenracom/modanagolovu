import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, Image as ImageIcon, Video, File, Trash2, Eye, X } from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import { Media } from '@/types/mediaSupabase';
import { useToast } from '@/hooks/use-toast';
import { ImageCropper } from '@/components/admin/ImageCropper';
import { ImageUploadGuidelines } from '@/components/admin/ImageUploadGuidelines';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const MediaLibrary = () => {
  const { toast } = useToast();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Media | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string>('');

  useEffect(() => {
    loadMedia();
  }, [fileTypeFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadMedia();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await mediaService.getAll({
        fileType: fileTypeFilter !== 'all' ? fileTypeFilter : undefined,
        search: searchTerm || undefined,
        limit: 50,
      });
      setMedia(data);
    } catch (error: any) {
      console.error('Ошибка загрузки медиа:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить медиа-файлы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Создаем preview для изображений
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFilePreview('');
    }
  };

  const handleConfirmUpload = () => {
    if (!selectedFile) return;

    // Если это изображение, открываем кадрирование
    if (selectedFile.type.startsWith('image/')) {
      setImageToCrop(selectedFile);
      setCropperOpen(true);
      setSelectedFile(null);
      setSelectedFilePreview('');
    } else {
      // Для других файлов загружаем напрямую
      handleUpload(selectedFile);
      setSelectedFile(null);
      setSelectedFilePreview('');
    }
  };

  const handleCropComplete = async (croppedImage: string, croppedFile: File) => {
    try {
      setUploading(true);
      await mediaService.uploadFile(croppedFile, '/');
      toast({
        title: 'Успешно',
        description: 'Файл загружен',
      });
      await loadMedia();
      setCropperOpen(false);
      setImageToCrop(null);
      setIsUploadDialogOpen(false);
    } catch (error: any) {
      console.error('Ошибка загрузки файла:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      await mediaService.uploadFile(file, '/');
      toast({
        title: 'Успешно',
        description: 'Файл загружен',
      });
      await loadMedia();
      setIsUploadDialogOpen(false);
    } catch (error: any) {
      console.error('Ошибка загрузки файла:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMedia) return;

    try {
      await mediaService.delete(parseInt(deletingMedia.id));
      toast({
        title: 'Успешно',
        description: 'Файл удален',
      });
      await loadMedia();
      setDeletingMedia(null);
    } catch (error: any) {
      console.error('Ошибка удаления файла:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить файл',
        variant: 'destructive',
      });
    }
  };

  const handleView = (mediaItem: Media) => {
    setViewingMedia(mediaItem);
    setIsViewDialogOpen(true);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'video':
        return <Video className="h-8 w-8 text-purple-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Медиа-библиотека</h1>
          <p className="text-muted-foreground">Управление медиа-файлами</p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Загрузить файл
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по названию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип файла" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="image">Изображения</SelectItem>
                <SelectItem value="video">Видео</SelectItem>
                <SelectItem value="document">Документы</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Сетка медиа */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Медиа-файлы не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  className="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleView(item)}
                >
                  {item.fileType === 'image' ? (
                    <img
                      src={item.fileUrl}
                      alt={item.altText || item.fileName}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center bg-muted">
                      {getFileIcon(item.fileType)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingMedia(item);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог загрузки */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => {
        setIsUploadDialogOpen(open);
        if (!open) {
          setSelectedFile(null);
          setSelectedFilePreview('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Загрузить файл</DialogTitle>
            <DialogDescription>
              Выберите файл для загрузки в медиа-библиотеку
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ImageUploadGuidelines
              guidelines={{
                width: 1920,
                height: 1080,
                aspectRatio: 16 / 9,
                widthMm: 678,
                heightMm: 381,
                safeZone: {
                  top: 50,
                  right: 50,
                  bottom: 50,
                  left: 50,
                },
                safeZoneMm: {
                  top: 18,
                  right: 18,
                  bottom: 18,
                  left: 18,
                },
                description: 'Универсальные рекомендации для медиа-файлов. Для изображений рекомендуется соотношение 16:9, для квадратных изображений - 1:1.',
                maxFileSizeMB: 10,
                recommendedFormat: 'JPG, PNG, WebP, MP4, PDF',
                dpi: 72,
              }}
              title="Рекомендации для медиа-файлов"
              variant="default"
            />
            <div>
              <Label htmlFor="file" className="mb-2 block">Файл</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept="image/*,video/*,application/pdf"
              />
            </div>
            
            {/* Preview выбранного файла */}
            {selectedFilePreview && (
              <div className="relative">
                <img
                  src={selectedFilePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
            
            {selectedFile && !selectedFilePreview && (
              <div className="p-4 border rounded-lg bg-muted">
                <p className="text-sm font-medium">Выбран файл: {selectedFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Размер: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {uploading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-muted-foreground">Загрузка файла...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setSelectedFile(null);
                setSelectedFilePreview('');
              }}
              disabled={uploading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={uploading || !selectedFile}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingMedia?.fileName}</DialogTitle>
            <DialogDescription>Информация о медиа-файле</DialogDescription>
          </DialogHeader>
          {viewingMedia && (
            <div className="space-y-4">
              {viewingMedia.fileType === 'image' && (
                <img
                  src={viewingMedia.fileUrl}
                  alt={viewingMedia.altText || viewingMedia.fileName}
                  className="w-full rounded-lg"
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Тип файла</Label>
                  <p className="text-sm">{viewingMedia.fileType}</p>
                </div>
                <div>
                  <Label>Размер</Label>
                  <p className="text-sm">{formatFileSize(viewingMedia.fileSize)}</p>
                </div>
                {viewingMedia.width && viewingMedia.height && (
                  <>
                    <div>
                      <Label>Ширина</Label>
                      <p className="text-sm">{viewingMedia.width}px</p>
                    </div>
                    <div>
                      <Label>Высота</Label>
                      <p className="text-sm">{viewingMedia.height}px</p>
                    </div>
                  </>
                )}
                <div>
                  <Label>Дата загрузки</Label>
                  <p className="text-sm">
                    {format(new Date(viewingMedia.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                </div>
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={viewingMedia.fileUrl}
                  readOnly
                  className="font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      {cropperOpen && imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropperOpen(false);
            setImageToCrop(null);
          }}
          aspectRatio={undefined}
        />
      )}

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deletingMedia} onOpenChange={() => setDeletingMedia(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить файл?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить файл "{deletingMedia?.fileName}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MediaLibrary;

