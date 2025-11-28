import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, RefreshCw, Store, Key, DollarSign } from 'lucide-react';
import { marketplaceService, MarketplaceSetting, PriceSetting } from '@/services/marketplaceService';
import { WildBerriesApiService } from '@/services/wildberriesApiService';
import { OzonApiService } from '@/services/ozonApiService';
import { syncMarketplaceAccount } from '@/services/marketplaceSyncService';

const MarketplaceSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [settings, setSettings] = useState<MarketplaceSetting[]>([]);
  const [newSetting, setNewSetting] = useState<Partial<MarketplaceSetting>>({
    marketplaceType: 'wildberries',
    accountName: '',
    apiKey: '',
    apiSecret: '',
    clientId: '',
    sellerId: '',
    isActive: true,
    syncEnabled: true,
    syncIntervalMinutes: 60,
  });
  
  // Отдельное состояние для настроек отзывов
  const [reviewsSettings, setReviewsSettings] = useState<Array<{
    id?: number;
    marketplaceType: 'wildberries' | 'ozon';
    accountName: string;
    reviewsApiKey: string;
    isActive: boolean;
  }>>([]);
  
  const [newReviewSetting, setNewReviewSetting] = useState({
    marketplaceType: 'wildberries' as 'wildberries' | 'ozon',
    accountName: '',
    reviewsApiKey: '',
    isActive: true,
  });

  // Отдельное состояние для настроек цен
  const [priceSettings, setPriceSettings] = useState<PriceSetting[]>([]);
  
  const [newPriceSetting, setNewPriceSetting] = useState({
    marketplaceType: 'wildberries' as 'wildberries' | 'ozon',
    accountName: '',
    pricesApiKey: '',
    isActive: true,
  });

  const loadReviewSettings = async () => {
    try {
      const data = await marketplaceService.getReviewSettings();
      setReviewsSettings(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки настроек отзывов:', error);
      setReviewsSettings([]);
    }
  };

  useEffect(() => {
    loadSettings();
    loadReviewSettings();
    loadPriceSettings();
  }, []);

  const loadPriceSettings = async () => {
    try {
      const data = await marketplaceService.getPriceSettings();
      setPriceSettings(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки настроек цен:', error);
      setPriceSettings([]);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await marketplaceService.getAllSettings();
      setSettings(data || []);
    } catch (error: any) {
      console.error('Ошибка загрузки настроек маркетплейсов:', error);
      // Если таблица не существует, просто показываем пустой список
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        setSettings([]);
        toast({
          title: 'Внимание',
          description: 'Таблица маркетплейсов не создана. Выполните SQL-скрипт create_marketplace_tables.sql',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить настройки маркетплейсов',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newSetting.marketplaceType || !newSetting.accountName || !newSetting.apiKey) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await marketplaceService.upsertSetting(newSetting as MarketplaceSetting);
      toast({
        title: 'Успешно',
        description: 'Настройки маркетплейса сохранены',
      });
      setNewSetting({
        marketplaceType: 'wildberries',
        accountName: '',
        apiKey: '',
        apiSecret: '',
        clientId: '',
        sellerId: '',
        isActive: true,
        syncEnabled: true,
        syncIntervalMinutes: 60,
      });
      loadSettings();
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эти настройки?')) {
      return;
    }

    try {
      await marketplaceService.deleteSetting(id);
      toast({
        title: 'Успешно',
        description: 'Настройки удалены',
      });
      loadSettings();
    } catch (error: any) {
      console.error('Ошибка удаления настроек:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить настройки',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (setting: MarketplaceSetting) => {
    try {
      setSyncing(setting.id.toString());
      
      if (setting.marketplaceType === 'wildberries') {
        const wbService = new WildBerriesApiService({
          apiKey: setting.apiKey,
          sellerId: setting.sellerId,
        });
        
        // Тестируем подключение, используя report endpoint (который точно работает)
        // WB API требует формат даты YYYY-MM-DD
        const dateTo = new Date().toISOString().split('T')[0];
        const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          // Используем report endpoint, так как он точно работает (как в n8n)
          await wbService.getSalesReport(dateFrom, dateTo);
        } catch (error: any) {
          // Если ошибка 404 или ссылка на документацию, даем более понятное сообщение
          if (error.message?.includes('404') || 
              error.message?.includes('path not found') || 
              error.message?.includes('dev.wildberries.ru')) {
            throw new Error(
              'Endpoint не найден или токен не имеет доступа к этому API.\n\n' +
              'Проверьте:\n' +
              '1. Токен создан для Statistics API (статистика и финансы)\n' +
              '2. Токен имеет все необходимые права доступа\n' +
              '3. Документация: https://dev.wildberries.ru/openapi/api-information'
            );
          }
          throw error;
        }
        
        toast({
          title: 'Успешно',
          description: 'Подключение к WildBerries работает',
        });
      } else if (setting.marketplaceType === 'ozon') {
        if (!setting.clientId) {
          throw new Error('Не указан Client ID для OZON');
        }
        
        const ozonService = new OzonApiService({
          apiKey: setting.apiKey,
          clientId: setting.clientId,
        });
        
        // Тестируем подключение, используя финансовый отчет (основной метод для получения данных)
        const dateTo = new Date().toISOString().split('T')[0];
        const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        try {
          await ozonService.getSalesReport(dateFrom, dateTo);
        } catch (error: any) {
          // Если ошибка 401 или 403, даем более понятное сообщение
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            throw new Error(
              'Ошибка авторизации. Проверьте правильность API Key и Client ID.\n\n' +
              'Убедитесь, что:\n' +
              '1. API Key и Client ID скопированы правильно\n' +
              '2. API ключ активен в личном кабинете OZON\n' +
              '3. У API ключа есть доступ к финансовым данным'
            );
          }
          if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            throw new Error(
              'Доступ запрещен. Проверьте права доступа API ключа.\n\n' +
              'Убедитесь, что:\n' +
              '1. У API ключа есть доступ к финансовым данным\n' +
              '2. API ключ не истек\n' +
              '3. Документация: https://docs.ozon.ru/api/seller/'
            );
          }
          throw error;
        }
        
        toast({
          title: 'Успешно',
          description: 'Подключение к OZON работает',
        });
      }
    } catch (error: any) {
      console.error('Ошибка тестирования подключения:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось подключиться к API',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSync = async (setting: MarketplaceSetting) => {
    try {
      setSyncing(setting.id.toString());
      await syncMarketplaceAccount(setting);
      toast({
        title: 'Успешно',
        description: 'Синхронизация завершена',
      });
      loadSettings();
    } catch (error: any) {
      console.error('Ошибка синхронизации:', error);
      
      // Проверяем, не является ли это проблемой CORS
      let errorMessage = error.message || 'Ошибка синхронизации';
      if (error.message?.includes('404') || error.message?.includes('path not found')) {
        errorMessage = 
          'Ошибка 404: Endpoint не найден.\n\n' +
          'Возможные причины:\n' +
          '1. API WildBerries блокирует запросы из браузера (CORS)\n' +
          '2. Токен не имеет доступа к этому endpoint\n' +
          '3. Endpoint изменился\n\n' +
          'Решение: Запросы к API WildBerries нужно делать через серверную часть (прокси), ' +
          'так как API не поддерживает CORS запросы из браузера.\n\n' +
          'Проверьте консоль браузера (F12) для деталей.';
      }
      
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSaveReviewSetting = async () => {
    if (!newReviewSetting.accountName || !newReviewSetting.reviewsApiKey) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await marketplaceService.upsertReviewSetting({
        marketplaceType: newReviewSetting.marketplaceType,
        accountName: newReviewSetting.accountName,
        reviewsApiKey: newReviewSetting.reviewsApiKey,
        isActive: newReviewSetting.isActive,
      });
      toast({
        title: 'Успешно',
        description: 'Настройки токена для отзывов сохранены',
      });
      setNewReviewSetting({
        marketplaceType: 'wildberries',
        accountName: '',
        reviewsApiKey: '',
        isActive: true,
      });
      loadReviewSettings();
    } catch (error: any) {
      console.error('Ошибка сохранения настроек отзывов:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReviewSetting = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эти настройки?')) {
      return;
    }

    try {
      await marketplaceService.deleteReviewSetting(id);
      toast({
        title: 'Успешно',
        description: 'Настройки удалены',
      });
      loadReviewSettings();
    } catch (error: any) {
      console.error('Ошибка удаления настроек отзывов:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить настройки',
        variant: 'destructive',
      });
    }
  };

  const handleSavePriceSetting = async () => {
    if (!newPriceSetting.accountName || !newPriceSetting.pricesApiKey) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await marketplaceService.upsertPriceSetting({
        marketplaceType: newPriceSetting.marketplaceType,
        accountName: newPriceSetting.accountName,
        pricesApiKey: newPriceSetting.pricesApiKey,
        isActive: newPriceSetting.isActive,
      });
      toast({
        title: 'Успешно',
        description: 'Настройки токена для цен сохранены',
      });
      setNewPriceSetting({
        marketplaceType: 'wildberries',
        accountName: '',
        pricesApiKey: '',
        isActive: true,
      });
      loadPriceSettings();
    } catch (error: any) {
      console.error('Ошибка сохранения настроек цен:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePriceSetting = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эти настройки?')) {
      return;
    }

    try {
      await marketplaceService.deletePriceSetting(id);
      toast({
        title: 'Успешно',
        description: 'Настройки удалены',
      });
      loadPriceSettings();
    } catch (error: any) {
      console.error('Ошибка удаления настроек цен:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить настройки',
        variant: 'destructive',
      });
    }
  };

  const wbSettings = settings.filter(s => s.marketplaceType === 'wildberries');
  const ozonSettings = settings.filter(s => s.marketplaceType === 'ozon');

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Настройки маркетплейсов</h1>
        <p className="text-muted-foreground">
          Настройте подключение к WildBerries и OZON для автоматической синхронизации данных
        </p>
      </div>

      <Tabs defaultValue="wildberries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wildberries">
            <Store className="h-4 w-4 mr-2" />
            WildBerries
          </TabsTrigger>
          <TabsTrigger value="ozon">
            <Store className="h-4 w-4 mr-2" />
            OZON
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Key className="h-4 w-4 mr-2" />
            Отзывы
          </TabsTrigger>
          <TabsTrigger value="prices">
            <DollarSign className="h-4 w-4 mr-2" />
            Цены
          </TabsTrigger>
        </TabsList>

        {/* WildBerries */}
        <TabsContent value="wildberries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Добавить аккаунт WildBerries</CardTitle>
              <CardDescription>
                Введите API ключ и настройки для подключения к WildBerries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wb-account-name">Название аккаунта *</Label>
                  <Input
                    id="wb-account-name"
                    placeholder="WB Основной"
                    value={newSetting.marketplaceType === 'wildberries' ? newSetting.accountName || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, marketplaceType: 'wildberries', accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wb-api-key">API ключ (Statistics API) *</Label>
                  <Input
                    id="wb-api-key"
                    type="password"
                    placeholder="Введите API ключ для статистики и цен"
                    value={newSetting.marketplaceType === 'wildberries' ? newSetting.apiKey || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wb-seller-id">Seller ID (опционально)</Label>
                  <Input
                    id="wb-seller-id"
                    placeholder="Введите Seller ID"
                    value={newSetting.marketplaceType === 'wildberries' ? newSetting.sellerId || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, sellerId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wb-sync-interval">Интервал синхронизации (минуты)</Label>
                  <Input
                    id="wb-sync-interval"
                    type="number"
                    min="15"
                    value={newSetting.syncIntervalMinutes || 60}
                    onChange={(e) => setNewSetting({ ...newSetting, syncIntervalMinutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="wb-active"
                  checked={newSetting.isActive ?? true}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, isActive: checked })}
                />
                <Label htmlFor="wb-active">Активен</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="wb-sync"
                  checked={newSetting.syncEnabled ?? true}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, syncEnabled: checked })}
                />
                <Label htmlFor="wb-sync">Автоматическая синхронизация</Label>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Список аккаунтов WB */}
          {wbSettings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Аккаунты WildBerries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {wbSettings.map((setting) => (
                  <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{setting.accountName}</h3>
                        <p className="text-sm text-muted-foreground">
                          API ключ: {setting.apiKey.substring(0, 10)}...
                        </p>
                        {setting.lastSyncAt && (
                          <p className="text-xs text-muted-foreground">
                            Последняя синхронизация: {new Date(setting.lastSyncAt).toLocaleString('ru-RU')}
                          </p>
                        )}
                        {setting.lastSyncStatus && (
                          <p className={`text-xs ${setting.lastSyncStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            Статус: {setting.lastSyncStatus}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(setting)}
                          disabled={syncing === setting.id.toString()}
                        >
                          <Key className={`h-4 w-4 mr-2 ${syncing === setting.id.toString() ? 'animate-spin' : ''}`} />
                          Тест
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSync(setting)}
                          disabled={syncing === setting.id.toString()}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncing === setting.id.toString() ? 'animate-spin' : ''}`} />
                          Синхронизировать
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(setting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* OZON */}
        <TabsContent value="ozon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Добавить аккаунт OZON</CardTitle>
              <CardDescription>
                Введите API ключ, Client ID и настройки для подключения к OZON
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ozon-account-name">Название аккаунта *</Label>
                  <Input
                    id="ozon-account-name"
                    placeholder="OZON 1"
                    value={newSetting.marketplaceType === 'ozon' ? newSetting.accountName || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, marketplaceType: 'ozon', accountName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ozon-api-key">API ключ *</Label>
                  <Input
                    id="ozon-api-key"
                    type="password"
                    placeholder="Введите API ключ"
                    value={newSetting.marketplaceType === 'ozon' ? newSetting.apiKey || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, apiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ozon-client-id">Client ID *</Label>
                  <Input
                    id="ozon-client-id"
                    placeholder="Введите Client ID"
                    value={newSetting.marketplaceType === 'ozon' ? newSetting.clientId || '' : ''}
                    onChange={(e) => setNewSetting({ ...newSetting, clientId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ozon-sync-interval">Интервал синхронизации (минуты)</Label>
                  <Input
                    id="ozon-sync-interval"
                    type="number"
                    min="15"
                    value={newSetting.syncIntervalMinutes || 60}
                    onChange={(e) => setNewSetting({ ...newSetting, syncIntervalMinutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ozon-active"
                  checked={newSetting.isActive ?? true}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, isActive: checked })}
                />
                <Label htmlFor="ozon-active">Активен</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="ozon-sync"
                  checked={newSetting.syncEnabled ?? true}
                  onCheckedChange={(checked) => setNewSetting({ ...newSetting, syncEnabled: checked })}
                />
                <Label htmlFor="ozon-sync">Автоматическая синхронизация</Label>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Список аккаунтов OZON */}
          {ozonSettings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Аккаунты OZON</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ozonSettings.map((setting) => (
                  <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{setting.accountName}</h3>
                        <p className="text-sm text-muted-foreground">
                          API ключ: {setting.apiKey.substring(0, 10)}...
                        </p>
                        {setting.clientId && (
                          <p className="text-sm text-muted-foreground">
                            Client ID: {setting.clientId.substring(0, 10)}...
                          </p>
                        )}
                        {setting.lastSyncAt && (
                          <p className="text-xs text-muted-foreground">
                            Последняя синхронизация: {new Date(setting.lastSyncAt).toLocaleString('ru-RU')}
                          </p>
                        )}
                        {setting.lastSyncStatus && (
                          <p className={`text-xs ${setting.lastSyncStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            Статус: {setting.lastSyncStatus}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(setting)}
                          disabled={syncing === setting.id.toString()}
                        >
                          <Key className={`h-4 w-4 mr-2 ${syncing === setting.id.toString() ? 'animate-spin' : ''}`} />
                          Тест
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSync(setting)}
                          disabled={syncing === setting.id.toString()}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncing === setting.id.toString() ? 'animate-spin' : ''}`} />
                          Синхронизировать
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(setting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Отзывы */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки токенов для отзывов</CardTitle>
              <CardDescription>
                Настройте токены с правами "ЦЕНЫ ОТЗЫВЫ" для получения отзывов с маркетплейсов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="review-marketplace">Маркетплейс *</Label>
                  <select
                    id="review-marketplace"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={newReviewSetting.marketplaceType}
                    onChange={(e) => setNewReviewSetting({ ...newReviewSetting, marketplaceType: e.target.value as 'wildberries' | 'ozon' })}
                  >
                    <option value="wildberries">WildBerries</option>
                    <option value="ozon">OZON</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="review-account-name">Название аккаунта *</Label>
                  <Input
                    id="review-account-name"
                    placeholder="WB Основной"
                    value={newReviewSetting.accountName}
                    onChange={(e) => setNewReviewSetting({ ...newReviewSetting, accountName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Должно совпадать с названием аккаунта в основной настройке
                  </p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="review-api-key">API ключ для отзывов *</Label>
                  <Input
                    id="review-api-key"
                    type="password"
                    placeholder="Введите токен с правами 'ЦЕНЫ ОТЗЫВЫ'"
                    value={newReviewSetting.reviewsApiKey}
                    onChange={(e) => setNewReviewSetting({ ...newReviewSetting, reviewsApiKey: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="review-active"
                  checked={newReviewSetting.isActive}
                  onCheckedChange={(checked) => setNewReviewSetting({ ...newReviewSetting, isActive: checked })}
                />
                <Label htmlFor="review-active">Активен</Label>
              </div>
              <Button onClick={handleSaveReviewSetting} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Список настроек отзывов */}
          {reviewsSettings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Настроенные токены для отзывов</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewsSettings.map((setting) => (
                  <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{setting.accountName} ({setting.marketplaceType === 'wildberries' ? 'WB' : 'OZON'})</h3>
                        <p className="text-sm text-muted-foreground">
                          API ключ: {setting.reviewsApiKey.substring(0, 20)}...
                        </p>
                        <p className={`text-xs ${setting.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                          Статус: {setting.isActive ? 'Активен' : 'Неактивен'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteReviewSetting(setting.id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Цены */}
        <TabsContent value="prices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки токенов для управления ценами</CardTitle>
              <CardDescription>
                Настройте токены с правами "ЦЕНЫ ОТЗЫВЫ" или "ЦЕНЫ" для управления ценами на маркетплейсах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price-marketplace">Маркетплейс *</Label>
                  <select
                    id="price-marketplace"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={newPriceSetting.marketplaceType}
                    onChange={(e) => setNewPriceSetting({ ...newPriceSetting, marketplaceType: e.target.value as 'wildberries' | 'ozon' })}
                  >
                    <option value="wildberries">WildBerries</option>
                    <option value="ozon">OZON</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price-account-name">Название аккаунта *</Label>
                  <Input
                    id="price-account-name"
                    placeholder="WB Основной"
                    value={newPriceSetting.accountName}
                    onChange={(e) => setNewPriceSetting({ ...newPriceSetting, accountName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Должно совпадать с названием аккаунта в основной настройке
                  </p>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="price-api-key">API ключ для цен *</Label>
                  <Input
                    id="price-api-key"
                    type="password"
                    placeholder="Введите токен с правами 'ЦЕНЫ ОТЗЫВЫ' или 'ЦЕНЫ'"
                    value={newPriceSetting.pricesApiKey}
                    onChange={(e) => setNewPriceSetting({ ...newPriceSetting, pricesApiKey: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="price-active"
                  checked={newPriceSetting.isActive}
                  onCheckedChange={(checked) => setNewPriceSetting({ ...newPriceSetting, isActive: checked })}
                />
                <Label htmlFor="price-active">Активен</Label>
              </div>
              <Button onClick={handleSavePriceSetting} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Список настроек цен */}
          {priceSettings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Настроенные токены для цен</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {priceSettings.map((setting) => (
                  <div key={setting.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{setting.accountName} ({setting.marketplaceType === 'wildberries' ? 'WB' : 'OZON'})</h3>
                        <p className="text-sm text-muted-foreground">
                          API ключ: {setting.pricesApiKey.substring(0, 20)}...
                        </p>
                        <p className={`text-xs ${setting.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                          Статус: {setting.isActive ? 'Активен' : 'Неактивен'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePriceSetting(setting.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketplaceSettings;

