import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { ProductImportService, ImportedProduct, ImportPreview } from '@/services/productImportService';
import { ProductPriceImportService, PriceImportData } from '@/services/productPriceImportService';
import { importProductsFromExcel } from '@/services/productExcelService';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Loader2, DollarSign, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ProductImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSource, setImportSource] = useState('wildberries');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [activeTab, setActiveTab] = useState('our-format'); // По умолчанию наш формат
  
  // Для нашего формата Excel
  const [ourFormatFile, setOurFormatFile] = useState<File | null>(null);
  const [importingOurFormat, setImportingOurFormat] = useState(false);
  
  // Для второго этапа - импорт цен (старый формат)
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [priceData, setPriceData] = useState<PriceImportData[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [mergingPrices, setMergingPrices] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Проверяем расширение файла
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Выберите Excel файл (.xlsx или .xls)');
      return;
    }

    setFile(selectedFile);

    try {
      setLoading(true);
      console.log('Начинаем парсинг файла:', selectedFile.name);
      const previewData = await ProductImportService.previewImport(selectedFile);
      console.log('Результат парсинга:', previewData);
      setPreview(previewData);
      
      if (previewData.totalCount === 0) {
        toast.warning('Файл прочитан, но товары не найдены. Проверьте формат файла и названия колонок.');
      } else {
        toast.success(`Найдено товаров: ${previewData.totalCount}, валидных: ${previewData.validCount}`);
      }
    } catch (error: any) {
      console.error('Ошибка предпросмотра импорта:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось прочитать файл'}`);
      setFile(null);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.products.length === 0) {
      toast.error('Нет товаров для импорта');
      return;
    }

    if (preview.errors.length > 0) {
      toast.error('Исправьте ошибки перед импортом');
      return;
    }

    try {
      setImporting(true);
      const results = await ProductImportService.importProducts(
        preview.products,
        importSource,
        {
          updateExisting,
          skipDuplicates,
        }
      );

      toast.success(
        `Импорт завершен: создано ${results.created}, обновлено ${results.updated}, пропущено ${results.skipped}`
      );

      if (results.errors.length > 0) {
        console.warn('Ошибки при импорте:', results.errors);
        toast.warning(`Некоторые товары не были импортированы. Проверьте консоль.`);
      }

      // Сбрасываем состояние
      setFile(null);
      setPreview(null);
      onOpenChange(false);
      onImportComplete();
    } catch (error: any) {
      console.error('Ошибка импорта:', error);
      toast.error(`Ошибка импорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleOurFormatFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Выберите Excel файл (.xlsx или .xls)');
      return;
    }

    setOurFormatFile(selectedFile);
  };

  const handleOurFormatImport = async () => {
    if (!ourFormatFile) {
      toast.error('Выберите Excel файл');
      return;
    }

    try {
      setImportingOurFormat(true);
      const results = await importProductsFromExcel(ourFormatFile, {
        updateExisting,
        skipDuplicates,
      });

      toast.success(
        `Импорт завершен: создано ${results.created}, обновлено ${results.updated}, пропущено ${results.skipped}`
      );

      if (results.errors.length > 0) {
        console.warn('Ошибки при импорте:', results.errors);
        toast.warning(`Некоторые товары не были импортированы. Проверьте консоль.`);
      }

      setOurFormatFile(null);
      onOpenChange(false);
      onImportComplete();
    } catch (error: any) {
      console.error('Ошибка импорта:', error);
      toast.error(`Ошибка импорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setImportingOurFormat(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setOurFormatFile(null);
    setPriceFile(null);
    setPriceData([]);
    setMergeResult(null);
    onOpenChange(false);
  };

  const handlePriceFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Выберите Excel файл (.xlsx или .xls)');
      return;
    }

    setPriceFile(selectedFile);

          try {
            setLoadingPrices(true);
            console.log('Начинаем парсинг файла с ценами:', selectedFile.name);
            const prices = await ProductPriceImportService.parsePriceFile(selectedFile);
            console.log('Результат парсинга цен:', prices);
            console.log('Примеры распарсенных данных:', prices.slice(0, 3));
            setPriceData(prices);
            
            if (prices.length === 0) {
              toast.warning('Файл прочитан, но данные о ценах не найдены. Проверьте консоль браузера (F12) для подробностей.');
              console.warn('Не найдено записей с ценами. Проверьте:');
              console.warn('1. Есть ли в файле строка с заголовками (АРТИКУЛ, себестоимость, рекомендованная цена)');
              console.warn('2. Правильно ли названы колонки');
              console.warn('3. Есть ли данные в строках после заголовков');
            } else {
              const withPrices = prices.filter(p => p.costPrice || p.recommendedPrice);
              const withSkuOnly = prices.filter(p => p.sku && !p.costPrice && !p.recommendedPrice);
              toast.success(`Найдено записей: ${prices.length} (с ценами: ${withPrices.length}, только артикулы: ${withSkuOnly.length})`);
            }
          } catch (error: any) {
            console.error('Ошибка парсинга файла с ценами:', error);
            console.error('Полная ошибка:', error);
            toast.error(`Ошибка: ${error.message || 'Не удалось прочитать файл'}. Откройте консоль (F12) для подробностей.`);
            setPriceFile(null);
            setPriceData([]);
          } finally {
            setLoadingPrices(false);
          }
  };

  const handleMergePrices = async () => {
    if (priceData.length === 0) {
      toast.error('Нет данных о ценах для объединения');
      return;
    }

    try {
      setMergingPrices(true);
      const result = await ProductPriceImportService.mergePricesWithProducts(priceData, {
        updateCostPrice: true,
        updateRecommendedPrice: true,
        updateBarcode: true,
        updateDescription: false, // Не перезаписываем описания из WB
      });

      setMergeResult(result);
      
      toast.success(
        `Объединение завершено: найдено ${result.matched}, обновлено ${result.updated}, не найдено ${result.notFound.length}`
      );

      if (result.notFound.length > 0) {
        toast.warning(`Не найдено товаров по артикулам: ${result.notFound.slice(0, 10).join(', ')}${result.notFound.length > 10 ? '...' : ''}`);
      }

      if (result.errors.length > 0) {
        console.warn('Ошибки при объединении:', result.errors);
      }

      onImportComplete();
    } catch (error: any) {
      console.error('Ошибка объединения цен:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось объединить данные'}`);
    } finally {
      setMergingPrices(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт товаров из Excel</DialogTitle>
          <DialogDescription>
            Рекомендуется использовать "Наш формат" - выгрузите Excel, заполните и загрузите обратно.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="our-format" className="flex items-center gap-1">
              <FileCheck className="h-3 w-3" />
              Наш формат
            </TabsTrigger>
            <TabsTrigger value="products">Товары из WB</TabsTrigger>
            <TabsTrigger value="prices">Объединение с ценами</TabsTrigger>
          </TabsList>

          <TabsContent value="our-format" className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Рекомендуемый способ:</strong> Нажмите "Экспорт Excel" на странице товаров, заполните файл и загрузите его здесь.
                Все колонки уже настроены под нашу базу данных.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="our-format-file">Выберите Excel файл (.xlsx, .xls)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="our-format-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleOurFormatFileSelect}
                  disabled={importingOurFormat}
                />
                {ourFormatFile && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {ourFormatFile.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Файл должен содержать колонки: артикул, название, описание, категория, материал, себестоимость, рекомендованная_цена, розничная_цена, оптовая_цена, остаток, в_наличии, цвета, размеры, баркод
              </p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Настройки импорта</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="update-existing-our">Обновлять существующие товары</Label>
                    <p className="text-xs text-muted-foreground">
                      Если товар с таким SKU уже существует, он будет обновлен
                    </p>
                  </div>
                  <Switch
                    id="update-existing-our"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                    disabled={importingOurFormat}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="skip-duplicates-our">Пропускать дубликаты</Label>
                    <p className="text-xs text-muted-foreground">
                      Если товар уже существует и обновление отключено, он будет пропущен
                    </p>
                  </div>
                  <Switch
                    id="skip-duplicates-our"
                    checked={skipDuplicates}
                    onCheckedChange={setSkipDuplicates}
                    disabled={importingOurFormat}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 py-4">
          {/* Выбор файла */}
          <div className="space-y-2">
            <Label htmlFor="import-file">Выберите Excel файл (.xlsx, .xls)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={loading || importing}
              />
              {file && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {file.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Настройки импорта */}
          <div className="space-y-3 border-t pt-4">
            <Label>Настройки импорта</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="import-source">Источник импорта</Label>
                  <p className="text-xs text-muted-foreground">
                    Будет сохранен для возможности фильтрации
                  </p>
                </div>
                <select
                  id="import-source"
                  value={importSource}
                  onChange={(e) => setImportSource(e.target.value)}
                  className="px-3 py-1.5 border rounded-md text-sm"
                  disabled={importing}
                >
                  <option value="wildberries">WildBerries</option>
                  <option value="ozon">OZON</option>
                  <option value="excel">Excel (общий)</option>
                  <option value="csv">CSV</option>
                  <option value="manual">Ручной ввод</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="update-existing">Обновлять существующие товары</Label>
                  <p className="text-xs text-muted-foreground">
                    Если товар с таким SKU уже существует, он будет обновлен
                  </p>
                </div>
                <Switch
                  id="update-existing"
                  checked={updateExisting}
                  onCheckedChange={setUpdateExisting}
                  disabled={importing}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="skip-duplicates">Пропускать дубликаты</Label>
                  <p className="text-xs text-muted-foreground">
                    Если товар уже существует и обновление отключено, он будет пропущен
                  </p>
                </div>
                <Switch
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={setSkipDuplicates}
                  disabled={importing}
                />
              </div>
            </div>
          </div>

          {/* Предпросмотр */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Загрузка и анализ файла...</span>
            </div>
          )}

          {preview && !loading && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Предпросмотр импорта</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Всего: {preview.totalCount}
                  </Badge>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Валидных: {preview.validCount}
                  </Badge>
                  {preview.invalidCount > 0 && (
                    <Badge variant="destructive">
                      Ошибок: {preview.invalidCount}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ошибки и предупреждения */}
              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Ошибки ({preview.errors.length}):</div>
                    <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                      {preview.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {preview.errors.length > 10 && (
                        <li>... и еще {preview.errors.length - 10} ошибок</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {preview.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Предупреждения ({preview.warnings.length}):</div>
                    <ul className="list-disc list-inside text-xs space-y-1 max-h-32 overflow-y-auto">
                      {preview.warnings.slice(0, 10).map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                      {preview.warnings.length > 10 && (
                        <li>... и еще {preview.warnings.length - 10} предупреждений</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Таблица предпросмотра */}
              {preview.products.length > 0 && (
                <div className="border rounded-lg">
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Название</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Категория</TableHead>
                          <TableHead>Цена</TableHead>
                          <TableHead>Остаток</TableHead>
                          <TableHead className="w-[100px]">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.products.slice(0, 20).map((product, index) => {
                          const isValid = product.name && product.sku;
                          return (
                            <TableRow key={index}>
                              <TableCell className="text-xs text-muted-foreground">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {product.name || (
                                  <span className="text-red-500">Нет названия</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {product.sku || (
                                  <span className="text-red-500">Нет SKU</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                {product.category || 'scarves'}
                              </TableCell>
                              <TableCell className="text-xs">
                                {product.price || product.retail_price || '-'} ₽
                              </TableCell>
                              <TableCell className="text-xs">
                                {product.stock_quantity ?? '-'}
                              </TableCell>
                              <TableCell>
                                {isValid ? (
                                  <Badge variant="default" className="bg-green-600 text-xs">
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    Ошибка
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {preview.products.length > 20 && (
                    <div className="p-2 text-xs text-center text-muted-foreground border-t">
                      Показано 20 из {preview.products.length} товаров
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </TabsContent>

          <TabsContent value="prices" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price-file">Выберите Excel файл с ценами (себестоимость, рекомендованная цена)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="price-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handlePriceFileSelect}
                  disabled={loadingPrices || mergingPrices}
                />
                {priceFile && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FileSpreadsheet className="h-3 w-3" />
                    {priceFile.name}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Файл должен содержать колонки: Артикул, себестоимость, рекомендованная цена
              </p>
            </div>

            {loadingPrices && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Загрузка и анализ файла...</span>
              </div>
            )}

            {priceData.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Данные о ценах</h3>
                  <Badge variant="outline">
                    Найдено: {priceData.length}
                  </Badge>
                </div>

                <div className="border rounded-lg">
                  <div className="max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Артикул</TableHead>
                          <TableHead>Себестоимость</TableHead>
                          <TableHead>Рекоменд. цена</TableHead>
                          <TableHead>Баркод</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceData.slice(0, 20).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell className="text-xs">
                              {item.costPrice ? `${item.costPrice.toFixed(2)} ₽` : '-'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {item.recommendedPrice ? `${item.recommendedPrice.toFixed(2)} ₽` : '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {item.barcode || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {priceData.length > 20 && (
                    <div className="p-2 text-xs text-center text-muted-foreground border-t">
                      Показано 20 из {priceData.length} записей
                    </div>
                  )}
                </div>

                {mergeResult && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Результат объединения:</div>
                      <ul className="list-disc list-inside text-xs space-y-1">
                        <li>Найдено совпадений: {mergeResult.matched}</li>
                        <li>Обновлено товаров: {mergeResult.updated}</li>
                        {mergeResult.notFound.length > 0 && (
                          <li className="text-yellow-600">
                            Не найдено товаров: {mergeResult.notFound.length}
                            {mergeResult.notFound.length <= 10 && (
                              <span className="ml-1">({mergeResult.notFound.join(', ')})</span>
                            )}
                          </li>
                        )}
                        {mergeResult.errors.length > 0 && (
                          <li className="text-red-600">
                            Ошибок: {mergeResult.errors.length}
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleMergePrices}
                  disabled={mergingPrices || priceData.length === 0}
                  className="w-full"
                >
                  {mergingPrices ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Объединение...
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Объединить с товарами ({priceData.length} записей)
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={importing || mergingPrices || importingOurFormat}>
            Отмена
          </Button>
          {activeTab === 'our-format' && (
            <Button
              onClick={handleOurFormatImport}
              disabled={!ourFormatFile || importingOurFormat}
            >
              {importingOurFormat ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Импортировать
                </>
              )}
            </Button>
          )}
          {activeTab === 'products' && (
            <Button
              onClick={handleImport}
              disabled={!preview || preview.validCount === 0 || importing || preview.errors.length > 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Импорт...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Импортировать ({preview?.validCount || 0} товаров)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

