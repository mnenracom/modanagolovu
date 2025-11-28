import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { telegramService } from '@/services/telegramService';
import { TelegramSettings, TelegramChat } from '@/types/telegram';
import { CheckCircle, XCircle, Plus, Trash2, Bot, MessageSquare, Save, TestTube, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function TelegramSettings() {
  const { toast: uiToast } = useToast();
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Форма настроек
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notifyLowPrice, setNotifyLowPrice] = useState(true);
  const [notifyNewOrder, setNotifyNewOrder] = useState(true);
  const [notifyNewReview, setNotifyNewReview] = useState(true);
  const [notifyNewQuestion, setNotifyNewQuestion] = useState(true);
  const [notifyMarketplaceSync, setNotifyMarketplaceSync] = useState(false);
  const [notifyErrors, setNotifyErrors] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, chatsData] = await Promise.all([
        telegramService.getSettings(),
        telegramService.getActiveChats(),
      ]);

      if (settingsData) {
        setSettings(settingsData);
        setBotToken(settingsData.botToken);
        setBotName(settingsData.botName || '');
        setIsActive(settingsData.isActive);
        setNotifyLowPrice(settingsData.notifyLowPrice);
        setNotifyNewOrder(settingsData.notifyNewOrder);
        setNotifyNewReview(settingsData.notifyNewReview);
        setNotifyNewQuestion(settingsData.notifyNewQuestion);
        setNotifyMarketplaceSync(settingsData.notifyMarketplaceSync);
        setNotifyErrors(settingsData.notifyErrors);
      }

      setChats(chatsData);
    } catch (error: any) {
      console.error('Ошибка загрузки настроек Telegram:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!botToken.trim()) {
      toast.error('Введите токен бота');
      return;
    }

    try {
      setTesting(true);
      const result = await telegramService.verifyBotToken(botToken);
      
      if (result.valid && result.botInfo) {
        setBotName(result.botInfo.username || '');
        toast.success(`Бот найден: @${result.botInfo.username}`);
      } else {
        toast.error('Неверный токен бота. Проверьте правильность токена.');
      }
    } catch (error: any) {
      console.error('Ошибка проверки токена:', error);
      toast.error('Ошибка проверки токена');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!botToken.trim()) {
      toast.error('Введите токен бота');
      return;
    }

    try {
      setSaving(true);
      await telegramService.saveSettings({
        botToken: botToken.trim(),
        botName: botName.trim() || undefined,
        isActive,
        notifyLowPrice,
        notifyNewOrder,
        notifyNewReview,
        notifyNewQuestion,
        notifyMarketplaceSync,
        notifyErrors,
      });

      toast.success('Настройки сохранены');
      await loadData();
    } catch (error: any) {
      console.error('Ошибка сохранения настроек:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  const [chatIdInput, setChatIdInput] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);

  const handleTestNotification = async () => {
    if (!settings || !settings.isActive) {
      toast.error('Сначала настройте и активируйте бота');
      return;
    }

    if (chats.length === 0) {
      toast.error('Нет активных чатов. Добавьте чат перед отправкой теста.');
      return;
    }

    try {
      setTesting(true);
      const sent = await telegramService.sendNotification({
        type: 'new_order',
        title: 'Тестовое уведомление',
        message: 'Это тестовое уведомление для проверки работы Telegram бота.',
        data: {
          Время: new Date().toLocaleString('ru-RU'),
          Статус: 'Тест успешен',
        },
        priority: 'normal',
      });

      if (sent) {
        toast.success('Тестовое уведомление отправлено');
      } else {
        toast.error('Не удалось отправить уведомление. Проверьте настройки.');
      }
    } catch (error: any) {
      console.error('Ошибка отправки тестового уведомления:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось отправить уведомление'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleGetUpdates = async () => {
    if (!botToken.trim()) {
      toast.error('Сначала введите токен бота');
      return;
    }

    try {
      setLoadingChats(true);
      const result = await telegramService.getUpdates(botToken);
      
      if (result.error) {
        toast.error(`Ошибка: ${result.error}`);
        return;
      }

      if (result.updates.length === 0) {
        toast.info('Нет новых обновлений. Отправьте /start боту в Telegram, затем попробуйте снова.');
        return;
      }

      // Ищем обновления с сообщениями
      const messages = result.updates
        .filter((u: any) => u.message && u.message.chat)
        .map((u: any) => u.message.chat);

      if (messages.length === 0) {
        toast.info('Не найдено чатов в обновлениях');
        return;
      }

      // Добавляем найденные чаты
      let addedCount = 0;
      for (const chat of messages) {
        try {
          await telegramService.addChat({
            chatId: chat.id,
            chatType: chat.type === 'private' ? 'private' : chat.type === 'group' ? 'group' : chat.type === 'supergroup' ? 'supergroup' : 'channel',
            chatTitle: chat.title || chat.first_name || `Chat ${chat.id}`,
            username: chat.username,
            isActive: true,
          });
          addedCount++;
        } catch (error) {
          // Игнорируем ошибки дублирования
        }
      }

      if (addedCount > 0) {
        toast.success(`Добавлено ${addedCount} чат(ов)`);
        await loadData();
      } else {
        toast.info('Чаты уже добавлены');
      }
    } catch (error: any) {
      console.error('Ошибка получения обновлений:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось получить обновления'}`);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleAddChatManually = async () => {
    if (!botToken.trim()) {
      toast.error('Сначала введите токен бота');
      return;
    }

    const chatId = parseInt(chatIdInput);
    if (isNaN(chatId)) {
      toast.error('Введите корректный Chat ID (число)');
      return;
    }

    try {
      setLoadingChats(true);
      const result = await telegramService.addChatManually(botToken, chatId);
      
      if (result.success) {
        toast.success('Чат успешно добавлен');
        setChatIdInput('');
        await loadData();
      } else {
        toast.error(`Ошибка: ${result.error || 'Не удалось добавить чат'}`);
      }
    } catch (error: any) {
      console.error('Ошибка добавления чата:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось добавить чат'}`);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleRemoveChat = async (chatId: number) => {
    try {
      await telegramService.removeChat(chatId);
      toast.success('Чат удален');
      await loadData();
    } catch (error: any) {
      console.error('Ошибка удаления чата:', error);
      toast.error('Ошибка удаления чата');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Настройки Telegram</h1>
          <p className="text-muted-foreground mt-1">
            Настройка уведомлений в Telegram бот
          </p>
        </div>
      </div>

      {/* Настройки бота */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Настройки бота
          </CardTitle>
          <CardDescription>
            Получите токен бота у @BotFather в Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Токен бота</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleVerifyToken}
                disabled={testing || !botToken.trim()}
              >
                {testing ? 'Проверка...' : 'Проверить'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Создайте бота через @BotFather в Telegram и получите токен
            </p>
          </div>

          {botName && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Бот найден: @{botName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Название бота (опционально)</Label>
            <Input
              placeholder="Мой бот уведомлений"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Активировать уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Включить отправку уведомлений
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !botToken.trim()}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Сохранение...' : 'Сохранить настройки'}
            </Button>
            {settings && settings.isActive && (
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={testing}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? 'Отправка...' : 'Отправить тест'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Типы уведомлений */}
      <Card>
        <CardHeader>
          <CardTitle>Типы уведомлений</CardTitle>
          <CardDescription>
            Выберите, какие события отслеживать
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>💰 Цены ниже минимальных</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о товарах с ценой ниже минимальной
                </p>
              </div>
              <Switch checked={notifyLowPrice} onCheckedChange={setNotifyLowPrice} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>🛒 Новые заказы</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о новых заказах с сайта
                </p>
              </div>
              <Switch checked={notifyNewOrder} onCheckedChange={setNotifyNewOrder} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>⭐ Новые отзывы</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о новых отзывах (требуют модерации)
                </p>
              </div>
              <Switch checked={notifyNewReview} onCheckedChange={setNotifyNewReview} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>❓ Новые вопросы</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о новых вопросах от клиентов
                </p>
              </div>
              <Switch checked={notifyNewQuestion} onCheckedChange={setNotifyNewQuestion} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>🔄 Синхронизация маркетплейсов</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о завершении синхронизации
                </p>
              </div>
              <Switch checked={notifyMarketplaceSync} onCheckedChange={setNotifyMarketplaceSync} />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>⚠️ Ошибки системы</Label>
                <p className="text-sm text-muted-foreground">
                  Уведомления о критических ошибках
                </p>
              </div>
              <Switch checked={notifyErrors} onCheckedChange={setNotifyErrors} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Чаты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Чаты для уведомлений
          </CardTitle>
          <CardDescription>
            Добавьте чаты, куда будут отправляться уведомления
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Кнопки для добавления чатов */}
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGetUpdates}
                disabled={loadingChats || !botToken.trim()}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingChats ? 'animate-spin' : ''}`} />
                Получить чаты из обновлений
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Введите Chat ID вручную"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleAddChatManually}
                disabled={loadingChats || !chatIdInput.trim() || !botToken.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Чтобы узнать свой Chat ID, отправьте /start боту @userinfobot в Telegram
            </p>
          </div>

          {chats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Чаты не добавлены. Используйте кнопки выше для добавления чата.
              </p>
              <p className="text-sm text-muted-foreground">
                Способ 1: Нажмите "Получить чаты из обновлений" после отправки /start боту<br/>
                Способ 2: Узнайте свой Chat ID через @userinfobot и введите вручную
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{chat.chatTitle || `Chat ${chat.chatId}`}</span>
                      <Badge variant="outline">{chat.chatType}</Badge>
                      {chat.isActive ? (
                        <Badge variant="default">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Неактивен</Badge>
                      )}
                    </div>
                    {chat.username && (
                      <p className="text-sm text-muted-foreground">@{chat.username}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveChat(chat.chatId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Как добавить чат:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Найдите вашего бота в Telegram по имени @{botName || 'ваш_бот'}</li>
              <li>Отправьте команду /start боту</li>
              <li>Чат будет автоматически добавлен в список</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Примечание: Для автоматического добавления чатов требуется настройка webhook или периодической проверки через Telegram Bot API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

