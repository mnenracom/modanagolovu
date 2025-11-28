import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Database, Shield, Bell, Mail, Globe, ShoppingCart, Plus, Trash2, FileText } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { useSettings } from '@/hooks/useSettings';
import { defaultContentSettings, ContentSettings } from '@/constants/contentDefaults';

const Settings = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { settings, loading: settingsLoading, error: settingsError, refresh: refreshSettings } = useSettings();

  // Настройки сайта
  const [siteSettings, setSiteSettings] = useState({
    siteName: 'МОДАНАГОЛОВУ',
    siteDescription: 'Оптовая продажа головных уборов',
    siteEmail: 'info@modnagolovu.ru',
    sitePhone: '+7 (999) 123-45-67',
    maintenanceMode: false,
  });

  // Настройки заказов
  const [orderSettings, setOrderSettings] = useState({
    minRetailOrder: '0',
    minWholesaleOrder: '5000',
    wholesaleGradations: [] as Array<{ amount: number; percent: number }>, // Градации оптовых цен
  });

  const [contentSettings, setContentSettings] = useState<ContentSettings>({ ...defaultContentSettings });

  const updateContentSetting = (key: keyof ContentSettings, value: string) => {
    setContentSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Загружаем настройки заказов при загрузке компонента
  useEffect(() => {
    if (!settingsLoading) {
      // Используем настройки из хука или значения по умолчанию
      // Загружаем градации оптовых цен
      let wholesaleGradations: Array<{ amount: number; percent: number }> = [];
      try {
        const gradationsStr = settings['wholesale_gradations'];
        if (gradationsStr) {
          wholesaleGradations = JSON.parse(gradationsStr);
        }
      } catch (e) {
        console.error('Ошибка парсинга градаций оптовых цен:', e);
        // Если ошибка, используем пустой массив
        wholesaleGradations = [];
      }

      const minWholesaleOrderValue = settings['min_wholesale_order'] || '5000';
      
      // Если градаций нет, создаем одну по умолчанию
      if (wholesaleGradations.length === 0) {
        wholesaleGradations = [{
          amount: parseFloat(minWholesaleOrderValue) || 5000,
          percent: 10,
        }];
      }

      setOrderSettings({
        minRetailOrder: settings['min_retail_order'] ?? '0',
        minWholesaleOrder: minWholesaleOrderValue,
        wholesaleGradations,
      });

      const updatedContentSettings: ContentSettings = { ...defaultContentSettings };
      (Object.keys(defaultContentSettings) as Array<keyof ContentSettings>).forEach((key) => {
        const storedValue = settings[key];
        updatedContentSettings[key] = storedValue ?? defaultContentSettings[key];
      });
      setContentSettings(updatedContentSettings);
    }
  }, [settings, settingsLoading]);

  // Настройки уведомлений
  const [notificationSettings, setNotificationSettings] = useState({
    emailOnNewOrder: true,
    emailOnLowStock: true,
    emailOnNewUser: false,
    emailOnProductUpdate: false,
  });

  // Настройки безопасности
  const [securitySettings, setSecuritySettings] = useState({
    requireTwoFactor: false,
    sessionTimeout: 30, // минуты
    maxLoginAttempts: 5,
    enableAuditLog: true,
  });

  const handleSaveSiteSettings = async () => {
    setSaving(true);
    try {
      // TODO: Сохранить настройки в Supabase
      await new Promise(resolve => setTimeout(resolve, 500)); // Имитация сохранения
      toast({
        title: 'Успешно',
        description: 'Настройки сайта сохранены',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setSaving(true);
    try {
      // TODO: Сохранить настройки в Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: 'Успешно',
        description: 'Настройки уведомлений сохранены',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setSaving(true);
    try {
      // TODO: Сохранить настройки в Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: 'Успешно',
        description: 'Настройки безопасности сохранены',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrderSettings = async () => {
    setSaving(true);
    try {
      const minRetailOrder = parseFloat(orderSettings.minRetailOrder);
      const minWholesaleOrder = parseFloat(orderSettings.minWholesaleOrder);

      if (isNaN(minRetailOrder) || minRetailOrder < 0) {
        toast({
          title: 'Ошибка',
          description: 'Минимальная сумма розничного заказа должна быть положительным числом',
          variant: 'destructive',
        });
        return;
      }

      if (isNaN(minWholesaleOrder) || minWholesaleOrder < 0) {
        toast({
          title: 'Ошибка',
          description: 'Минимальная сумма оптового заказа должна быть положительным числом',
          variant: 'destructive',
        });
        return;
      }

      if (minWholesaleOrder < minRetailOrder) {
        toast({
          title: 'Ошибка',
          description: 'Минимальная сумма оптового заказа не может быть меньше розничного',
          variant: 'destructive',
        });
        return;
      }

      // Валидация градаций - если нет градаций, создаем одну по умолчанию
      let gradationsToSave = orderSettings.wholesaleGradations;
      if (gradationsToSave.length === 0) {
        // Создаем градацию по умолчанию от минимальной суммы оптового заказа
        gradationsToSave = [{
          amount: minWholesaleOrder,
          percent: 10,
        }];
      }

      // Проверяем, что градации отсортированы по сумме и валидны
      const sortedGradations = [...gradationsToSave].sort((a, b) => a.amount - b.amount);
      for (let i = 0; i < sortedGradations.length; i++) {
        const grad = sortedGradations[i];
        if (grad.amount < minWholesaleOrder) {
          toast({
            title: 'Ошибка',
            description: `Сумма градации (${grad.amount}₽) не может быть меньше минимальной суммы оптового заказа (${minWholesaleOrder}₽)`,
            variant: 'destructive',
          });
          return;
        }
        if (grad.percent < 0 || grad.percent > 100) {
          toast({
            title: 'Ошибка',
            description: `Процент скидки должен быть от 0 до 100 (градация ${grad.amount}₽)`,
            variant: 'destructive',
          });
          return;
        }
      }

      await settingsService.updateSettings([
        {
          key: 'min_retail_order',
          value: minRetailOrder.toString(),
          description: 'Минимальная сумма розничного заказа (в рублях)',
        },
        {
          key: 'min_wholesale_order',
          value: minWholesaleOrder.toString(),
          description: 'Минимальная сумма оптового заказа (в рублях)',
        },
        {
          key: 'wholesale_gradations',
          value: JSON.stringify(sortedGradations),
          description: 'Градации оптовых цен (JSON массив: [{amount: число, percent: число}])',
        },
      ]);

      await refreshSettings();

      toast({
        title: 'Успешно',
        description: 'Настройки заказов сохранены',
      });
    } catch (error) {
      console.error('Error saving order settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки заказов',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContentSettings = async () => {
    setSaving(true);
    try {
      const updates = (Object.keys(contentSettings) as Array<keyof ContentSettings>).map((key) => ({
        key,
        value: contentSettings[key],
        description: `Контент (${key})`,
      }));

      await settingsService.updateSettings(updates);
      await refreshSettings();

      toast({
        title: 'Успешно',
        description: 'Контент страниц обновлен',
      });
    } catch (error) {
      console.error('Error saving content settings:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить контент страниц',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground">Управление настройками системы</p>
      </div>

      <Tabs defaultValue="site" className="space-y-4">
        <TabsList>
          <TabsTrigger value="site">
            <Globe className="h-4 w-4 mr-2" />
            Сайт
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Уведомления
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Безопасность
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Заказы
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="h-4 w-4 mr-2" />
            Контент
          </TabsTrigger>
          <TabsTrigger value="database">
            <Database className="h-4 w-4 mr-2" />
            База данных
          </TabsTrigger>
        </TabsList>

        {/* Настройки сайта */}
        <TabsContent value="site" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Основные настройки</CardTitle>
              <CardDescription>Настройки отображения сайта</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName" className="mb-2 block">Название сайта</Label>
                <Input
                  id="siteName"
                  value={siteSettings.siteName}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription" className="mb-2 block">Описание сайта</Label>
                <Input
                  id="siteDescription"
                  value={siteSettings.siteDescription}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteDescription: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteEmail" className="mb-2 block">Email для связи</Label>
                <Input
                  id="siteEmail"
                  type="email"
                  value={siteSettings.siteEmail}
                  onChange={(e) => setSiteSettings({ ...siteSettings, siteEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sitePhone" className="mb-2 block">Телефон</Label>
                <Input
                  id="sitePhone"
                  value={siteSettings.sitePhone}
                  onChange={(e) => setSiteSettings({ ...siteSettings, sitePhone: e.target.value })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Режим обслуживания</Label>
                  <p className="text-sm text-muted-foreground">
                    Включите для временного закрытия сайта
                  </p>
                </div>
                <Switch
                  checked={siteSettings.maintenanceMode}
                  onCheckedChange={(checked) => setSiteSettings({ ...siteSettings, maintenanceMode: checked })}
                />
              </div>

              <Button onClick={handleSaveSiteSettings} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Настройки уведомлений */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Уведомления по email</CardTitle>
              <CardDescription>Настройте, какие события будут отправляться на email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Новый заказ</Label>
                  <p className="text-sm text-muted-foreground">
                    Уведомлять при создании нового заказа
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailOnNewOrder}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailOnNewOrder: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Низкий остаток</Label>
                  <p className="text-sm text-muted-foreground">
                    Уведомлять при низком остатке товара
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailOnLowStock}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailOnLowStock: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Новый пользователь</Label>
                  <p className="text-sm text-muted-foreground">
                    Уведомлять при регистрации нового пользователя
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailOnNewUser}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailOnNewUser: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Обновление товара</Label>
                  <p className="text-sm text-muted-foreground">
                    Уведомлять при изменении товара
                  </p>
                </div>
                <Switch
                  checked={notificationSettings.emailOnProductUpdate}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailOnProductUpdate: checked })}
                />
              </div>

              <Button onClick={handleSaveNotificationSettings} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Настройки безопасности */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
              <CardDescription>Настройки безопасности системы</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Двухфакторная аутентификация</Label>
                  <p className="text-sm text-muted-foreground">
                    Требовать 2FA для входа в админ-панель
                  </p>
                </div>
                <Switch
                  checked={securitySettings.requireTwoFactor}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, requireTwoFactor: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="sessionTimeout" className="mb-2 block">Таймаут сессии (минуты)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="5"
                  max="1440"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts" className="mb-2 block">Максимум попыток входа</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  min="3"
                  max="10"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Логирование действий</Label>
                  <p className="text-sm text-muted-foreground">
                    Включить запись всех действий в админ-панели
                  </p>
                </div>
                <Switch
                  checked={securitySettings.enableAuditLog}
                  onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, enableAuditLog: checked })}
                />
              </div>

              <Button onClick={handleSaveSecuritySettings} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Контент страниц */}
        <TabsContent value="content" className="space-y-4">
          {settingsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Страница «О нас»</CardTitle>
                  <CardDescription>Отредактируйте содержимое страницы «О компании»</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="aboutTitle">Заголовок</Label>
                    <Input
                      id="aboutTitle"
                      value={contentSettings.about_title}
                      onChange={(e) => updateContentSetting('about_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutIntro">Краткое описание</Label>
                    <Textarea
                      id="aboutIntro"
                      rows={3}
                      value={contentSettings.about_intro}
                      onChange={(e) => updateContentSetting('about_intro', e.target.value)}
                      placeholder="Краткий текст, который отображается под заголовком"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutCompanyName">Название компании</Label>
                    <Input
                      id="aboutCompanyName"
                      value={contentSettings.about_company_name}
                      onChange={(e) => updateContentSetting('about_company_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutCompanyDescription">Основной текст (каждая строка — новый абзац)</Label>
                    <Textarea
                      id="aboutCompanyDescription"
                      rows={6}
                      value={contentSettings.about_company_description}
                      onChange={(e) => updateContentSetting('about_company_description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutFeatures">Преимущества (формат: Заголовок|Описание, по одному на строке)</Label>
                    <Textarea
                      id="aboutFeatures"
                      rows={5}
                      value={contentSettings.about_features}
                      onChange={(e) => updateContentSetting('about_features', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutBenefitsTitle">Заголовок списка преимуществ</Label>
                    <Input
                      id="aboutBenefitsTitle"
                      value={contentSettings.about_benefits_title}
                      onChange={(e) => updateContentSetting('about_benefits_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutBenefitsList">Список преимуществ (каждая строка — отдельный пункт)</Label>
                    <Textarea
                      id="aboutBenefitsList"
                      rows={5}
                      value={contentSettings.about_benefits_list}
                      onChange={(e) => updateContentSetting('about_benefits_list', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Страница «Контакты»</CardTitle>
                  <CardDescription>Контактная информация, отображаемая на сайте</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactsTitle">Заголовок</Label>
                    <Input
                      id="contactsTitle"
                      value={contentSettings.contacts_title}
                      onChange={(e) => updateContentSetting('contacts_title', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactsPhone">Телефон</Label>
                      <Input
                        id="contactsPhone"
                        value={contentSettings.contacts_phone}
                        onChange={(e) => updateContentSetting('contacts_phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactsEmail">Email</Label>
                      <Input
                        id="contactsEmail"
                        value={contentSettings.contacts_email}
                        onChange={(e) => updateContentSetting('contacts_email', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactsAddress">Адрес</Label>
                    <Input
                      id="contactsAddress"
                      value={contentSettings.contacts_address}
                      onChange={(e) => updateContentSetting('contacts_address', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactsSchedule">Режим работы (каждая строка — отдельная строка)</Label>
                    <Textarea
                      id="contactsSchedule"
                      rows={3}
                      value={contentSettings.contacts_schedule}
                      onChange={(e) => updateContentSetting('contacts_schedule', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactsDescription">Описание (каждый абзац с новой строки)</Label>
                    <Textarea
                      id="contactsDescription"
                      rows={4}
                      value={contentSettings.contacts_description}
                      onChange={(e) => updateContentSetting('contacts_description', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactsCta">Дополнительный акцент/призыв</Label>
                    <Input
                      id="contactsCta"
                      value={contentSettings.contacts_cta}
                      onChange={(e) => updateContentSetting('contacts_cta', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactsMarketplaces">Ссылки на маркетплейсы (формат: Название|URL, каждая строка отдельно)</Label>
                    <Textarea
                      id="contactsMarketplaces"
                      rows={4}
                      value={contentSettings.contacts_marketplaces}
                      onChange={(e) => updateContentSetting('contacts_marketplaces', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveContentSettings} disabled={saving || settingsLoading}>
                  {saving ? 'Сохранение...' : 'Сохранить контент'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* Настройки заказов */}
        <TabsContent value="orders" className="space-y-4">
          {settingsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle>Настройки минимальных сумм заказов</CardTitle>
              <CardDescription>
                Управление минимальными суммами для розничных и оптовых заказов. 
                Эти значения будут использоваться во всей системе (корзина, оформление заказа и т.д.)
                {settingsError && (
                  <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                    ⚠️ Таблица настроек не найдена. Выполните SQL-скрипт create_settings_table.sql в Supabase.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="minRetailOrder" className="mb-2 block">
                  Минимальная сумма розничного заказа (₽)
                </Label>
                <Input
                  id="minRetailOrder"
                  type="number"
                  min="0"
                  step="100"
                  value={orderSettings.minRetailOrder === '0' ? '' : orderSettings.minRetailOrder}
                  onChange={(e) => {
                    const value = e.target.value;
                    setOrderSettings({ ...orderSettings, minRetailOrder: value === '' ? '0' : value });
                  }}
                  placeholder="0"
                />
                <p className="text-sm text-muted-foreground">
                  Минимальная сумма заказа для розничных покупателей. 
                  Заказ не может быть оформлен, если его сумма меньше этого значения.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="minWholesaleOrder" className="mb-2 block">
                  Минимальная сумма оптового заказа (₽)
                </Label>
                <Input
                  id="minWholesaleOrder"
                  type="number"
                  min="0"
                  step="100"
                  value={orderSettings.minWholesaleOrder === '0' ? '' : orderSettings.minWholesaleOrder}
                  onChange={(e) => {
                    const value = e.target.value;
                    setOrderSettings({ ...orderSettings, minWholesaleOrder: value === '' ? '0' : value });
                  }}
                  placeholder="5000"
                />
                <p className="text-sm text-muted-foreground">
                  Минимальная сумма заказа для получения оптовых цен. 
                  Должна быть больше или равна минимальной сумме розничного заказа.
                </p>
              </div>

              <Separator />

              {/* Градации оптовых цен */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="mb-2 block">Градации оптовых цен</Label>
                    <p className="text-sm text-muted-foreground">
                      Настройте градации оптовых цен. При достижении суммы заказа применяется соответствующая скидка.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newGradations = [...orderSettings.wholesaleGradations];
                      const lastAmount = newGradations.length > 0 
                        ? Math.max(...newGradations.map(g => g.amount))
                        : parseFloat(orderSettings.minWholesaleOrder) || 5000;
                      newGradations.push({
                        amount: lastAmount + 5000,
                        percent: 10,
                      });
                      setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить категорию опта
                  </Button>
                </div>

                {orderSettings.wholesaleGradations.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                    Нет градаций. Нажмите "Добавить категорию опта" для создания первой градации.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderSettings.wholesaleGradations
                      .sort((a, b) => a.amount - b.amount)
                      .map((gradation, index) => {
                        const originalIndex = orderSettings.wholesaleGradations.findIndex(
                          g => g.amount === gradation.amount && g.percent === gradation.percent
                        );
                        return (
                          <div key={index} className="grid grid-cols-3 gap-3 p-4 border rounded-lg">
                            <div className="space-y-2">
                              <Label>Сумма опта (₽)</Label>
                              <Input
                                type="number"
                                min={parseFloat(orderSettings.minWholesaleOrder) || 5000}
                                step="100"
                                value={gradation.amount || ''}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  // Разрешаем пустую строку для очистки поля
                                  if (inputValue === '' || inputValue === null || inputValue === undefined) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      amount: 0,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                    return;
                                  }
                                  const numValue = parseFloat(inputValue);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      amount: numValue,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                  }
                                }}
                                onBlur={(e) => {
                                  // При потере фокуса, если поле пустое, устанавливаем минимальное значение
                                  if (e.target.value === '' || parseFloat(e.target.value) === 0) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    const minValue = parseFloat(orderSettings.minWholesaleOrder) || 5000;
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      amount: minValue,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                  }
                                }}
                                placeholder="5000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Процент скидки (%)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={gradation.percent || ''}
                                onChange={(e) => {
                                  const inputValue = e.target.value;
                                  // Разрешаем пустую строку для очистки поля
                                  if (inputValue === '' || inputValue === null || inputValue === undefined) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      percent: 0,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                    return;
                                  }
                                  const numValue = parseFloat(inputValue);
                                  if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      percent: numValue,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                  }
                                }}
                                onBlur={(e) => {
                                  // При потере фокуса, если поле пустое, устанавливаем значение по умолчанию
                                  if (e.target.value === '' || parseFloat(e.target.value) === 0) {
                                    const newGradations = [...orderSettings.wholesaleGradations];
                                    newGradations[originalIndex] = {
                                      ...newGradations[originalIndex],
                                      percent: 10,
                                    };
                                    setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                  }
                                }}
                                placeholder="10"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newGradations = orderSettings.wholesaleGradations.filter(
                                    (_, i) => i !== originalIndex
                                  );
                                  setOrderSettings({ ...orderSettings, wholesaleGradations: newGradations });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <Separator />

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Текущие значения:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Розничный заказ: {parseFloat(orderSettings.minRetailOrder || '0') > 0 ? `${parseFloat(orderSettings.minRetailOrder || '0').toLocaleString()} ₽` : '₽'}</li>
                  <li>• Оптовый заказ: {parseFloat(orderSettings.minWholesaleOrder || '0') > 0 ? `${parseFloat(orderSettings.minWholesaleOrder || '0').toLocaleString()} ₽` : '₽'}</li>
                  <li>• Градаций опта: {orderSettings.wholesaleGradations.length}</li>
                  {orderSettings.wholesaleGradations.length > 0 && (
                    <li className="mt-2">
                      Градации:
                      <ul className="ml-4 mt-1 space-y-1">
                        {orderSettings.wholesaleGradations
                          .sort((a, b) => a.amount - b.amount)
                          .map((g, i) => (
                            <li key={i}>• От {g.amount > 0 ? `${g.amount.toLocaleString()} ₽` : '₽'} - {g.percent}%</li>
                          ))}
                      </ul>
                    </li>
                  )}
                </ul>
              </div>

              <Button onClick={handleSaveOrderSettings} disabled={saving || settingsLoading}>
                {saving ? 'Сохранение...' : 'Сохранить настройки заказов'}
              </Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Информация о базе данных */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Информация о базе данных</CardTitle>
              <CardDescription>Статистика и информация о базе данных</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Тип БД</p>
                  <p className="text-lg font-semibold">PostgreSQL (Supabase)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Версия</p>
                  <p className="text-lg font-semibold">15.x</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Действия с базой данных</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Экспорт данных
                  </Button>
                  <Button variant="outline" size="sm">
                    Резервная копия
                  </Button>
                  <Button variant="outline" size="sm">
                    Очистить кэш
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

