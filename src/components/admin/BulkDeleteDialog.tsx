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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { productsService } from '@/services/productsService';
import { Trash2, AlertTriangle, Calendar, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteComplete: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  onDeleteComplete,
}: BulkDeleteDialogProps) {
  const [filterType, setFilterType] = useState<'date' | 'source' | 'batch'>('date');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [importSource, setImportSource] = useState('');
  const [importBatchId, setImportBatchId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const handlePreview = async () => {
    try {
      setLoadingPreview(true);
      // Получаем все товары для подсчета
      const { data: allProducts } = await productsService.getAll({ limit: 10000 });
      
      let filtered: any[] = allProducts;

      if (filterType === 'date') {
        if (!dateFrom && !dateTo) {
          toast.error('Укажите хотя бы одну дату');
          return;
        }
        filtered = allProducts.filter((p: any) => {
          if (!p.importedAt) return false;
          const importDate = new Date(p.importedAt);
          if (dateFrom && importDate < new Date(dateFrom)) return false;
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // До конца дня
            if (importDate > toDate) return false;
          }
          return true;
        });
      } else if (filterType === 'source') {
        if (!importSource) {
          toast.error('Выберите источник импорта');
          return;
        }
        filtered = allProducts.filter((p: any) => p.importSource === importSource);
      } else if (filterType === 'batch') {
        if (!importBatchId) {
          toast.error('Введите ID партии импорта');
          return;
        }
        filtered = allProducts.filter((p: any) => p.importBatchId === importBatchId);
      }

      setPreviewCount(filtered.length);
    } catch (error: any) {
      console.error('Ошибка предпросмотра:', error);
      toast.error('Ошибка подсчета товаров');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDelete = async () => {
    if (!previewCount || previewCount === 0) {
      toast.error('Нет товаров для удаления');
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить ${previewCount} товаров? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      setDeleting(true);
      
      // Получаем все товары
      const { data: allProducts } = await productsService.getAll({ limit: 10000 });
      
      let toDelete: any[] = [];

      if (filterType === 'date') {
        toDelete = allProducts.filter((p: any) => {
          if (!p.importedAt) return false;
          const importDate = new Date(p.importedAt);
          if (dateFrom && importDate < new Date(dateFrom)) return false;
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (importDate > toDate) return false;
          }
          return true;
        });
      } else if (filterType === 'source') {
        toDelete = allProducts.filter((p: any) => p.importSource === importSource);
      } else if (filterType === 'batch') {
        toDelete = allProducts.filter((p: any) => p.importBatchId === importBatchId);
      }

      // Удаляем товары
      let deletedCount = 0;
      let errorCount = 0;

      for (const product of toDelete) {
        try {
          await productsService.delete(parseInt(product.id));
          deletedCount++;
        } catch (error) {
          console.error(`Ошибка удаления товара ${product.id}:`, error);
          errorCount++;
        }
      }

      toast.success(
        `Удалено товаров: ${deletedCount}${errorCount > 0 ? `, ошибок: ${errorCount}` : ''}`
      );

      // Сбрасываем состояние
      setPreviewCount(null);
      setDateFrom('');
      setDateTo('');
      setImportSource('');
      setImportBatchId('');
      onOpenChange(false);
      onDeleteComplete();
    } catch (error: any) {
      console.error('Ошибка массового удаления:', error);
      toast.error(`Ошибка: ${error.message || 'Не удалось удалить товары'}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Массовое удаление товаров
          </DialogTitle>
          <DialogDescription>
            Удалите товары по фильтрам: дате импорта, источнику или партии импорта
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Внимание!</strong> Удаление товаров необратимо. Все связанные данные (заказы, отзывы, избранное) также будут затронуты.
            </AlertDescription>
          </Alert>

          {/* Выбор типа фильтра */}
          <div className="space-y-2">
            <Label>Тип фильтра</Label>
            <Select value={filterType} onValueChange={(value: any) => {
              setFilterType(value);
              setPreviewCount(null);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    По дате импорта
                  </div>
                </SelectItem>
                <SelectItem value="source">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    По источнику импорта
                  </div>
                </SelectItem>
                <SelectItem value="batch">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    По партии импорта
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Фильтр по дате */}
          {filterType === 'date' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Дата от</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPreviewCount(null);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Дата до</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPreviewCount(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Фильтр по источнику */}
          {filterType === 'source' && (
            <div className="space-y-2">
              <Label htmlFor="import-source">Источник импорта</Label>
              <Select value={importSource} onValueChange={(value) => {
                setImportSource(value);
                setPreviewCount(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wildberries">WildBerries</SelectItem>
                  <SelectItem value="ozon">OZON</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="manual">Ручной ввод</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Фильтр по партии */}
          {filterType === 'batch' && (
            <div className="space-y-2">
              <Label htmlFor="batch-id">ID партии импорта</Label>
              <Input
                id="batch-id"
                placeholder="import_1234567890_abc123"
                value={importBatchId}
                onChange={(e) => {
                  setImportBatchId(e.target.value);
                  setPreviewCount(null);
                }}
              />
              <p className="text-xs text-muted-foreground">
                ID партии можно найти в метаданных товара или в логах импорта
              </p>
            </div>
          )}

          {/* Предпросмотр */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={loadingPreview || deleting}
            >
              {loadingPreview ? 'Подсчет...' : 'Подсчитать товары'}
            </Button>
            {previewCount !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Найдено товаров:
                </span>
                <Badge variant={previewCount > 0 ? 'destructive' : 'outline'}>
                  {previewCount}
                </Badge>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!previewCount || previewCount === 0 || deleting}
          >
            {deleting ? 'Удаление...' : `Удалить ${previewCount || 0} товаров`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

