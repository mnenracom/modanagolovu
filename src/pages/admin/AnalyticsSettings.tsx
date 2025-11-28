import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { analyticsService } from '@/services/analyticsService';
import { AnalyticsSettings, AnalyticsFormData } from '@/types/analytics';
import { Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyticsSettings() {
  const [settings, setSettings] = useState<AnalyticsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<AnalyticsFormData>({
    yandexMetrikaEnabled: false,
    yandexMetrikaCounterId: '',
    yandexMetrikaToken: '',
    googleAnalyticsEnabled: false,
    googleAnalyticsTrackingId: '',
    googleAnalyticsMeasurementId: '',
    googleAnalyticsApiKey: '',
    googleAnalyticsViewId: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getSettings();
      if (data) {
        setSettings(data);
        setFormData({
          yandexMetrikaEnabled: data.yandexMetrikaEnabled,
          yandexMetrikaCounterId: data.yandexMetrikaCounterId || '',
          yandexMetrikaToken: data.yandexMetrikaToken || '',
          googleAnalyticsEnabled: data.googleAnalyticsEnabled,
          googleAnalyticsTrackingId: data.googleAnalyticsTrackingId || '',
          googleAnalyticsMeasurementId: data.googleAnalyticsMeasurementId || '',
          googleAnalyticsApiKey: data.googleAnalyticsApiKey || '',
          googleAnalyticsViewId: data.googleAnalyticsViewId || '',
        });
      } else {
        // Если таблица не создана, используем значения по умолчанию
        setFormData({
          yandexMetrikaEnabled: false,
          yandexMetrikaCounterId: '',
          yandexMetrikaToken: '',
          googleAnalyticsEnabled: false,
          googleAnalyticsTrackingId: '',
          googleAnalyticsMeasurementId: '',
          googleAnalyticsApiKey: '',
          googleAnalyticsViewId: '',
        });
      }
    } catch (error: any) {
      // Игнорируем ошибки, если таблица не создана
      if (error?.code === '42P01' || error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
        console.log('Таблица analytics_settings не создана. Используем значения по умолчанию.');
        setFormData({
          yandexMetrikaEnabled: false,
          yandexMetrikaCounterId: '',
          yandexMetrikaToken: '',
          googleAnalyticsEnabled: false,
          googleAnalyticsTrackingId: '',
          googleAnalyticsMeasurementId: '',
          googleAnalyticsApiKey: '',
          googleAnalyticsViewId: '',
        });
      } else {
        console.error('Ошибка загрузки настроек аналитики:', error);
        toast.error('Ошибка загрузки настроек аналитики');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await analyticsService.updateSettings(formData);
      toast.success('Настройки аналитики сохранены');
      await loadSettings();
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки аналитики</h1>
        <p className="text-muted-foreground mt-1">
          Подключите Яндекс.Метрику или Google Analytics для отслеживания посетителей
        </p>
      </div>

      {/* Яндекс.Метрика */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Яндекс.Метрика
                {formData.yandexMetrikaEnabled && formData.yandexMetrikaCounterId && (
                  <Badge variant="default" className="bg-yellow-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Активна
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Популярная аналитика для российских сайтов. Рекомендуется для российского рынка.
              </CardDescription>
            </div>
            <Switch
              checked={formData.yandexMetrikaEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, yandexMetrikaEnabled: checked })}
            />
          </div>
        </CardHeader>
        {formData.yandexMetrikaEnabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ym-counter-id">
                ID счетчика Яндекс.Метрики *
                <a
                  href="https://metrika.yandex.ru/list"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Найти ID
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Label>
              <Input
                id="ym-counter-id"
                placeholder="12345678"
                value={formData.yandexMetrikaCounterId}
                onChange={(e) => setFormData({ ...formData, yandexMetrikaCounterId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                ID счетчика можно найти в настройках счетчика на сайте Яндекс.Метрики
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ym-token">
                OAuth токен (опционально)
                <a
                  href="https://yandex.ru/dev/metrika/doc/api2/intro/oauth.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Как получить
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Label>
              <Input
                id="ym-token"
                type="password"
                placeholder="OAuth токен для API"
                value={formData.yandexMetrikaToken}
                onChange={(e) => setFormData({ ...formData, yandexMetrikaToken: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Токен нужен для получения данных через API. Можно оставить пустым, если используете только счетчик.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900 mb-1">Преимущества Яндекс.Метрики:</p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Лучше работает с российскими пользователями</li>
                <li>Подробная география посетителей</li>
                <li>Вебвизор для анализа поведения</li>
                <li>Бесплатный тариф</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Google Analytics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Google Analytics
                {formData.googleAnalyticsEnabled && (formData.googleAnalyticsTrackingId || formData.googleAnalyticsMeasurementId) && (
                  <Badge variant="default" className="bg-blue-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Активна
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Международная аналитика от Google. Подходит для международных проектов.
              </CardDescription>
            </div>
            <Switch
              checked={formData.googleAnalyticsEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, googleAnalyticsEnabled: checked })}
            />
          </div>
        </CardHeader>
        {formData.googleAnalyticsEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ga-tracking-id">
                  Tracking ID (Universal Analytics)
                  <a
                    href="https://support.google.com/analytics/answer/1008080"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Найти ID
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="ga-tracking-id"
                  placeholder="UA-XXXXXXXXX-X"
                  value={formData.googleAnalyticsTrackingId}
                  onChange={(e) => setFormData({ ...formData, googleAnalyticsTrackingId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Для Universal Analytics (старая версия)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ga-measurement-id">
                  Measurement ID (GA4) *
                  <a
                    href="https://support.google.com/analytics/answer/9304153"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    Найти ID
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Label>
                <Input
                  id="ga-measurement-id"
                  placeholder="G-XXXXXXXXXX"
                  value={formData.googleAnalyticsMeasurementId}
                  onChange={(e) => setFormData({ ...formData, googleAnalyticsMeasurementId: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Для Google Analytics 4 (рекомендуется)
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ga-api-key">
                API ключ (опционально)
                <a
                  href="https://developers.google.com/analytics/devguides/reporting/core/v4/quickstart/service-php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Как получить
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Label>
              <Input
                id="ga-api-key"
                type="password"
                placeholder="API ключ для Reporting API"
                value={formData.googleAnalyticsApiKey}
                onChange={(e) => setFormData({ ...formData, googleAnalyticsApiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Нужен для получения данных через API. Можно оставить пустым.
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-900 mb-1">Преимущества Google Analytics:</p>
              <ul className="text-xs text-green-800 space-y-1 list-disc list-inside">
                <li>Международный стандарт аналитики</li>
                <li>Интеграция с другими сервисами Google</li>
                <li>Мощные инструменты для e-commerce</li>
                <li>Бесплатный тариф</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Рекомендации */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            Рекомендации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Какую аналитику выбрать?</p>
            <ul className="space-y-1 list-disc list-inside text-muted-foreground">
              <li>
                <strong>Яндекс.Метрика</strong> — лучше для российского рынка, более детальная география, вебвизор
              </li>
              <li>
                <strong>Google Analytics</strong> — лучше для международных проектов, интеграция с Google сервисами
              </li>
              <li>
                <strong>Оба одновременно</strong> — можно подключить обе системы для сравнения данных
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              После сохранения настроек, код счетчиков будет автоматически добавлен на все страницы сайта.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  );
}

