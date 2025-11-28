import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { abTestingService, ABTest } from '@/services/abTestingService';
import { productsService } from '@/services/productsService';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Plus, Edit, Trash2, Play, Pause, RefreshCw, TrendingUp } from 'lucide-react';
import { transformProductFromSupabase } from '@/types/productSupabase';

const ABTesting = () => {
  const { toast } = useToast();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [products, setProducts] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const { abTestResults, refresh: refreshAnalytics } = useAnalytics();

  const [formData, setFormData] = useState({
    test_name: '',
    product_id: '',
    control_threshold: 10,
    variant_threshold: 15,
    traffic_split: 50,
    status: 'active' as ABTest['status'],
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsData, productsData] = await Promise.all([
        abTestingService.getAll(),
        productsService.getAll({ limit: 1000 }),
      ]);

      setTests(testsData);
      setProducts(
        (productsData.data || []).map((p: any) => {
          const product = transformProductFromSupabase(p);
          return { id: parseInt(product.id), name: product.name };
        })
      );
    } catch (error: any) {
      console.error('Ошибка загрузки данных:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось загрузить данные',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTest) {
        await abTestingService.update(editingTest.id!, formData);
        toast({
          title: 'Успешно',
          description: 'A/B тест обновлён',
        });
      } else {
        await abTestingService.create({
          ...formData,
          product_id: parseInt(formData.product_id),
        });
        toast({
          title: 'Успешно',
          description: 'A/B тест создан',
        });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
      refreshAnalytics();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось сохранить A/B тест',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (test: ABTest) => {
    setEditingTest(test);
    setFormData({
      test_name: test.test_name,
      product_id: test.product_id.toString(),
      control_threshold: test.control_threshold,
      variant_threshold: test.variant_threshold,
      traffic_split: test.traffic_split || 50,
      status: test.status,
      notes: test.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот A/B тест?')) return;

    try {
      await abTestingService.delete(id);
      toast({
        title: 'Успешно',
        description: 'A/B тест удалён',
      });
      loadData();
      refreshAnalytics();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить A/B тест',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (id: number, status: ABTest['status']) => {
    try {
      await abTestingService.update(id, { status });
      toast({
        title: 'Успешно',
        description: `Тест ${status === 'active' ? 'активирован' : status === 'paused' ? 'приостановлен' : 'завершён'}`,
      });
      loadData();
      refreshAnalytics();
    } catch (error: any) {
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось изменить статус',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      test_name: '',
      product_id: '',
      control_threshold: 10,
      variant_threshold: 15,
      traffic_split: 50,
      status: 'active',
      notes: '',
    });
    setEditingTest(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      paused: 'secondary',
      completed: 'outline',
      archived: 'secondary',
    };
    const labels: Record<string, string> = {
      active: 'Активен',
      paused: 'Приостановлен',
      completed: 'Завершён',
      archived: 'Архивирован',
    };
    return <Badge variant={variants[status] || 'secondary'}>{labels[status] || status}</Badge>;
  };

  const getTestResult = (testId: number) => {
    return abTestResults.find((r) => r.testId === testId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">A/B тестирование порогов</h1>
          <p className="text-gray-600 mt-2">Тестирование различных порогов оптовых цен</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Создать тест
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Редактировать тест' : 'Создать новый тест'}</DialogTitle>
              <DialogDescription>
                Настройте параметры A/B теста для сравнения различных порогов оптовых цен
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="test_name">Название теста</Label>
                  <Input
                    id="test_name"
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="product_id">Товар</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="control_threshold">Контрольный порог (шт.)</Label>
                  <Input
                    id="control_threshold"
                    type="number"
                    min="1"
                    value={formData.control_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, control_threshold: parseInt(e.target.value) || 10 })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="variant_threshold">Вариант порога (шт.)</Label>
                  <Input
                    id="variant_threshold"
                    type="number"
                    min="1"
                    value={formData.variant_threshold}
                    onChange={(e) =>
                      setFormData({ ...formData, variant_threshold: parseInt(e.target.value) || 15 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="traffic_split">Разделение трафика (%)</Label>
                  <Input
                    id="traffic_split"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.traffic_split}
                    onChange={(e) =>
                      setFormData({ ...formData, traffic_split: parseInt(e.target.value) || 50 })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as ABTest['status'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активен</SelectItem>
                      <SelectItem value="paused">Приостановлен</SelectItem>
                      <SelectItem value="completed">Завершён</SelectItem>
                      <SelectItem value="archived">Архивирован</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">{editingTest ? 'Сохранить' : 'Создать'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Список тестов */}
      <Card>
        <CardHeader>
          <CardTitle>Активные тесты</CardTitle>
          <CardDescription>Список всех A/B тестов порогов</CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Товар</TableHead>
                  <TableHead>Пороги</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Результаты</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const result = getTestResult(test.id!);
                  const product = products.find((p) => p.id === test.product_id);

                  return (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.test_name}</TableCell>
                      <TableCell>{product?.name || `ID: ${test.product_id}`}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Badge variant="outline">Контроль: {test.control_threshold} шт.</Badge>
                          <Badge variant="outline">Вариант: {test.variant_threshold} шт.</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(test.status)}</TableCell>
                      <TableCell>
                        {result ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              Контроль: {result.controlConversionRate.toFixed(1)}% (
                              {result.controlConversions}/{result.controlVisitors})
                            </div>
                            <div className="text-sm">
                              Вариант: {result.variantConversionRate.toFixed(1)}% (
                              {result.variantConversions}/{result.variantVisitors})
                            </div>
                            {result.winner !== 'inconclusive' && (
                              <Badge variant={result.winner === 'variant' ? 'default' : 'secondary'}>
                                Победитель: {result.winner === 'variant' ? 'Вариант' : 'Контроль'} (
                                {result.confidence}%)
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Нет данных</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {test.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(test.id!, 'paused')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(test.id!, 'active')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => handleEdit(test)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(test.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">Нет созданных тестов</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ABTesting;


