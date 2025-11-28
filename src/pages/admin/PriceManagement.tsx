import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  DollarSign,
  TrendingDown,
  ArrowRight,
  Loader2,
  Crown,
  TrendingUp,
  Info
} from 'lucide-react';
import { marketplaceService } from '@/services/marketplaceService';
import { AutoPriceService, PriceCheckResult } from '@/services/autoPriceService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { productsService } from '@/services/productsService';

const PriceManagement = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingPrices, setCheckingPrices] = useState(false);
  // Сохраняем результаты в localStorage, чтобы они не пропадали при обновлении
  const [priceCheckResults, setPriceCheckResults] = useState<PriceCheckResult[]>(() => {
    try {
      const saved = localStorage.getItem('priceCheckResults');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Ошибка загрузки сохраненных результатов:', e);
    }
    return [];
  });
  const [selectedMarketplace, setSelectedMarketplace] = useState<'wildberries' | 'ozon'>('wildberries');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [marketplaceSettings, setMarketplaceSettings] = useState<any[]>([]);

  useEffect(() => {
    loadMarketplaceSettings();
  }, []);

  const loadMarketplaceSettings = async () => {
    try {
      const settings = await marketplaceService.getAllSettings();
      setMarketplaceSettings(settings);
      
      // Автоматически выбираем первый аккаунт выбранного маркетплейса
      const firstAccount = settings.find(s => s.marketplaceType === selectedMarketplace);
      if (firstAccount) {
        setSelectedAccount(firstAccount.accountName);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек маркетплейсов:', error);
    }
  };

  // Получаем список аккаунтов для выбранного маркетплейса
  const getAccountsForMarketplace = () => {
    return marketplaceSettings
      .filter(s => s.marketplaceType === selectedMarketplace)
      .map(s => s.accountName);
  };

  const handleCheckPrices = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Ошибка',
        description: 'Выберите аккаунт',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCheckingPrices(true);
      setPriceCheckResults([]);
      setSelectedProducts(new Set());
      // Очищаем localStorage
      try {
        localStorage.removeItem('priceCheckResults');
      } catch (e) {
        console.error('Ошибка очистки localStorage:', e);
      }
      
      const result = await AutoPriceService.checkPrices(selectedAccount, selectedMarketplace);
      
      setPriceCheckResults(result.results);
      // Сохраняем результаты в localStorage
      try {
        localStorage.setItem('priceCheckResults', JSON.stringify(result.results));
      } catch (e) {
        console.error('Ошибка сохранения результатов:', e);
      }
      
      const needsUpdateCount = result.results.filter(r => r.needsUpdate).length;
      
      toast({
        title: 'Проверка завершена',
        description: `Проверено: ${result.checked} товаров. Требуют исправления: ${needsUpdateCount}`,
      });

      if (result.errors.length > 0) {
        const errorMessages = result.errors.slice(0, 3);
        const hasTokenError = errorMessages.some(e => e.includes('token scope not allowed') || e.includes('Ошибка прав доступа'));
        
        toast({
          title: hasTokenError ? 'Ошибка прав доступа API' : 'Предупреждение',
          description: errorMessages.join('. '),
          variant: 'destructive',
          duration: hasTokenError ? 10000 : 5000, // Дольше показываем ошибку прав доступа
        });
      }
    } catch (error: any) {
      console.error('Ошибка проверки цен:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось проверить цены',
        variant: 'destructive',
      });
    } finally {
      setCheckingPrices(false);
    }
  };

  const handleUpdatePrices = async (productIds?: number[]) => {
    if (!selectedAccount) {
      toast({
        title: 'Ошибка',
        description: 'Выберите аккаунт',
        variant: 'destructive',
      });
      return;
    }

    // Определяем, какие товары обновлять
    let resultsToUpdate: PriceCheckResult[];
    if (productIds && productIds.length > 0) {
      // Обновляем только выбранные
      resultsToUpdate = priceCheckResults.filter(r => productIds.includes(r.productId));
    } else if (selectedProducts.size > 0) {
      // Обновляем выбранные через чекбоксы
      resultsToUpdate = priceCheckResults.filter(r => selectedProducts.has(r.productId) && r.needsUpdate);
    } else {
      // Обновляем все, что требует обновления
      resultsToUpdate = priceCheckResults.filter(r => r.needsUpdate);
    }

    if (resultsToUpdate.length === 0) {
      toast({
        title: 'Информация',
        description: 'Нет товаров для обновления',
      });
      return;
    }

    try {
      setUpdatingPrices(true);
      
      // Для обновления цен нужны nmId товаров
      const priceUpdates = resultsToUpdate
        .filter(result => result.nmId && result.nmId > 0)
        .map(result => ({
          nmId: result.nmId!,
          article: result.article,
          newPrice: result.suggestedPrice,
        }));

      if (priceUpdates.length === 0) {
        toast({
          title: 'Предупреждение',
          description: 'Не найдены nmId для обновления цен. Убедитесь, что товары синхронизированы с маркетплейсом.',
          variant: 'destructive',
        });
        return;
      }

      const updateResult = await AutoPriceService.updatePrices(selectedAccount, priceUpdates);
      
      toast({
        title: 'Успешно',
        description: `Обновлено цен: ${updateResult.success}`,
      });

      if (updateResult.errors.length > 0) {
        toast({
          title: 'Предупреждение',
          description: `Ошибки: ${updateResult.errors.slice(0, 2).join(', ')}`,
          variant: 'destructive',
        });
      }

      // Обновляем результаты проверки
      await handleCheckPrices();
    } catch (error: any) {
      console.error('Ошибка обновления цен:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить цены',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleToggleProduct = (productId: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    const needsUpdate = priceCheckResults.filter(r => r.needsUpdate);
    if (selectedProducts.size === needsUpdate.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(needsUpdate.map(r => r.productId)));
    }
  };

  const getStatusBadge = (result: PriceCheckResult) => {
    if (result.status === 'below_min') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Ниже минимума
        </Badge>
      );
    }
    if (result.status === 'below_recommended') {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Ниже рекомендованной
        </Badge>
      );
    }
    if (result.status === 'above_max') {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Выше максимума
        </Badge>
      );
    }
    if (result.status === 'not_found') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
          <AlertCircle className="h-3 w-3" />
          Цена не найдена
        </Badge>
      );
    }
    if (result.status === 'ok') {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle className="h-3 w-3" />
          OK
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        {result.status || 'Неизвестно'}
      </Badge>
    );
  };

  const needsUpdateCount = priceCheckResults.filter(r => r.needsUpdate).length;
  const selectedCount = priceCheckResults.filter(r => selectedProducts.has(r.productId) && r.needsUpdate).length;
  const accounts = getAccountsForMarketplace();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Управление ценами</h1>
        <p className="text-muted-foreground mt-1">
          Контроль и автоматическое исправление цен на маркетплейсах
        </p>
      </div>

      <Tabs value={selectedMarketplace} onValueChange={(v) => {
        setSelectedMarketplace(v as 'wildberries' | 'ozon');
        setSelectedAccount('');
        setPriceCheckResults([]);
        setSelectedProducts(new Set());
        // Автоматически выбираем первый аккаунт нового маркетплейса
        const firstAccount = marketplaceSettings.find(s => s.marketplaceType === v);
        if (firstAccount) {
          setSelectedAccount(firstAccount.accountName);
        }
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="wildberries">WildBerries</TabsTrigger>
          <TabsTrigger value="ozon">OZON</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedMarketplace} className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Проверка цен на {selectedMarketplace === 'wildberries' ? 'WildBerries' : 'OZON'}</CardTitle>
              <CardDescription>
                Проверьте текущие цены на маркетплейсе и сравните с минимальной и рекомендованной ценой из базы данных.
                {' '}Система автоматически показывает предупреждения о проблемах с ценами. Автоисправление работает только для товаров с включенной автоценой.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Информационный блок с пояснениями */}
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-sm">
                  <div className="font-semibold mb-2 text-blue-900 dark:text-blue-100">Пояснения к таблице:</div>
                  <div className="space-y-1.5 text-blue-800 dark:text-blue-200">
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• Текущая цена с WB</span>
                      <span className="text-xs">— фиолетовая цена с коронкой, это цена за которую товар продаётся на WildBerries (уже со скидкой)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• Процент скидки (-88%, -77% и т.д.)</span>
                      <span className="text-xs">— оранжевый бейдж показывает размер скидки на WB от базовой цены</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• "без скидки"</span>
                      <span className="text-xs">— зачёркнутая серая цена показывает базовую цену на WB до применения скидки</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• Мин. цена</span>
                      <span className="text-xs">— минимальная цена из вашей базы данных, ниже которой цена не должна опускаться</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• Рек. цена</span>
                      <span className="text-xs">— рекомендованная цена из вашей базы данных, оптимальная цена для продажи</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• "Резкий перепад (25% макс)"</span>
                      <span className="text-xs">— предупреждение о том, что изменение цены превышает максимально допустимый процент (защита от карантина на WB)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium">• Автоцена</span>
                      <span className="text-xs">— переключатель для включения автоматического исправления цен для конкретного товара</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Аккаунт</label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите аккаунт" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account} value={account}>{account}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {accounts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Добавьте аккаунт в разделе "Настройки МП" → "{selectedMarketplace === 'wildberries' ? 'WildBerries' : 'OZON'}"
                    </p>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleCheckPrices}
                    disabled={checkingPrices || !selectedAccount || accounts.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {checkingPrices ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Проверка...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Проверить цены
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {priceCheckResults.length > 0 && (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          Проверено товаров: <strong>{priceCheckResults.length}</strong>. 
                          {' '}Требуют исправления: <strong className="text-red-600">{needsUpdateCount}</strong>
                          {' '}(только с включенной автоценой)
                        </div>
                        {needsUpdateCount > 0 && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleSelectAll}
                            >
                              {selectedProducts.size === needsUpdateCount ? 'Снять выбор' : 'Выбрать все'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdatePrices()}
                              disabled={updatingPrices}
                            >
                              {updatingPrices ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Обновление...
                                </>
                              ) : (
                                <>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Исправить все ({needsUpdateCount})
                                </>
                              )}
                            </Button>
                            {selectedCount > 0 && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleUpdatePrices(Array.from(selectedProducts))}
                                disabled={updatingPrices}
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Исправить выбранные ({selectedCount})
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            {needsUpdateCount > 0 && (
                              <Checkbox
                                checked={selectedProducts.size === needsUpdateCount && needsUpdateCount > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            )}
                          </TableHead>
                          <TableHead>Артикул</TableHead>
                          <TableHead>Товар</TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <span>Текущая цена</span>
                              <Badge className="text-xs bg-[#8B00FF] hover:bg-[#7A00E6] text-white border-0">
                                <Crown className="h-2.5 w-2.5 mr-1" />
                                WB
                              </Badge>
                            </div>
                          </TableHead>
                          <TableHead>Мин. цена</TableHead>
                          <TableHead>Рек. цена</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead>Новая цена</TableHead>
                          <TableHead>Автоцена</TableHead>
                          <TableHead>Действие</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceCheckResults.map((result) => {
                          const isSelected = selectedProducts.has(result.productId);
                          const status = result.status || 'ok';
                          const rowClass = status === 'below_min' 
                            ? 'bg-red-50 dark:bg-red-950/20'
                            : status === 'below_recommended'
                            ? 'bg-yellow-50 dark:bg-yellow-950/20'
                            : status === 'above_max'
                            ? 'bg-blue-50 dark:bg-blue-950/20'
                            : status === 'not_found'
                            ? 'bg-orange-50 dark:bg-orange-950/20'
                            : '';
                          
                          return (
                            <TableRow key={result.productId} className={rowClass}>
                              <TableCell>
                                {result.needsUpdate && (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleToggleProduct(result.productId)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium">{result.article || result.sku || '—'}</TableCell>
                              <TableCell className="max-w-xs">
                                <div className="truncate" title={result.productName}>
                                  {result.productName}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#8B00FF]/10 border border-[#8B00FF]/30">
                                      <Crown className="h-3.5 w-3.5 text-[#8B00FF] flex-shrink-0" />
                                      <span className="font-bold text-[#8B00FF] text-base">
                                        {result.currentWbPrice.toFixed(2)} ₽
                                      </span>
                                    </div>
                                    {result.discount && result.discount > 0 && (
                                      <Badge className="text-xs bg-orange-500 hover:bg-orange-600 text-white border-0">
                                        -{result.discount}%
                                      </Badge>
                                    )}
                                  </div>
                                  {result.baseWbPrice && result.baseWbPrice > result.currentWbPrice && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground line-through">
                                        {result.baseWbPrice.toFixed(2)} ₽
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        без скидки
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {result.minPrice > 0 ? `${result.minPrice.toFixed(2)} ₽` : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium text-primary">
                                {result.recommendedPrice > 0 ? `${result.recommendedPrice.toFixed(2)} ₽` : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  {getStatusBadge(result)}
                                  {result.priceChangeTooLarge && (
                                    <Badge className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Резкий перепад ({result.maxChangePercent}% макс)
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(result.needsUpdate || (result.status && result.status !== 'ok' && result.status !== 'above_max')) ? (
                                  <div className="flex flex-col gap-1">
                                    <span className={`font-mono font-semibold text-base ${
                                      result.priceChangeTooLarge 
                                        ? 'text-orange-600 dark:text-orange-400' 
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>
                                      {result.suggestedPrice?.toFixed(2) || '0.00'} ₽
                                    </span>
                                    {result.priceChangeTooLarge && result.lastPrice && (
                                      <span className="text-xs text-muted-foreground font-mono">
                                        Было: {result.lastPrice.toFixed(2)} ₽
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={result.autoPriceEnabled ?? false}
                                  onCheckedChange={async (checked) => {
                                    try {
                                      await productsService.update(result.productId, {
                                        autoPriceEnabled: checked,
                                      });
                                      // Обновляем результат в списке
                                      setPriceCheckResults(prev => 
                                        prev.map(r => 
                                          r.productId === result.productId 
                                            ? { ...r, autoPriceEnabled: checked }
                                            : r
                                        )
                                      );
                                      toast({
                                        title: checked ? 'Автоцена включена' : 'Автоцена выключена',
                                        description: `Для товара "${result.productName}"`,
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: 'Ошибка',
                                        description: error.message || 'Не удалось обновить настройки',
                                        variant: 'destructive',
                                      });
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                {(result.needsUpdate || (result.status && result.status !== 'ok')) ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdatePrices([result.productId])}
                                    disabled={updatingPrices}
                                  >
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    Исправить
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {priceCheckResults.length === 0 && !checkingPrices && (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нажмите "Проверить цены" для начала проверки</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PriceManagement;
export { PriceManagement };
