import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, Eye, Tag } from 'lucide-react';
import { Article, ArticleCategory } from '@/types/articleSupabase';
import { articleCategoriesService } from '@/services/articleCategoriesService';
import { ImageCropper } from './ImageCropper';
import { mediaService } from '@/services/mediaService';
import { MediaSelector } from './MediaSelector';
import { ImageUploadGuidelines } from './ImageUploadGuidelines';
import { FolderOpen } from 'lucide-react';

interface ArticleFormProps {
  article?: Article | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ArticleForm = ({ article, onSubmit, onCancel }: ArticleFormProps) => {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    content: article?.content || '',
    featuredImageUrl: article?.featuredImageUrl || '',
    categoryId: article?.categoryId ? parseInt(article.categoryId) : null,
    authorName: article?.authorName || '',
    
    // SEO
    metaTitle: article?.metaTitle || '',
    metaDescription: article?.metaDescription || '',
    metaKeywords: article?.metaKeywords || '',
    ogImageUrl: article?.ogImageUrl || '',
    ogTitle: article?.ogTitle || '',
    ogDescription: article?.ogDescription || '',
    
    // Статус
    status: article?.status || 'draft' as 'draft' | 'published' | 'archived',
    publishedAt: article?.publishedAt || '',
    isFeatured: article?.isFeatured || false,
    allowComments: article?.allowComments ?? true,
    tags: article?.tags || [] as string[],
  });

  const [newTag, setNewTag] = useState('');
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string>('');
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<File | null>(null);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    if (article?.featuredImageUrl) {
      setFeaturedImagePreview(article.featuredImageUrl);
    }
  }, [article]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await articleCategoriesService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Генерация slug из title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (value: string) => {
    setFormData({ ...formData, title: value });
    // Автоматически генерируем slug, если он пустой
    if (!formData.slug || formData.slug === generateSlug(article?.title || '')) {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageToCrop(file);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    try {
      // Загружаем в медиа-библиотеку
      const media = await mediaService.uploadFile(croppedFile, '/articles', {
        altText: formData.title || 'Изображение статьи',
        title: formData.title || 'Изображение статьи',
      });
      
      setFormData({ ...formData, featuredImageUrl: media.fileUrl });
      setFeaturedImagePreview(media.fileUrl);
      setFeaturedImageFile(null);
      setCropperOpen(false);
      setImageToCrop(null);
    } catch (error: any) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Ошибка загрузки изображения: ' + (error.message || 'Неизвестная ошибка'));
      setCropperOpen(false);
      setImageToCrop(null);
    }
  };

  const handleSelectFromMedia = (url: string) => {
    setFormData({ ...formData, featuredImageUrl: url });
    setFeaturedImagePreview(url);
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, featuredImageUrl: '' });
    setFeaturedImagePreview('');
    setFeaturedImageFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      publishedAt: formData.status === 'published' && !formData.publishedAt 
        ? new Date().toISOString() 
        : formData.publishedAt || undefined,
    };
    
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Контент</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
          <TabsTrigger value="media">Медиа</TabsTrigger>
        </TabsList>

        {/* Контент */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="mb-2 block">Заголовок *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  placeholder="Введите заголовок статьи"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="mb-2 block">URL (slug) *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                  placeholder="url-stati"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Используется в URL статьи. Только латинские буквы, цифры и дефисы.
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt" className="mb-2 block">Краткое описание</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                  placeholder="Краткое описание статьи для превью"
                />
              </div>

              <div>
                <Label htmlFor="content" className="mb-2 block">Содержание *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  required
                  placeholder="Полный текст статьи"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Поддерживается HTML разметка
                </p>
              </div>

              <div>
                <Label htmlFor="categoryId" className="mb-2 block">Категория</Label>
                <Select
                  value={formData.categoryId?.toString() || 'all'}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value === 'all' ? null : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Без категории</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="authorName" className="mb-2 block">Имя автора</Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  placeholder="Имя автора"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO настройки</CardTitle>
              <CardDescription>
                Настройки для поисковых систем и социальных сетей
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle" className="mb-2 block">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder={formData.title || 'Заголовок для поисковых систем'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Рекомендуемая длина: 50-60 символов
                </p>
              </div>

              <div>
                <Label htmlFor="metaDescription" className="mb-2 block">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                  rows={3}
                  placeholder={formData.excerpt || 'Описание для поисковых систем'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Рекомендуемая длина: 150-160 символов
                </p>
              </div>

              <div>
                <Label htmlFor="metaKeywords" className="mb-2 block">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={(e) => setFormData({ ...formData, metaKeywords: e.target.value })}
                  placeholder="ключевое слово 1, ключевое слово 2, ключевое слово 3"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Разделяйте ключевые слова запятыми
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Open Graph (для социальных сетей)</h3>
                
                <div>
                  <Label htmlFor="ogTitle" className="mb-2 block">OG Title</Label>
                  <Input
                    id="ogTitle"
                    value={formData.ogTitle}
                    onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                    placeholder={formData.title || 'Заголовок для социальных сетей'}
                  />
                </div>

                <div>
                  <Label htmlFor="ogDescription" className="mb-2 block">OG Description</Label>
                  <Textarea
                    id="ogDescription"
                    value={formData.ogDescription}
                    onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                    rows={3}
                    placeholder={formData.excerpt || 'Описание для социальных сетей'}
                  />
                </div>

                <div>
                  <Label htmlFor="ogImageUrl" className="mb-2 block">OG Image URL</Label>
                  <Input
                    id="ogImageUrl"
                    value={formData.ogImageUrl}
                    onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
                    placeholder={formData.featuredImageUrl || 'URL изображения для социальных сетей'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Рекомендуемый размер: 1200x630px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Настройки */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки публикации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status" className="mb-2 block">Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="published">Опубликовано</SelectItem>
                    <SelectItem value="archived">Архив</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'published' && (
                <div>
                  <Label htmlFor="publishedAt" className="mb-2 block">Дата публикации</Label>
                  <Input
                    id="publishedAt"
                    type="datetime-local"
                    value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isFeatured">Избранная статья</Label>
                  <p className="text-xs text-muted-foreground">
                    Показывать в избранных статьях на главной странице
                  </p>
                </div>
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowComments">Разрешить комментарии</Label>
                  <p className="text-xs text-muted-foreground">
                    Позволить пользователям оставлять комментарии
                  </p>
                </div>
                <Switch
                  id="allowComments"
                  checked={formData.allowComments}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowComments: checked })}
                />
              </div>

              <div>
                <Label htmlFor="tags" className="mb-2 block">Теги</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Добавить тег"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Добавить
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Медиа */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Главное изображение</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredImagePreview && (
                <div className="relative">
                  <img
                    src={featuredImagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!featuredImagePreview && (
                <div className="space-y-4">
                  <ImageUploadGuidelines
                    guidelines={{
                      width: 1920,
                      height: 1080,
                      aspectRatio: 16 / 9,
                      widthMm: 678,
                      heightMm: 381,
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
                      description: 'Изображения статей отображаются в блоге. Используйте соотношение 16:9 для лучшего отображения на всех устройствах.',
                      maxFileSizeMB: 5,
                      recommendedFormat: 'JPG, PNG, WebP',
                      dpi: 72,
                    }}
                    title="Рекомендации для изображений статей"
                    variant="default"
                  />
                  <div>
                    <Label htmlFor="featuredImage" className="mb-2 block">Загрузить новое изображение</Label>
                    <Input
                      id="featuredImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t"></div>
                    <span className="text-sm text-muted-foreground">или</span>
                    <div className="flex-1 border-t"></div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMediaSelectorOpen(true)}
                    className="w-full"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Выбрать из медиа-библиотеки
                  </Button>
                </div>
              )}

              {featuredImagePreview && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="featuredImageUrl" className="mb-2 block">URL изображения</Label>
                    <div className="flex gap-2">
                      <Input
                        id="featuredImageUrl"
                        value={formData.featuredImageUrl}
                        onChange={(e) => {
                          setFormData({ ...formData, featuredImageUrl: e.target.value });
                          setFeaturedImagePreview(e.target.value);
                        }}
                        placeholder="https://example.com/image.jpg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMediaSelectorOpen(true)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">Или загрузить новое</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Media Selector */}
      <MediaSelector
        open={mediaSelectorOpen}
        onOpenChange={setMediaSelectorOpen}
        onSelect={handleSelectFromMedia}
        fileType="image"
      />

      {/* Image Cropper */}
      <ImageCropper
        image={imageToCrop}
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setImageToCrop(null);
        }}
        onCropComplete={handleCropComplete}
        aspectRatio={16 / 9}
      />

      {/* Кнопки */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">
          {article ? 'Сохранить изменения' : 'Создать статью'}
        </Button>
      </div>
    </form>
  );
};

export default ArticleForm;

