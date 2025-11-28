import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Trash2, Crop } from 'lucide-react';
import { Category } from '@/types/categorySupabase';
import { categoriesService } from '@/services/categoriesService';
import { ImageCropper } from './ImageCropper';
import { ImageUploadGuidelines } from './ImageUploadGuidelines';

interface CategoryFormProps {
  category?: Category | null;
  categories?: Category[]; // Для выбора родительской категории
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const CategoryForm = ({ category, categories = [], onSubmit, onCancel }: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    parent_id: category?.parentId ? parseInt(category.parentId) : null,
    description: category?.description || '',
    image: category?.image || '',
    order_index: category?.orderIndex || 0,
    is_active: category?.isActive ?? true,
    show_on_homepage: category?.showOnHomepage ?? false,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(formData.image || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для кадрирования
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);

  // Генерируем slug из названия автоматически
  useEffect(() => {
    if (!category && formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, category]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер (макс 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB');
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
    setImageFile(croppedImage);
    
    // Создаем preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(croppedImage);
    
    setCropperOpen(false);
    setImageToCrop(null);
  };

  const handleCropExisting = () => {
    if (imageFile) {
      setImageToCrop(imageFile);
      setCropperOpen(true);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image && category) {
      try {
        await categoriesService.deleteImage(formData.image);
      } catch (error) {
        console.error('Ошибка удаления изображения:', error);
      }
    }
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Введите название категории');
      return;
    }

    if (!formData.slug.trim()) {
      alert('Введите slug категории');
      return;
    }

    try {
      setUploading(true);

      // Загружаем изображение, если оно выбрано
      let imageUrl = formData.image;
      if (imageFile) {
        imageUrl = await categoriesService.uploadImage(imageFile, category?.id ? parseInt(category.id) : undefined);
      }

      // Подготавливаем данные для отправки
      const submitData = {
        ...formData,
        image: imageUrl,
      };

      onSubmit(submitData);
    } catch (error: any) {
      console.error('Ошибка при сохранении категории:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Фильтруем категории, исключая текущую (чтобы не было циклических ссылок)
  const availableParentCategories = categories.filter(c => c.id !== category?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{category ? 'Редактировать категорию' : 'Добавить категорию'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Название */}
          <div>
            <Label htmlFor="name" className="mb-2 block">Название категории *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Колпаки"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor="slug" className="mb-2 block">Slug (URL) *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="Например: kolpaki"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Используется в URL. Только латинские буквы, цифры и дефисы
            </p>
          </div>

          {/* Родительская категория */}
          {availableParentCategories.length > 0 && (
            <div>
              <Label htmlFor="parent_id" className="mb-2 block">Родительская категория</Label>
              <select
                id="parent_id"
                value={formData.parent_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="">Без родительской категории</option>
                {availableParentCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Описание */}
          <div>
            <Label htmlFor="description" className="mb-2 block">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание категории"
              rows={4}
            />
          </div>

          {/* Порядок сортировки */}
          <div>
            <Label htmlFor="order_index" className="mb-2 block">Порядок сортировки</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Категории с меньшим числом будут отображаться первыми
            </p>
          </div>

          {/* Активность */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Активна</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Показывать на главной странице */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show_on_homepage">Показывать на главной странице</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Эта категория будет отображаться в блоке "Категории товаров" на главной странице
              </p>
            </div>
            <Switch
              id="show_on_homepage"
              checked={formData.show_on_homepage}
              onCheckedChange={(checked) => setFormData({ ...formData, show_on_homepage: checked })}
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
          {uploading ? 'Сохранение...' : category ? 'Сохранить изменения' : 'Создать категорию'}
        </Button>
      </div>

      {/* Модальное окно кадрирования */}
      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={4 / 3} // Соотношение для категорий
      />
    </form>
  );
};

export default CategoryForm;


