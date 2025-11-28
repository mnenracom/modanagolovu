import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, Download, Upload, Image as ImageIcon, FileSpreadsheet, Trash, Eye, EyeOff, Package, X, Loader2, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { categoriesService } from '@/services/categoriesService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/types/product';
import { transformProductFromSupabase, transformProductToSupabase } from '@/types/productSupabase';
import { Category, transformCategoryFromSupabase } from '@/types/categorySupabase';
import ProductForm from '@/components/admin/ProductForm';
import { ProductImportDialog } from '@/components/admin/ProductImportDialog';
import { BulkDeleteDialog } from '@/components/admin/BulkDeleteDialog';
import { exportProductsToExcel } from '@/services/productExcelService';
import { useToast } from '@/hooks/use-toast';

const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'all' | 'sku'>('all'); // Поиск по всем полям или только по артикулу
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoriesService.getAll();
      const transformed = data.map(transformCategoryFromSupabase);
      setCategories(transformed);
    } catch (error: any) {
      console.error('Ошибка загрузки категорий:', error);
      // В случае ошибки используем базовые категории
      setCategories([
        { id: '1', name: 'Платки', slug: 'scarves', orderIndex: 1, isActive: true },
        { id: '2', name: 'Банданы', slug: 'bandanas', orderIndex: 2, isActive: true },
        { id: '3', name: 'Капор', slug: 'capor', orderIndex: 3, isActive: true },
        { id: '4', name: 'Косынки', slug: 'kosinka', orderIndex: 4, isActive: true },
      ]);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data } = await productsService.getAll({
        search: searchTerm || undefined,
      });
      
      // Преобразуем данные из Supabase формата
      const transformedProducts = data.map(transformProductFromSupabase);
      setProducts(transformedProducts);
    } catch (error: any) {
      console.error('Ошибка загрузки товаров:', error);
      
      // Проверяем RLS ошибки
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для просмотра товаров',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось загрузить товары',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadProducts();
        // Сбрасываем выделение при изменении поиска
        setSelectedProducts(new Set());
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchBy]);

  const handleCreate = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;

    try {
      await productsService.delete(parseInt(id));
      toast({
        title: 'Успешно',
        description: 'Товар удален',
      });
      await loadProducts();
    } catch (error: any) {
      console.error('Ошибка удаления товара:', error);
      
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для удаления товаров',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось удалить товар',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      // Преобразуем данные в формат Supabase
      const supabaseData = transformProductToSupabase(data);
      
      // Обрабатываем изображения
      // Фильтруем существующие изображения (только URL, не data:image для предпросмотра)
      const existingImages = (data.images || []).filter((img: string) => 
        (img.startsWith('http') || img.startsWith('https')) && !img.startsWith('data:image')
      );
      
      // Загружаем новые изображения в Supabase Storage если есть
      if (data.imageFiles && data.imageFiles.length > 0) {
        const imageUrls = await Promise.all(
          data.imageFiles.map((file: File) => 
            productsService.uploadImage(file, editingProduct ? parseInt(editingProduct.id) : undefined)
          )
        );
        // Объединяем существующие URL и новые загруженные URL
        supabaseData.images = [...existingImages, ...imageUrls];
      } else {
        // Только существующие изображения (URL)
        supabaseData.images = existingImages;
      }

      if (editingProduct) {
        await productsService.update(parseInt(editingProduct.id), supabaseData);
        toast({
          title: 'Успешно',
          description: 'Товар обновлен',
        });
      } else {
        await productsService.create(supabaseData);
        toast({
          title: 'Успешно',
          description: 'Товар создан',
        });
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (error: any) {
      console.error('Ошибка сохранения товара:', error);
      
      // Проверяем, является ли это RLS ошибкой
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для выполнения этой операции',
          variant: 'destructive',
          duration: 5000,
          action: error.requiresRelogin ? {
            label: 'Войти заново',
            onClick: () => {
              window.location.href = '/admin/login';
            },
          } : undefined,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось сохранить товар',
          variant: 'destructive',
        });
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Название',
      'Описание',
      'Категория',
      'Подкатегория',
      'Материал',
      'SKU',
      'Остаток',
      'Мин. количество',
      'Цена (мин)',
      'Оптовая цена',
      'Цвета',
      'Размеры',
      'В наличии',
    ];

    const rows = products.map((product) => [
      product.id,
      product.name,
      product.description || '',
      product.category,
      product.subcategory || '',
      product.material,
      product.sku || '',
      product.stock || 0,
      product.priceRanges[0]?.minQuantity || 1,
      product.priceRanges[0]?.price || 0,
      product.priceRanges[0]?.price || 0, // wholesale_price
      product.colors.join('; '),
      product.sizes.join('; '),
      product.inStock ? 'Да' : 'Нет',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = async () => {
    try {
      await exportProductsToExcel();
      toast({
        title: 'Успешно',
        description: 'Товары экспортированы в Excel файл',
      });
    } catch (error: any) {
      console.error('Ошибка экспорта в Excel:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось экспортировать товары',
        variant: 'destructive',
      });
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.split('\n').filter((line) => line.trim());
        const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

        // Парсинг CSV
        const importedProducts = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
          return {
            name: values[headers.indexOf('Название')] || '',
            description: values[headers.indexOf('Описание')] || '',
            category: values[headers.indexOf('Категория')] || 'scarves',
            subcategory: values[headers.indexOf('Подкатегория')] || '',
            material: values[headers.indexOf('Материал')] || '',
            sku: values[headers.indexOf('SKU')] || '',
            stock_quantity: parseInt(values[headers.indexOf('Остаток')] || '0'),
            min_order_quantity: 1, // Розница - всегда минимум 1 шт
            price: parseFloat(values[headers.indexOf('Цена (мин)')] || '0'),
            wholesale_price: parseFloat(values[headers.indexOf('Оптовая цена')] || '0'),
            colors: values[headers.indexOf('Цвета')]?.split(';').map((c) => c.trim()).filter(Boolean) || [],
            sizes: values[headers.indexOf('Размеры')]?.split(';').map((s) => s.trim()).filter(Boolean) || [],
            in_stock: values[headers.indexOf('В наличии')] === 'Да',
          };
        });

        // Массовое создание товаров
        for (const product of importedProducts) {
          await productsService.create(product);
        }

        toast({
          title: 'Успешно',
          description: `Импортировано ${importedProducts.length} товаров`,
        });
        await loadProducts();
      } catch (error: any) {
        console.error('Ошибка импорта CSV:', error);
        toast({
          title: 'Ошибка',
          description: error.message || 'Ошибка при импорте CSV файла',
          variant: 'destructive',
        });
      }
    };
    input.click();
  };

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    if (searchBy === 'sku') {
      return product.sku?.toLowerCase().includes(searchLower) || false;
    }
    
    // Поиск по всем полям
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.material.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    );
  });

  // Функция сортировки
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Если уже сортируем по этой колонке, меняем направление
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Если новая колонка, устанавливаем её и направление по умолчанию
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Сортированные товары
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'sku':
        aValue = (a.sku || '').toLowerCase();
        bValue = (b.sku || '').toLowerCase();
        break;
      case 'stock':
        aValue = getTotalStock(a);
        bValue = getTotalStock(b);
        break;
      case 'price':
        aValue = a.retailPrice ?? a.price ?? 0;
        bValue = b.retailPrice ?? b.price ?? 0;
        break;
      case 'inStock':
        aValue = a.inStock ? 1 : 0;
        bValue = b.inStock ? 1 : 0;
        break;
      case 'showInNewProducts':
        aValue = ((a as any).showInNewProducts || false) ? 1 : 0;
        bValue = ((b as any).showInNewProducts || false) ? 1 : 0;
        break;
      default:
        return 0;
    }

    // Сравнение
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Компонент для заголовка с сортировкой
  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => {
    const isSorted = sortColumn === column;
    return (
      <TableHead 
        className="cursor-pointer select-none hover:bg-muted/50"
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center gap-2">
          {children}
          {isSorted ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )
          ) : (
            <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
          )}
        </div>
      </TableHead>
    );
  };

  const getTotalStock = (product: Product) => {
    if (product.variations && product.variations.length > 0) {
      return product.variations.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    return product.stock || 0;
  };

  // Работа с выбранными товарами
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(sortedProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const isAllSelected = sortedProducts.length > 0 && selectedProducts.size === sortedProducts.length;

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const isSomeSelected = selectedProducts.size > 0 && selectedProducts.size < sortedProducts.length;

  // Массовые действия
  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите товары для удаления',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Вы уверены, что хотите удалить ${selectedProducts.size} товар(ов)?`)) return;

    try {
      setBulkActionLoading(true);
      let deleted = 0;
      let errors = 0;

      for (const productId of selectedProducts) {
        try {
          await productsService.delete(parseInt(productId));
          deleted++;
        } catch (error: any) {
          console.error(`Ошибка удаления товара ${productId}:`, error);
          errors++;
        }
      }

      toast({
        title: 'Успешно',
        description: `Удалено ${deleted} товар(ов)${errors > 0 ? `. Ошибок: ${errors}` : ''}`,
      });

      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error: any) {
      console.error('Ошибка массового удаления:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось удалить товары',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateStatus = async (field: 'in_stock' | 'show_in_new_products' | 'show_in_bestsellers', value: boolean) => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите товары для обновления',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBulkActionLoading(true);
      let updated = 0;
      let errors = 0;

      for (const productId of selectedProducts) {
        try {
          const updateData: any = {};
          if (field === 'in_stock') {
            updateData.in_stock = value;
          } else if (field === 'show_in_new_products') {
            updateData.show_in_new_products = value;
          } else if (field === 'show_in_bestsellers') {
            updateData.show_in_bestsellers = value;
          }
          await productsService.update(parseInt(productId), updateData);
          updated++;
        } catch (error: any) {
          console.error(`Ошибка обновления товара ${productId}:`, error);
          errors++;
        }
      }

      const actionName = field === 'in_stock' 
        ? (value ? 'опубликованы' : 'скрыты')
        : field === 'show_in_new_products'
        ? (value ? 'добавлены в новинки' : 'удалены из новинок')
        : (value ? 'добавлены в хиты продаж' : 'удалены из хитов продаж');

      toast({
        title: 'Успешно',
        description: `${updated} товар(ов) ${actionName}${errors > 0 ? `. Ошибок: ${errors}` : ''}`,
      });

      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error: any) {
      console.error('Ошибка массового обновления:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить товары',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateCategory = async (category: string) => {
    if (selectedProducts.size === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите товары для обновления',
        variant: 'destructive',
      });
      return;
    }

    try {
      setBulkActionLoading(true);
      let updated = 0;
      let errors = 0;

      for (const productId of selectedProducts) {
        try {
          await productsService.update(parseInt(productId), { category });
          updated++;
        } catch (error: any) {
          console.error(`Ошибка обновления товара ${productId}:`, error);
          errors++;
        }
      }

      toast({
        title: 'Успешно',
        description: `Категория обновлена для ${updated} товар(ов)${errors > 0 ? `. Ошибок: ${errors}` : ''}`,
      });

      setSelectedProducts(new Set());
      await loadProducts();
    } catch (error: any) {
      console.error('Ошибка массового обновления категории:', error);
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось обновить категорию',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Товары</h1>
          <p className="text-gray-600 mt-2">Управление товарами</p>
        </div>
               <div className="flex gap-2">
                 <Button variant="outline" onClick={handleExportExcel}>
                   <FileSpreadsheet className="h-4 w-4 mr-2" />
                   Экспорт Excel
                 </Button>
                 <Button variant="outline" onClick={handleExportCSV}>
                   <Download className="h-4 w-4 mr-2" />
                   Экспорт CSV
                 </Button>
                 <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                   <Upload className="h-4 w-4 mr-2" />
                   Импорт Excel
                 </Button>
                 <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(true)} className="text-red-600 hover:text-red-700">
                   <Trash className="h-4 w-4 mr-2" />
                   Массовое удаление
                 </Button>
                 <Button onClick={handleCreate}>
                   <Plus className="h-4 w-4 mr-2" />
                   Добавить товар
                 </Button>
               </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={searchBy === 'sku' ? 'Поиск по артикулу...' : 'Поиск товаров...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={searchBy} onValueChange={(value: 'all' | 'sku') => setSearchBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Тип поиска" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">По всем полям</SelectItem>
            <SelectItem value="sku">По артикулу</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Панель массовых действий */}
      {selectedProducts.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium text-sm">
                  Выбрано: {selectedProducts.size} товар(ов)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProducts(new Set())}
                  disabled={bulkActionLoading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Снять выделение
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleBulkUpdateCategory} disabled={bulkActionLoading}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Изменить категорию" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="scarves">Платки</SelectItem>
                        <SelectItem value="bandanas">Банданы</SelectItem>
                        <SelectItem value="capor">Капор</SelectItem>
                        <SelectItem value="kosinka">Косынки</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('in_stock', true)}
                  disabled={bulkActionLoading}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Опубликовать
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('in_stock', false)}
                  disabled={bulkActionLoading}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  Скрыть
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('show_in_new_products', true)}
                  disabled={bulkActionLoading}
                >
                  <Package className="h-4 w-4 mr-1" />
                  В новинки
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('show_in_new_products', false)}
                  disabled={bulkActionLoading}
                >
                  <Package className="h-4 w-4 mr-1" />
                  Убрать из новинок
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('show_in_bestsellers', true)}
                  disabled={bulkActionLoading}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  В хиты продаж
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkUpdateStatus('show_in_bestsellers', false)}
                  disabled={bulkActionLoading}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Убрать из хитов
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                >
                  {bulkActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Удаление...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Удалить
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Выбрать все"
                    />
                  </TableHead>
                  <TableHead>Изображение</TableHead>
                  <SortableHeader column="name">Название</SortableHeader>
                  <SortableHeader column="category">Категория</SortableHeader>
                  <SortableHeader column="sku">SKU</SortableHeader>
                  <TableHead>Артикул</TableHead>
                  <SortableHeader column="stock">Остаток</SortableHeader>
                  <SortableHeader column="price">Цена (мин)</SortableHeader>
                  <SortableHeader column="inStock">В наличии</SortableHeader>
                  <SortableHeader column="showInNewProducts">Новинки</SortableHeader>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                      Товары не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          aria-label={`Выбрать ${product.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.subcategory && (
                            <div className="text-sm text-gray-500">{product.subcategory}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {product.article || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getTotalStock(product)}</div>
                          {product.variations && product.variations.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {product.variations.length} вариаций
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          // Проверяем все возможные источники цены
                          const priceFromRange = product.priceRanges?.[0]?.price;
                          const retailPrice = product.retailPrice;
                          const basePrice = product.price;
                          
                          // Находим первую валидную цену (больше 0)
                          const validPrice = 
                            (priceFromRange !== undefined && priceFromRange !== null && priceFromRange > 0) ? priceFromRange :
                            (retailPrice !== undefined && retailPrice !== null && retailPrice > 0) ? retailPrice :
                            (basePrice !== undefined && basePrice !== null && basePrice > 0) ? basePrice :
                            null;
                          
                          return validPrice ? `${validPrice.toLocaleString('ru-RU')} ₽` : '₽';
                        })()}
                        {product.discount && (
                          <div className="text-xs text-red-600">
                            -{product.discount}%
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.inStock ? (
                          <Badge variant="default" className="bg-green-600">
                            Да
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Нет</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(product as any).showInNewProducts || false ? (
                          <Badge variant="default" className="bg-blue-600">
                            Да
                          </Badge>
                        ) : (
                          <Badge variant="outline">Нет</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Редактировать товар' : 'Создать товар'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Измените информацию о товаре' : 'Заполните информацию о товаре'}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <ProductForm
              product={editingProduct}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingProduct(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог импорта товаров */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadProducts}
      />

      {/* Диалог массового удаления */}
      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onDeleteComplete={loadProducts}
      />
    </div>
  );
};

export default Products;
