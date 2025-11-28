import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { deliveryServicesService } from '@/services/deliveryServicesService';
import { DeliveryService } from '@/types/delivery';
import { Plus, Trash2, Edit, Save, X, Truck, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Предустановленные службы доставки
const PRESET_SERVICES: Partial<DeliveryService>[] = [
  {
    name: 'СДЭК',
    code: 'cdek',
    description: 'Служба доставки СДЭК',
    apiUrl: 'https://api.cdek.ru',
    websiteUrl: 'https://cdek.ru',
    trackingEnabled: true,
    calculateCost: true,
  },
  {
    name: 'Почта России',
    code: 'russian_post',
    description: 'Почта России',
    apiUrl: 'https://otpravka.pochta.ru',
    websiteUrl: 'https://www.pochta.ru',
    trackingEnabled: true,
    calculateCost: true,
  },
  {
    name: 'Яндекс Доставка',
    code: 'yandex_delivery',
    description: 'Яндекс Доставка',
    apiUrl: 'https://b2b.taxi.yandex.ru',
    websiteUrl: 'https://yandex.ru/delivery',
    trackingEnabled: true,
    calculateCost: true,
  },
  {
    name: 'Boxberry',
    code: 'boxberry',
    description: 'Служба доставки Boxberry',
    apiUrl: 'https://api.boxberry.ru',
    websiteUrl: 'https://boxberry.ru',
    trackingEnabled: true,
    calculateCost: true,
  },
];

export default function DeliveryServices() {
  const [services, setServices] = useState<DeliveryService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<DeliveryService | null>(null);
  const [saving, setSaving] = useState(false);

  // Форма
  const [formData, setFormData] = useState<Partial<DeliveryService>>({
    name: '',
    code: '',
    isActive: true,
    isEnabled: true,
    trackingEnabled: true,
    calculateCost: true,
    deliveryTypes: [],
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await deliveryServicesService.getAll();
      setServices(data);
    } catch (error: any) {
      console.error('Ошибка загрузки служб доставки:', error);
      toast.error('Ошибка загрузки служб доставки');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async (preset: Partial<DeliveryService>) => {
    try {
      setSaving(true);
      await deliveryServicesService.upsert({
        ...preset,
        code: preset.code!,
        isActive: true,
        isEnabled: false, // По умолчанию отключено, нужно настроить
      } as DeliveryService);
      toast.success(`Служба "${preset.name}" добавлена. Настройте API ключи для активации.`);
      await loadServices();
    } catch (error: any) {
      console.error('Ошибка создания службы:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service: DeliveryService) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      code: service.code,
      isActive: service.isActive,
      isEnabled: service.isEnabled,
      apiKey: service.apiKey,
      apiSecret: service.apiSecret,
      accountId: service.accountId,
      senderCityId: service.senderCityId,
      senderAddress: service.senderAddress,
      apiUrl: service.apiUrl,
      webhookUrl: service.webhookUrl,
      deliveryTypes: service.deliveryTypes || [],
      calculateCost: service.calculateCost,
      defaultCost: service.defaultCost,
      freeDeliveryThreshold: service.freeDeliveryThreshold,
      trackingEnabled: service.trackingEnabled,
      trackingApiEndpoint: service.trackingApiEndpoint,
      trackingUpdateInterval: service.trackingUpdateInterval,
      statusMapping: service.statusMapping || {},
      settings: service.settings || {},
      description: service.description,
      iconUrl: service.iconUrl,
      websiteUrl: service.websiteUrl,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Заполните название и код службы');
      return;
    }

    try {
      setSaving(true);
      if (editingService) {
        await deliveryServicesService.upsert({
          ...formData,
          code: editingService.code, // Не меняем код существующей службы
        } as DeliveryService);
        toast.success('Служба доставки обновлена');
      } else {
        await deliveryServicesService.upsert({
          ...formData,
          code: formData.code!,
        } as DeliveryService);
        toast.success('Служба доставки создана');
      }
      setDialogOpen(false);
      setEditingService(null);
      setFormData({});
      await loadServices();
    } catch (error: any) {
      console.error('Ошибка сохранения службы:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту службу доставки?')) {
      return;
    }

    try {
      await deliveryServicesService.delete(id);
      toast.success('Служба доставки удалена');
      await loadServices();
    } catch (error: any) {
      console.error('Ошибка удаления службы:', error);
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  const handleToggleEnabled = async (service: DeliveryService) => {
    try {
      await deliveryServicesService.upsert({
        ...service,
        isEnabled: !service.isEnabled,
      });
      toast.success(`Служба ${!service.isEnabled ? 'включена' : 'отключена'}`);
      await loadServices();
    } catch (error: any) {
      console.error('Ошибка переключения службы:', error);
      toast.error('Ошибка переключения службы');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Службы доставки</h1>
          <p className="text-muted-foreground mt-1">
            Настройка служб доставки для отслеживания заказов
          </p>
        </div>
      </div>

      {/* Предустановленные службы */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрое добавление</CardTitle>
          <CardDescription>
            Добавьте популярные службы доставки одним кликом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_SERVICES.map((preset) => {
              const exists = services.some(s => s.code === preset.code);
              return (
                <Button
                  key={preset.code}
                  variant="outline"
                  className="flex flex-col items-start h-auto p-4"
                  onClick={() => !exists && handleCreatePreset(preset)}
                  disabled={exists || saving}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">{preset.name}</span>
                    {exists && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground text-left">
                    {preset.description}
                  </p>
                  {exists && (
                    <p className="text-xs text-green-600 mt-1">Уже добавлена</p>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Список служб */}
      <Card>
        <CardHeader>
          <CardTitle>Настроенные службы доставки</CardTitle>
          <CardDescription>
            Управление службами доставки и их настройками
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Службы доставки не настроены</p>
              <p className="text-sm text-muted-foreground mt-2">
                Используйте кнопки выше для быстрого добавления
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{service.name}</h3>
                      <Badge variant={service.isEnabled ? 'default' : 'secondary'}>
                        {service.isEnabled ? 'Включена' : 'Отключена'}
                      </Badge>
                      {service.trackingEnabled && (
                        <Badge variant="outline">Отслеживание</Badge>
                      )}
                      <span className="text-sm text-muted-foreground">({service.code})</span>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {service.apiUrl && (
                        <span>API: {service.apiUrl}</span>
                      )}
                      {service.trackingApiEndpoint && (
                        <span>Отслеживание: {service.trackingApiEndpoint}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={service.isEnabled}
                      onCheckedChange={() => handleToggleEnabled(service)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingService(null);
          setFormData({});
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Редактировать службу доставки' : 'Новая служба доставки'}
            </DialogTitle>
            <DialogDescription>
              Настройте параметры службы доставки
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="СДЭК"
                />
              </div>
              <div className="space-y-2">
                <Label>Код *</Label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="cdek"
                  disabled={!!editingService}
                />
                <p className="text-xs text-muted-foreground">Латинские буквы и подчеркивания</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание службы доставки"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL API</Label>
                <Input
                  value={formData.apiUrl || ''}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  placeholder="https://api.cdek.ru"
                />
              </div>
              <div className="space-y-2">
                <Label>Сайт службы</Label>
                <Input
                  value={formData.websiteUrl || ''}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://cdek.ru"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">API настройки</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API ключ</Label>
                  <Input
                    type="password"
                    value={formData.apiKey || ''}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Ваш API ключ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Секретный ключ</Label>
                  <Input
                    type="password"
                    value={formData.apiSecret || ''}
                    onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                    placeholder="Секретный ключ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID аккаунта</Label>
                  <Input
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    placeholder="ID аккаунта"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID города отправителя</Label>
                  <Input
                    value={formData.senderCityId || ''}
                    onChange={(e) => setFormData({ ...formData, senderCityId: e.target.value })}
                    placeholder="ID города"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Адрес отправителя</Label>
                <Textarea
                  value={formData.senderAddress || ''}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                  placeholder="Полный адрес склада отправителя"
                  rows={2}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Отслеживание</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Включить отслеживание</Label>
                    <p className="text-xs text-muted-foreground">
                      Получение статусов доставки через API
                    </p>
                  </div>
                  <Switch
                    checked={formData.trackingEnabled ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, trackingEnabled: checked })}
                  />
                </div>
                {formData.trackingEnabled && (
                  <div className="space-y-2">
                    <Label>Endpoint для отслеживания</Label>
                    <Input
                      value={formData.trackingApiEndpoint || ''}
                      onChange={(e) => setFormData({ ...formData, trackingApiEndpoint: e.target.value })}
                      placeholder="/v2/orders/{tracking_number}"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Настройки</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Рассчитывать стоимость</Label>
                    <p className="text-xs text-muted-foreground">
                      Автоматический расчет стоимости доставки
                    </p>
                  </div>
                  <Switch
                    checked={formData.calculateCost ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, calculateCost: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Стоимость по умолчанию (₽)</Label>
                    <Input
                      type="number"
                      value={formData.defaultCost || ''}
                      onChange={(e) => setFormData({ ...formData, defaultCost: parseFloat(e.target.value) || undefined })}
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Бесплатная доставка от (₽)</Label>
                    <Input
                      type="number"
                      value={formData.freeDeliveryThreshold || ''}
                      onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: parseFloat(e.target.value) || undefined })}
                      placeholder="5000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Активна</Label>
                  <p className="text-xs text-muted-foreground">
                    Служба видна в настройках
                  </p>
                </div>
                <Switch
                  checked={formData.isActive ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <Label>Включена</Label>
                  <p className="text-xs text-muted-foreground">
                    Служба доступна для выбора при оформлении заказа
                  </p>
                </div>
                <Switch
                  checked={formData.isEnabled ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.code}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




