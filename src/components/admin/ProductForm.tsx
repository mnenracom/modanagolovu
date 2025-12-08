import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload, Trash2, Crop } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Product, PriceRange, ProductVariation } from '@/types/product';
import { ImageCropper } from './ImageCropper';
import { ImageUploadGuidelines } from './ImageUploadGuidelines';
import { categoriesService } from '@/services/categoriesService';
import { transformCategoryFromSupabase } from '@/types/categorySupabase';
import { Category } from '@/types/categorySupabase';

interface ProductFormProps {
  product?: Product | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ProductForm = ({ product, onSubmit, onCancel }: ProductFormProps) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || 'scarves',
    subcategory: product?.subcategory || '',
    material: product?.material || '',
    sku: product?.sku || '',
    article: product?.article || '', // Внутренний артикул товара
    wbNmId: product?.wbNmId || '',
    ozonProductId: product?.ozonProductId || '',
    ozonOfferId: product?.ozonOfferId || '',
    stock: product?.stock || 0,
    inStock: product?.inStock ?? true,
    show_in_new_products: (product as any)?.showInNewProducts ?? false,
    show_in_bestsellers: (product as any)?.showInBestsellers ?? false,
    discount: product?.discount || 0,
    // Цена
    retail_price: product?.retailPrice ?? product?.price ?? 0,
    // Для обратной совместимости
    price: product?.retailPrice ?? product?.price ?? 0,
    min_order_quantity: 1, // Розница - можно купить от 1 шт
    images: product?.images || [],
    colors: product?.colors || [],
    sizes: product?.sizes || [],
    priceRanges: product?.priceRanges || [{ minQuantity: 1, maxQuantity: null, price: product?.retailPrice ?? product?.price ?? 0 }],
    variations: product?.variations || [],
    // Поля для веса и габаритов
    weight_grams: product?.weightGrams || '',
    length_cm: product?.lengthCm || '',
    width_cm: product?.widthCm || '',
    height_cm: product?.heightCm || '',
  });

  // Состояние для ошибок валидации
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [newColor, setNewColor] = useState('');
  const [newSize, setNewSize] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]); // Временные preview для новых файлов
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Состояние для кадрирования
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null); // Индекс для замены существующего файла

  // Состояние для drag-and-drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Объединенный массив для отображения (существующие + preview)
  const displayImages = [...formData.images, ...previewImages];

  // Загружаем категории из Supabase
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await categoriesService.getAll();
        const transformed = data.map(transformCategoryFromSupabase);
        setCategories(transformed);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        // Fallback на пустой массив
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleAddColor = () => {
    if (newColor && !formData.colors.includes(newColor)) {
      setFormData({
        ...formData,
        colors: [...formData.colors, newColor],
      });
      setNewColor('');
    }
  };

  const handleRemoveColor = (color: string) => {
    setFormData({
      ...formData,
      colors: formData.colors.filter((c) => c !== color),
    });
  };

  const handleAddSize = () => {
    if (newSize && !formData.sizes.includes(newSize)) {
      setFormData({
        ...formData,
        sizes: [...formData.sizes, newSize],
      });
      setNewSize('');
    }
  };

  const handleRemoveSize = (size: string) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((s) => s !== size),
    });
  };


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Берем первое изображение для кадрирования
    const firstFile = files[0];
    setImageToCrop(firstFile);
    setCroppingIndex(null); // Новое изображение
    setCropperOpen(true);
    
    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: File) => {
    if (croppingIndex !== null) {
      // Заменяем существующий файл
      const newImageFiles = [...imageFiles];
      newImageFiles[croppingIndex] = croppedImage;
      setImageFiles(newImageFiles);
      
      // Обновляем preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newPreviewImages = [...previewImages];
        newPreviewImages[croppingIndex] = result;
        setPreviewImages(newPreviewImages);
      };
      reader.readAsDataURL(croppedImage);
    } else {
      // Добавляем новое изображение
      const newImageFiles = [...imageFiles, croppedImage];
      setImageFiles(newImageFiles);
      
      // Создаем preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImages(prev => [...prev, result]);
      };
      reader.readAsDataURL(croppedImage);
    }
    
    setCropperOpen(false);
    setImageToCrop(null);
    setCroppingIndex(null);
  };

  const handleCropExisting = (index: number) => {
    // Определяем, это существующее изображение или preview
    const totalExisting = formData.images.length;
    
    if (index < totalExisting) {
      // Для существующих изображений нельзя кадрировать (они уже загружены)
      alert('Для кадрирования существующего изображения сначала удалите его и загрузите заново');
      return;
    }
    
    // Для preview - получаем соответствующий файл
    const previewIndex = index - totalExisting;
    if (previewIndex >= 0 && previewIndex < imageFiles.length) {
      setImageToCrop(imageFiles[previewIndex]);
      setCroppingIndex(previewIndex);
      setCropperOpen(true);
    }
  };

  const handleRemoveImage = (index: number) => {
    // Определяем, является ли это существующим изображением или preview
    const totalExisting = formData.images.length;
    
    if (index < totalExisting) {
      // Удаляем существующее изображение (URL)
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        images: newImages,
      });
    } else {
      // Удаляем preview и соответствующий файл
      const previewIndex = index - totalExisting;
      const newPreviewImages = previewImages.filter((_, i) => i !== previewIndex);
      const newImageFiles = imageFiles.filter((_, i) => i !== previewIndex);
      setPreviewImages(newPreviewImages);
      setImageFiles(newImageFiles);
    }
  };

  // Функции для drag-and-drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const totalExisting = formData.images.length;
    
    if (draggedIndex < totalExisting && dropIndex < totalExisting) {
      // Перемещаем существующие изображения
      const newImages = [...formData.images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, removed);
      setFormData({
        ...formData,
        images: newImages,
      });
    } else if (draggedIndex >= totalExisting && dropIndex >= totalExisting) {
      // Перемещаем preview изображения
      const draggedPreviewIndex = draggedIndex - totalExisting;
      const dropPreviewIndex = dropIndex - totalExisting;
      const newPreviewImages = [...previewImages];
      const newImageFiles = [...imageFiles];
      const [removedPreview] = newPreviewImages.splice(draggedPreviewIndex, 1);
      const [removedFile] = newImageFiles.splice(draggedPreviewIndex, 1);
      newPreviewImages.splice(dropPreviewIndex, 0, removedPreview);
      newImageFiles.splice(dropPreviewIndex, 0, removedFile);
      setPreviewImages(newPreviewImages);
      setImageFiles(newImageFiles);
    }
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAddVariation = () => {
    setFormData({
      ...formData,
      variations: [
        ...formData.variations,
        { color: '', size: '', stock: 0, sku: '' },
      ],
    });
  };

  const handleUpdateVariation = (index: number, field: string, value: any) => {
    const updated = [...formData.variations];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variations: updated });
  };

  const handleRemoveVariation = (index: number) => {
    setFormData({
      ...formData,
      variations: formData.variations.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!formData.name.trim()) {
      setErrors({ ...errors, name: 'Название обязательно' });
      return;
    }

    if (formData.retail_price <= 0) {
      setErrors({ ...errors, retail_price: 'Цена должна быть больше 0' });
      return;
    }

    // Создаем priceRanges автоматически на основе retail_price
    const autoPriceRanges = [{
      minQuantity: 1,
      maxQuantity: null,
      price: formData.retail_price
    }];

    // Подготовка данных для отправки
    onSubmit({
      ...formData,
      price: formData.retail_price, // Для обратной совместимости
      retail_price: formData.retail_price,
      priceRanges: autoPriceRanges, // Автоматически создаем на основе розничной цены
      imageFiles,
      // Преобразуем пустые строки в null для веса и габаритов
      weight_grams: formData.weight_grams === '' ? null : (formData.weight_grams ? parseInt(String(formData.weight_grams)) : null),
      length_cm: formData.length_cm === '' ? null : (formData.length_cm ? parseFloat(String(formData.length_cm)) : null),
      width_cm: formData.width_cm === '' ? null : (formData.width_cm ? parseFloat(String(formData.width_cm)) : null),
      height_cm: formData.height_cm === '' ? null : (formData.height_cm ? parseFloat(String(formData.height_cm)) : null),
    });
  };

  const selectedCategory = categories.find((c) => c.slug === formData.category || String(c.id) === formData.category);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[90vh] overflow-y-auto">
      {/* Основная информация */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="mb-2">Название товара *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="mb-2">Описание *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category" className="mb-2">Категория *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as any, subcategory: '' })}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>Загрузка...</SelectItem>
                  ) : categories.length === 0 ? (
                    <SelectItem value="no-categories" disabled>Нет категорий</SelectItem>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id || cat.slug} value={cat.slug || String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="subcategory" className="mb-2">Подкатегория</Label>
                <Select
                  value={formData.subcategory}
                  onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подкатегорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="material" className="mb-2">Материал *</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="article" className="mb-2">Артикул (внутренний)</Label>
              <Input
                id="article"
                value={formData.article}
                onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                placeholder="Например: КБР5315"
              />
              <p className="text-xs text-muted-foreground">
                Внутренний артикул товара для удобства идентификации
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku" className="mb-2">SKU (nmId с маркетплейсов)</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Номенклатура ID с маркетплейсов"
              />
              <p className="text-xs text-muted-foreground">
                SKU содержит nmId с WildBerries или другой идентификатор с маркетплейсов
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wb_nm_id" className="mb-2">
                WB nmId (для контроля цен и отзывов)
                <span className="text-xs text-muted-foreground ml-2">
                  Номенклатурный ID с WildBerries. Нужен для проверки и обновления цен. Можно найти в личном кабинете WB или получить через синхронизацию.
                </span>
              </Label>
              <Input
                id="wb_nm_id"
                value={formData.wbNmId}
                onChange={(e) => setFormData({ ...formData, wbNmId: e.target.value })}
                placeholder="Номенклатура ID на WildBerries"
              />
              <p className="text-xs text-muted-foreground">
                Нужен для проверки и автоматического обновления цен на WildBerries. Если не заполнен автоматически при синхронизации, укажите вручную из личного кабинета WB.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ozon_product_id" className="mb-2">OZON Product ID (для отзывов)</Label>
              <Input
                id="ozon_product_id"
                value={formData.ozonProductId}
                onChange={(e) => setFormData({ ...formData, ozonProductId: e.target.value })}
                placeholder="Product ID на OZON"
              />
              <p className="text-xs text-muted-foreground">
                ID товара на OZON для синхронизации отзывов
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ozon_offer_id" className="mb-2">OZON Offer ID (артикул продавца)</Label>
              <Input
                id="ozon_offer_id"
                value={formData.ozonOfferId}
                onChange={(e) => setFormData({ ...formData, ozonOfferId: e.target.value })}
                placeholder="Offer ID (артикул продавца) на OZON"
              />
              <p className="text-xs text-muted-foreground">
                Артикул продавца на OZON (опционально)
              </p>
            </div>
          </div>

          {/* Вес и габариты */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Вес и габариты (для расчета доставки)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="weight_grams" className="mb-2">Вес (граммы)</Label>
                <Input
                  id="weight_grams"
                  type="number"
                  value={formData.weight_grams === '' ? '' : formData.weight_grams}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseInt(e.target.value);
                    setFormData({ ...formData, weight_grams: value });
                  }}
                  placeholder="Например: 100"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-muted-foreground">
                  Вес товара в граммах (для расчета стоимости доставки)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="length_cm" className="mb-2">Длина (см)</Label>
                <Input
                  id="length_cm"
                  type="number"
                  value={formData.length_cm === '' ? '' : formData.length_cm}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setFormData({ ...formData, length_cm: value });
                  }}
                  placeholder="Например: 72"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Длина товара в сантиметрах
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="width_cm" className="mb-2">Ширина (см)</Label>
                <Input
                  id="width_cm"
                  type="number"
                  value={formData.width_cm === '' ? '' : formData.width_cm}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setFormData({ ...formData, width_cm: value });
                  }}
                  placeholder="Например: 72"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Ширина товара в сантиметрах
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="height_cm" className="mb-2">Высота (см)</Label>
                <Input
                  id="height_cm"
                  type="number"
                  value={formData.height_cm === '' ? '' : formData.height_cm}
                  onChange={(e) => {
                    const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setFormData({ ...formData, height_cm: value });
                  }}
                  placeholder="Например: 1"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Высота товара в сантиметрах
                </p>
              </div>
            </div>
          </div>

          {/* Розничная цена */}
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="retail_price" className="mb-2">
                  Розничная цена (₽) *
                </Label>
                <Input
                  id="retail_price"
                  type="number"
                  value={formData.retail_price === 0 ? '' : formData.retail_price}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Разрешаем пустую строку для очистки поля
                    if (inputValue === '') {
                      setFormData({ ...formData, retail_price: 0, price: 0 });
                      return;
                    }
                    const value = parseFloat(inputValue);
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, retail_price: value, price: value });
                      // Валидация
                      if (value <= 0) {
                        setErrors({ ...errors, retail_price: 'Цена должна быть больше 0' });
                      } else {
                        const newErrors = { ...errors };
                        delete newErrors.retail_price;
                        setErrors(newErrors);
                      }
                    }
                  }}
                  min="0"
                  step="0.01"
                  required
                  className={errors.retail_price ? 'border-destructive' : ''}
                />
                {errors.retail_price && (
                  <p className="text-sm text-destructive">{errors.retail_price}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Оптовые скидки настраиваются в разделе "Настройки" → "Заказы" → "Градации оптовых цен"
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Изображения */}
      <Card>
        <CardHeader>
          <CardTitle>Изображения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {displayImages.map((img, index) => {
              const totalExisting = formData.images.length;
              const isExisting = index < totalExisting;
              const previewIndex = index - totalExisting;
              const canCrop = !isExisting && previewIndex >= 0 && previewIndex < imageFiles.length;
              
              return (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group cursor-move ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded z-10">
                    {index + 1}
                  </div>
                  <img 
                    src={img} 
                    alt={`Preview ${index}`} 
                    className="w-24 aspect-[3/4] object-cover rounded-lg border"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    {canCrop && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCropExisting(index)}
                        title="Кадрировать"
                      >
                        <Crop className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 z-10 shadow-lg"
                    onClick={() => handleRemoveImage(index)}
                    title="Удалить"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
          {displayImages.length > 0 && (
            <p className="text-sm text-muted-foreground">
              💡 Перетащите изображения для изменения порядка. Первое изображение будет главным фото товара.
            </p>
          )}
          <div className="space-y-4">
            <ImageUploadGuidelines
              guidelines={{
                width: 1200,
                height: 1600,
                aspectRatio: 0.75,
                widthMm: 424,
                heightMm: 565,
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
                description: 'Вертикальные изображения товаров (соотношение 3:4) отображаются лучше всего. Используйте высокое качество для детального просмотра.',
                maxFileSizeMB: 5,
                recommendedFormat: 'JPG, PNG, WebP',
                dpi: 72,
              }}
              title="Рекомендации для изображений товаров"
              variant="default"
            />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Загрузить изображения
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Цвета и размеры */}
      <Card>
        <CardHeader>
          <CardTitle>Цвета и размеры</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label className="mb-2">Цвета</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {formData.colors.map((color) => (
                <Badge key={color} variant="secondary" className="flex items-center gap-1">
                  {color}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveColor(color)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Добавить цвет"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddColor())}
              />
              <Button type="button" onClick={handleAddColor}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="mb-2">Размеры</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {formData.sizes.map((size) => (
                <Badge key={size} variant="secondary" className="flex items-center gap-1">
                  {size}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveSize(size)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Добавить размер"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSize())}
              />
              <Button type="button" onClick={handleAddSize}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Скидки */}
      <Card>
        <CardHeader>
          <CardTitle>Скидки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="discount" className="mb-2">Скидка (%)</Label>
            <Input
              id="discount"
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
              min="0"
              max="100"
              step="0.1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Остатки на складе */}
      <Card>
        <CardHeader>
          <CardTitle>Остатки на складе</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="stock" className="mb-2">Общий остаток</Label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="inStock">В наличии</Label>
            <Switch
              id="inStock"
              checked={formData.inStock}
              onCheckedChange={(checked) => setFormData({ ...formData, inStock: checked })}
            />
          </div>

          {/* Показывать в новинках */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show_in_new_products">Показывать в новинках</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Этот товар будет отображаться в секции "НОВИНКИ" на главной странице
              </p>
            </div>
            <Switch
              id="show_in_new_products"
              checked={formData.show_in_new_products}
              onCheckedChange={(checked) => setFormData({ ...formData, show_in_new_products: checked })}
            />
          </div>

          {/* Показывать в хитах продаж */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show_in_bestsellers">Показывать в хитах продаж</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Этот товар будет отображаться в секции "ХИТЫ ПРОДАЖ" на главной странице
              </p>
            </div>
            <Switch
              id="show_in_bestsellers"
              checked={formData.show_in_bestsellers}
              onCheckedChange={(checked) => setFormData({ ...formData, show_in_bestsellers: checked })}
            />
          </div>

          {/* Вариации с остатками */}
          <div className="space-y-2">
            <Label className="mb-2 block">Вариации с остатками</Label>
            {formData.variations.map((variation, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 p-3 border rounded-lg">
                <Input
                  placeholder="Цвет"
                  value={variation.color || ''}
                  onChange={(e) =>
                    handleUpdateVariation(index, 'color', e.target.value)
                  }
                />
                <Input
                  placeholder="Размер"
                  value={variation.size || ''}
                  onChange={(e) =>
                    handleUpdateVariation(index, 'size', e.target.value)
                  }
                />
                <Input
                  placeholder="SKU"
                  value={variation.sku || ''}
                  onChange={(e) =>
                    handleUpdateVariation(index, 'sku', e.target.value)
                  }
                />
                <Input
                  type="number"
                  placeholder="Остаток"
                  value={variation.stock}
                  onChange={(e) =>
                    handleUpdateVariation(index, 'stock', parseInt(e.target.value) || 0)
                  }
                  min="0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVariation(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddVariation}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить вариацию
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {product ? 'Сохранить изменения' : 'Создать товар'}
        </Button>
      </div>

      {/* Модальное окно кадрирования */}
      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
          setCroppingIndex(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={3/4} // Вертикальное соотношение 3:4 для товаров
      />
    </form>
  );
};

export default ProductForm;

