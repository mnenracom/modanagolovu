import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload, X, Image as ImageIcon } from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import { Media } from '@/types/mediaSupabase';
import { useToast } from '@/hooks/use-toast';
import { ImageCropper } from './ImageCropper';

interface MediaSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  fileType?: 'image' | 'video' | 'document' | 'all';
}

export const MediaSelector = ({ open, onOpenChange, onSelect, fileType = 'image' }: MediaSelectorProps) => {
  const { toast } = useToast();
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open, fileType]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        loadMedia();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const data = await mediaService.getAll({
        fileType: fileType !== 'all' ? fileType : undefined,
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

    if (file.type.startsWith('image/')) {
      setImageToCrop(file);
      setCropperOpen(true);
    } else {
      handleUpload(file);
    }
  };

  const handleCropComplete = async (croppedImage: string, croppedFile: File) => {
    try {
      setUploading(true);
      await handleUpload(croppedFile);
    } catch (error: any) {
      console.error('Ошибка загрузки файла:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setCropperOpen(false);
      setImageToCrop(null);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const uploaded = await mediaService.uploadFile(file, '/articles', {
        altText: file.name,
        title: file.name,
      });
      toast({
        title: 'Успешно',
        description: 'Файл загружен',
      });
      await loadMedia();
      // Автоматически выбираем загруженный файл
      onSelect(uploaded.fileUrl);
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

  const handleSelect = (url: string) => {
    onSelect(url);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Выбрать медиа-файл</DialogTitle>
            <DialogDescription>
              Выберите файл из библиотеки или загрузите новый
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Поиск и загрузка */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Input
                  type="file"
                  accept={fileType === 'image' ? 'image/*' : fileType === 'video' ? 'video/*' : '*'}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id="media-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('media-upload')?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Загрузка...' : 'Загрузить'}
                </Button>
              </div>
            </div>

            {/* Сетка медиа */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : media.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Медиа-файлы не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="relative group cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    onClick={() => handleSelect(item.fileUrl)}
                  >
                    {item.fileType === 'image' ? (
                      <img
                        src={item.fileUrl}
                        alt={item.altText || item.fileName}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                        Выбрать
                      </span>
                    </div>
                    <div className="p-1">
                      <p className="text-xs truncate" title={item.fileName}>
                        {item.fileName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={undefined}
      />
    </>
  );
};

