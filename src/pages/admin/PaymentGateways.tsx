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
import { paymentGatewaysService } from '@/services/paymentGatewaysService';
import { PaymentGateway } from '@/types/delivery';
import { Plus, Trash2, Edit, Save, X, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Предустановленные платежные системы
const PRESET_GATEWAYS: Partial<PaymentGateway>[] = [
  {
    name: 'ЮKassa',
    code: 'yookassa',
    type: 'bank_card',
    displayName: 'ЮKassa (Яндекс.Касса)',
    description: 'Платежная система от Яндекса',
    apiUrl: 'https://api.yookassa.ru',
    websiteUrl: 'https://yookassa.ru',
    currencies: ['RUB'],
  },
  {
    name: 'Сбербанк',
    code: 'sberbank',
    type: 'bank_card',
    displayName: 'Сбербанк Онлайн',
    description: 'Платежи через Сбербанк',
    apiUrl: 'https://securepayments.sberbank.ru',
    websiteUrl: 'https://www.sberbank.ru',
    currencies: ['RUB'],
  },
  {
    name: 'Тинькофф',
    code: 'tinkoff',
    type: 'bank_card',
    displayName: 'Тинькофф Банк',
    description: 'Платежи через Тинькофф',
    apiUrl: 'https://securepay.tinkoff.ru',
    websiteUrl: 'https://www.tinkoff.ru',
    currencies: ['RUB'],
  },
  {
    name: 'Stripe',
    code: 'stripe',
    type: 'bank_card',
    displayName: 'Stripe',
    description: 'Международная платежная система',
    apiUrl: 'https://api.stripe.com',
    websiteUrl: 'https://stripe.com',
    currencies: ['RUB', 'USD', 'EUR'],
  },
];

export default function PaymentGateways() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [saving, setSaving] = useState(false);

  // Форма
  const [formData, setFormData] = useState<Partial<PaymentGateway>>({
    name: '',
    code: '',
    type: 'bank_card',
    isActive: true,
    isEnabled: true,
    currencies: ['RUB'],
    testMode: false,
  });

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const data = await paymentGatewaysService.getAll();
      setGateways(data);
    } catch (error: any) {
      console.error('Ошибка загрузки платежных систем:', error);
      toast.error('Ошибка загрузки платежных систем');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreset = async (preset: Partial<PaymentGateway>) => {
    try {
      setSaving(true);
      await paymentGatewaysService.upsert({
        ...preset,
        code: preset.code!,
        isActive: true,
        isEnabled: false, // По умолчанию отключено, нужно настроить
      } as PaymentGateway);
      toast.success(`Платежная система "${preset.name}" добавлена. Настройте API ключи для активации.`);
      await loadGateways();
    } catch (error: any) {
      console.error('Ошибка создания платежной системы:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (gateway: PaymentGateway) => {
    setEditingGateway(gateway);
    setFormData({
      name: gateway.name,
      code: gateway.code,
      type: gateway.type,
      isActive: gateway.isActive,
      isEnabled: gateway.isEnabled,
      apiKey: gateway.apiKey,
      secretKey: gateway.secretKey,
      shopId: gateway.shopId,
      terminalKey: gateway.terminalKey,
      apiUrl: gateway.apiUrl,
      webhookUrl: gateway.webhookUrl,
      returnUrl: gateway.returnUrl,
      failUrl: gateway.failUrl,
      minAmount: gateway.minAmount,
      maxAmount: gateway.maxAmount,
      commissionPercent: gateway.commissionPercent,
      commissionFixed: gateway.commissionFixed,
      currencies: gateway.currencies || ['RUB'],
      displayName: gateway.displayName,
      description: gateway.description,
      iconUrl: gateway.iconUrl,
      logoUrl: gateway.logoUrl,
      settings: gateway.settings || {},
      testMode: gateway.testMode,
      testApiKey: gateway.testApiKey,
      testSecretKey: gateway.testSecretKey,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      toast.error('Заполните название и код платежной системы');
      return;
    }

    try {
      setSaving(true);
      if (editingGateway) {
        await paymentGatewaysService.upsert({
          ...formData,
          code: editingGateway.code, // Не меняем код существующей системы
        } as PaymentGateway);
        toast.success('Платежная система обновлена');
      } else {
        await paymentGatewaysService.upsert({
          ...formData,
          code: formData.code!,
        } as PaymentGateway);
        toast.success('Платежная система создана');
      }
      setDialogOpen(false);
      setEditingGateway(null);
      setFormData({});
      await loadGateways();
    } catch (error: any) {
      console.error('Ошибка сохранения платежной системы:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту платежную систему?')) {
      return;
    }

    try {
      await paymentGatewaysService.delete(id);
      toast.success('Платежная система удалена');
      await loadGateways();
    } catch (error: any) {
      console.error('Ошибка удаления платежной системы:', error);
      toast.error(`Ошибка: ${error.message}`);
    }
  };

  const handleToggleEnabled = async (gateway: PaymentGateway) => {
    try {
      await paymentGatewaysService.upsert({
        ...gateway,
        isEnabled: !gateway.isEnabled,
      });
      toast.success(`Платежная система ${!gateway.isEnabled ? 'включена' : 'отключена'}`);
      await loadGateways();
    } catch (error: any) {
      console.error('Ошибка переключения платежной системы:', error);
      toast.error('Ошибка переключения платежной системы');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Платежные системы</h1>
          <p className="text-muted-foreground mt-1">
            Настройка платежных систем для приема оплат
          </p>
        </div>
      </div>

      {/* Предустановленные платежные системы */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрое добавление</CardTitle>
          <CardDescription>
            Добавьте популярные платежные системы одним кликом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_GATEWAYS.map((preset) => {
              const exists = gateways.some(g => g.code === preset.code);
              return (
                <Button
                  key={preset.code}
                  variant="outline"
                  className="flex flex-col items-start h-auto p-4"
                  onClick={() => !exists && handleCreatePreset(preset)}
                  disabled={exists || saving}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="font-medium">{preset.displayName || preset.name}</span>
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

      {/* Список платежных систем */}
      <Card>
        <CardHeader>
          <CardTitle>Настроенные платежные системы</CardTitle>
          <CardDescription>
            Управление платежными системами и их настройками
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            </div>
          ) : gateways.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Платежные системы не настроены</p>
              <p className="text-sm text-muted-foreground mt-2">
                Используйте кнопки выше для быстрого добавления
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gateways.map((gateway) => (
                <div
                  key={gateway.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{gateway.displayName || gateway.name}</h3>
                      <Badge variant={gateway.isEnabled ? 'default' : 'secondary'}>
                        {gateway.isEnabled ? 'Включена' : 'Отключена'}
                      </Badge>
                      {gateway.testMode && (
                        <Badge variant="outline">Тестовый режим</Badge>
                      )}
                      <Badge variant="outline">{gateway.type}</Badge>
                      <span className="text-sm text-muted-foreground">({gateway.code})</span>
                    </div>
                    {gateway.description && (
                      <p className="text-sm text-muted-foreground">{gateway.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {gateway.apiUrl && (
                        <span>API: {gateway.apiUrl}</span>
                      )}
                      {gateway.commissionPercent !== undefined && gateway.commissionPercent > 0 && (
                        <span>Комиссия: {gateway.commissionPercent}%</span>
                      )}
                      {gateway.currencies && gateway.currencies.length > 0 && (
                        <span>Валюты: {gateway.currencies.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={gateway.isEnabled}
                      onCheckedChange={() => handleToggleEnabled(gateway)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(gateway)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(gateway.id)}
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
          setEditingGateway(null);
          setFormData({});
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGateway ? 'Редактировать платежную систему' : 'Новая платежная система'}
            </DialogTitle>
            <DialogDescription>
              Настройте параметры платежной системы
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ЮKassa"
                />
              </div>
              <div className="space-y-2">
                <Label>Код *</Label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="yookassa"
                  disabled={!!editingGateway}
                />
                <p className="text-xs text-muted-foreground">Латинские буквы и подчеркивания</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип платежной системы *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_card">Банковская карта</SelectItem>
                    <SelectItem value="bank_transfer">Банковский перевод</SelectItem>
                    <SelectItem value="ewallet">Электронный кошелек</SelectItem>
                    <SelectItem value="crypto">Криптовалюта</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Название для отображения</Label>
                <Input
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="ЮKassa (Яндекс.Касса)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание платежной системы"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>URL API</Label>
                <Input
                  value={formData.apiUrl || ''}
                  onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                  placeholder="https://api.yookassa.ru"
                />
              </div>
              <div className="space-y-2">
                <Label>Сайт платежной системы</Label>
                <Input
                  value={formData.websiteUrl || ''}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://yookassa.ru"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">API настройки</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Публичный ключ (API Key)</Label>
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
                    value={formData.secretKey || ''}
                    onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                    placeholder="Секретный ключ"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID магазина (Shop ID)</Label>
                  <Input
                    value={formData.shopId || ''}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    placeholder="ID магазина"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ключ терминала</Label>
                  <Input
                    value={formData.terminalKey || ''}
                    onChange={(e) => setFormData({ ...formData, terminalKey: e.target.value })}
                    placeholder="Ключ терминала"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Тестовый режим</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Использовать тестовый режим</Label>
                    <p className="text-xs text-muted-foreground">
                      Для тестирования без реальных платежей
                    </p>
                  </div>
                  <Switch
                    checked={formData.testMode ?? false}
                    onCheckedChange={(checked) => setFormData({ ...formData, testMode: checked })}
                  />
                </div>
                {formData.testMode && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Тестовый API ключ</Label>
                      <Input
                        type="password"
                        value={formData.testApiKey || ''}
                        onChange={(e) => setFormData({ ...formData, testApiKey: e.target.value })}
                        placeholder="Тестовый API ключ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Тестовый секретный ключ</Label>
                      <Input
                        type="password"
                        value={formData.testSecretKey || ''}
                        onChange={(e) => setFormData({ ...formData, testSecretKey: e.target.value })}
                        placeholder="Тестовый секретный ключ"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Настройки платежей</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Минимальная сумма (₽)</Label>
                  <Input
                    type="number"
                    value={formData.minAmount || ''}
                    onChange={(e) => setFormData({ ...formData, minAmount: parseFloat(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Максимальная сумма (₽)</Label>
                  <Input
                    type="number"
                    value={formData.maxAmount || ''}
                    onChange={(e) => setFormData({ ...formData, maxAmount: parseFloat(e.target.value) || undefined })}
                    placeholder="Не ограничено"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Комиссия (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commissionPercent || ''}
                    onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Фиксированная комиссия (₽)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commissionFixed || ''}
                    onChange={(e) => setFormData({ ...formData, commissionFixed: parseFloat(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Активна</Label>
                  <p className="text-xs text-muted-foreground">
                    Платежная система видна в настройках
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
                    Платежная система доступна для выбора при оплате
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




