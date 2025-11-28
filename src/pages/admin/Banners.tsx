import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { BannerForm } from '@/components/admin/BannerForm';
import { bannersService } from '@/services/bannersService';
import { transformBannerFromSupabase, transformBannerToSupabase } from '@/types/bannerSupabase';
import { Banner } from '@/types/bannerSupabase';

const Banners = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await bannersService.getAll();
      const transformed = data.map(transformBannerFromSupabase);
      setBanners(transformed);
    } catch (error: any) {
      console.error('Ошибка загрузки баннеров:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить баннеры',
        variant: 'destructive',
      });
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот баннер?')) return;

    try {
      await bannersService.delete(parseInt(id));
      toast({
        title: 'Успешно',
        description: 'Баннер удален',
      });
      await loadBanners();
    } catch (error: any) {
      console.error('Ошибка удаления баннера:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить баннер',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await bannersService.update(parseInt(banner.id), {
        ...banner,
        isActive: !banner.isActive,
      });
      toast({
        title: 'Успешно',
        description: `Баннер ${banner.isActive ? 'деактивирован' : 'активирован'}`,
      });
      await loadBanners();
    } catch (error: any) {
      console.error('Ошибка обновления баннера:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить баннер',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      // Загружаем изображение для ПК, если есть новый файл
      let imageUrl = data.imageUrl;
      if (data.imageFile) {
        imageUrl = await bannersService.uploadImage(
          data.imageFile,
          editingBanner ? parseInt(editingBanner.id) : undefined
        );
      }

      // Загружаем мобильное изображение, если есть новый файл
      let mobileImageUrl = data.mobileImageUrl;
      if (data.mobileImageFile) {
        mobileImageUrl = await bannersService.uploadImage(
          data.mobileImageFile,
          editingBanner ? parseInt(editingBanner.id) : undefined
        );
      }

      const bannerData = {
        ...data,
        imageUrl,
        mobileImageUrl: mobileImageUrl || null,
      };

      if (editingBanner) {
        await bannersService.update(parseInt(editingBanner.id), bannerData);
        toast({
          title: 'Успешно',
          description: 'Баннер обновлен',
        });
      } else {
        await bannersService.create(bannerData);
        toast({
          title: 'Успешно',
          description: 'Баннер создан',
        });
      }

      setIsDialogOpen(false);
      setEditingBanner(null);
      await loadBanners();
    } catch (error: any) {
      console.error('Ошибка сохранения баннера:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить баннер',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setEditingBanner(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Баннеры</h1>
          <p className="text-muted-foreground mt-1">
            Управление баннерами главной страницы
          </p>
        </div>
        <Button onClick={() => {
          setEditingBanner(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить баннер
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Нет баннеров</p>
            <Button onClick={() => {
              setEditingBanner(null);
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первый баннер
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <Card key={banner.id} className="overflow-hidden">
              <div className="relative aspect-[2.4/1] overflow-hidden bg-muted">
                <img
                  src={banner.imageUrl}
                  alt={banner.title || 'Баннер'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                    {banner.isActive ? (
                      <Eye className="h-3 w-3 mr-1" />
                    ) : (
                      <EyeOff className="h-3 w-3 mr-1" />
                    )}
                    {banner.isActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <h3 className="font-semibold text-lg truncate">
                      {banner.title || 'Без заголовка'}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Порядок: {banner.orderIndex}</span>
                    {banner.buttonText && (
                      <Badge variant="outline">{banner.buttonText}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(banner)}
                  >
                    {banner.isActive ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Деактивировать
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Активировать
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(banner)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(banner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? 'Редактировать баннер' : 'Добавить баннер'}
            </DialogTitle>
          </DialogHeader>
          <BannerForm
            banner={editingBanner}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Banners;





