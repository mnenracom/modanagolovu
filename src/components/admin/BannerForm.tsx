import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Trash2, Crop, Info } from 'lucide-react';
import { Banner } from '@/types/bannerSupabase';
import { ImageCropper } from './ImageCropper';
import { ImageUploadGuidelines } from './ImageUploadGuidelines';

interface BannerFormProps {
  banner?: Banner | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const RECOMMENDED_SIZE = {
  width: 1920,
  height: 600,
  aspectRatio: 1920 / 600, // 3.2:1
};

const MOBILE_RECOMMENDED_SIZE = {
  width: 768,
  height: 400,
  aspectRatio: 768 / 400, // 1.92:1
};

export const BannerForm = ({ banner, onSubmit, onCancel }: BannerFormProps) => {
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    buttonText: banner?.buttonText || 'Смотреть каталог',
    buttonLink: banner?.buttonLink || '/catalog',
    imageUrl: banner?.imageUrl || '',
    mobileImageUrl: banner?.mobileImageUrl || '',
    orderIndex: banner?.orderIndex || 0,
    isActive: banner?.isActive ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(formData.imageUrl || '');
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [mobileImagePreview, setMobileImagePreview] = useState<string>(formData.mobileImageUrl || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для кадрирования
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [croppingForMobile, setCroppingForMobile] = useState(false);

  // Синхронизируем preview при изменении banner
  useEffect(() => {
    if (banner) {
      setImagePreview(banner.imageUrl || '');
      setMobileImagePreview(banner.mobileImageUrl || '');
    }
  }, [banner]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер (макс 10MB для баннеров)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    // Открываем редактор кадрирования
    setImageToCrop(file);
    setCropperOpen(true);
    
    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: File) => {
    if (croppingForMobile) {
      setMobileImageFile(croppedImage);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMobileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedImage);
    } else {
      setImageFile(croppedImage);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(croppedImage);
    }
    
    setCropperOpen(false);
    setImageToCrop(null);
    setCroppingForMobile(false);
  };

  const handleCropExisting = () => {
    if (imageFile) {
      setImageToCrop(imageFile);
      setCroppingForMobile(false);
      setCropperOpen(true);
    }
  };

  const handleMobileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setImageToCrop(file);
    setCroppingForMobile(true);
    setCropperOpen(true);
    
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.value = '';
    }
  };

  const handleCropMobileExisting = () => {
    if (mobileImageFile) {
      setImageToCrop(mobileImageFile);
      setCroppingForMobile(true);
      setCropperOpen(true);
    }
  };

  const handleRemoveImage = async () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMobileImage = async () => {
    setMobileImageFile(null);
    setMobileImagePreview('');
    setFormData(prev => ({ ...prev, mobileImageUrl: '' }));
    if (mobileFileInputRef.current) {
      mobileFileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.imageUrl && !imageFile) {
      alert('Пожалуйста, загрузите изображение баннера для ПК');
      return;
    }

    try {
      setUploading(true);
      
      // Передаем файлы отдельно для загрузки в родительском компоненте
      onSubmit({
        ...formData,
        imageUrl: formData.imageUrl,
        imageFile,
        mobileImageUrl: formData.mobileImageUrl,
        mobileImageFile,
      });
    } catch (error: any) {
      console.error('Ошибка при сохранении баннера:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{banner ? 'Редактировать баннер' : 'Добавить баннер'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Изображение */}
          <div>
            <Label className="mb-2 block">Изображение баннера *</Label>
            
            {/* Рекомендации по размеру */}
            <div className="mb-3">
              <ImageUploadGuidelines
                guidelines={{
                  width: RECOMMENDED_SIZE.width,
                  height: RECOMMENDED_SIZE.height,
                  aspectRatio: RECOMMENDED_SIZE.aspectRatio,
                  widthMm: 678,
                  heightMm: 212,
                  safeZone: {
                    top: 60,
                    right: 100,
                    bottom: 60,
                    left: 100,
                  },
                  safeZoneMm: {
                    top: 21,
                    right: 35,
                    bottom: 21,
                    left: 35,
                  },
                  description: 'Баннеры отображаются на главной странице. Важные элементы (текст, кнопки) размещайте в зоне безопасности.',
                  maxFileSizeMB: 10,
                  recommendedFormat: 'JPG, PNG, WebP',
                  dpi: 72,
                }}
                title="Рекомендации для баннеров (Desktop)"
                variant="default"
              />
            </div>

            <div className="space-y-4">
              {imagePreview && (
                <div className="relative w-full max-w-4xl border rounded-lg overflow-hidden group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {imageFile && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10"
                        onClick={handleCropExisting}
                        title="Кадрировать"
                      >
                        <Crop className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-10 w-10"
                      onClick={handleRemoveImage}
                      title="Удалить"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imagePreview ? 'Изменить изображение' : 'Загрузить изображение'}
                </Button>
                
                {imagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Мобильное изображение */}
          <div>
            <Label className="mb-2 block">Изображение для мобильных устройств (опционально)</Label>
            
            <div className="mb-3">
              <ImageUploadGuidelines
                guidelines={{
                  width: MOBILE_RECOMMENDED_SIZE.width,
                  height: MOBILE_RECOMMENDED_SIZE.height,
                  aspectRatio: MOBILE_RECOMMENDED_SIZE.aspectRatio,
                  widthMm: 271,
                  heightMm: 141,
                  safeZone: {
                    top: 40,
                    right: 40,
                    bottom: 40,
                    left: 40,
                  },
                  safeZoneMm: {
                    top: 14,
                    right: 14,
                    bottom: 14,
                    left: 14,
                  },
                  description: 'Мобильные баннеры отображаются на телефонах и планшетах. Если мобильное изображение не загружено, будет использоваться изображение для ПК.',
                  maxFileSizeMB: 5,
                  recommendedFormat: 'JPG, PNG, WebP',
                  dpi: 72,
                }}
                title="Рекомендации для баннеров (Mobile)"
                variant="compact"
              />
            </div>

            <div className="space-y-4">
              {mobileImagePreview && (
                <div className="relative w-full max-w-md border rounded-lg overflow-hidden group">
                  <img
                    src={mobileImagePreview}
                    alt="Mobile Preview"
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '200px' }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {mobileImageFile && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10"
                        onClick={handleCropMobileExisting}
                        title="Кадрировать"
                      >
                        <Crop className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-10 w-10"
                      onClick={handleRemoveMobileImage}
                      title="Удалить"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {mobileImagePreview ? 'Изменить мобильное изображение' : 'Загрузить мобильное изображение'}
                </Button>
                
                {mobileImagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveMobileImage}
                    disabled={uploading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                )}
              </div>
              
              <input
                ref={mobileFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMobileImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Заголовок */}
          <div>
            <Label htmlFor="title" className="mb-2 block">Заголовок</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Новая коллекция"
            />
          </div>

          {/* Подзаголовок */}
          <div>
            <Label htmlFor="subtitle" className="mb-2 block">Подзаголовок</Label>
            <Textarea
              id="subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Например: Широкий ассортимент платков, косынок, бандан и капоров для вашего бизнеса"
              rows={3}
            />
          </div>

          {/* Кнопка */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buttonText" className="mb-2 block">Текст кнопки</Label>
              <Input
                id="buttonText"
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="Смотреть каталог"
              />
            </div>
            <div>
              <Label htmlFor="buttonLink" className="mb-2 block">Ссылка кнопки</Label>
              <Input
                id="buttonLink"
                value={formData.buttonLink}
                onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                placeholder="/catalog"
              />
            </div>
          </div>

          {/* Порядок сортировки */}
          <div>
            <Label htmlFor="orderIndex" className="mb-2 block">Порядок отображения</Label>
            <Input
              id="orderIndex"
              type="number"
              value={formData.orderIndex}
              onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Баннеры с меньшим числом отображаются первыми
            </p>
          </div>

          {/* Активность */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Активен</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={uploading}>
          Отмена
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Сохранение...' : banner ? 'Сохранить изменения' : 'Создать баннер'}
        </Button>
      </div>

      {/* Модальное окно кадрирования */}
      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
          setCroppingForMobile(false);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={croppingForMobile ? MOBILE_RECOMMENDED_SIZE.aspectRatio : RECOMMENDED_SIZE.aspectRatio}
      />
    </form>
  );
};

