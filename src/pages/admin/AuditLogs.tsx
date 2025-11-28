import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { auditLogService, AuditLog } from '@/services/auditLogService';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FileText, Search, Filter, Download } from 'lucide-react';

const AuditLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Фильтры
  const [filters, setFilters] = useState({
    action: 'all',
    entityType: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // Убираем filters из зависимостей, чтобы избежать бесконечных запросов

  // Отдельный эффект для фильтров с debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1); // Сбрасываем на первую страницу при изменении фильтров
      loadLogs();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Преобразуем 'all' в пустую строку для API
      const apiFilters = {
        ...filters,
        action: filters.action === 'all' ? '' : filters.action,
        entityType: filters.entityType === 'all' ? '' : filters.entityType,
        page,
        limit,
      };
      const result = await auditLogService.getAll(apiFilters);
      console.log('Загружено логов:', result.data?.length || 0, 'Всего:', result.count || 0);
      setLogs(result.data || []);
      setTotalCount(result.count || 0);
    } catch (error: any) {
      console.error('Ошибка загрузки логов:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Проверяем, существует ли таблица
      if (error.message?.includes('does not exist') || error.message?.includes('relation') || error.code === '42P01') {
        toast({
          title: 'Таблица не найдена',
          description: 'Выполните SQL-скрипт create_audit_logs_table.sql в Supabase Dashboard',
          variant: 'destructive',
          duration: 10000,
        });
        setLogs([]);
        setTotalCount(0);
      } else if (
        error.message?.includes('permission denied') || 
        error.message?.includes('row-level security') ||
        error.message?.includes('Ошибка доступа к логам') ||
        error.code === 'PGRST301' ||
        error.status === 401 ||
        error.status === 403
      ) {
        toast({
          title: 'Ошибка доступа',
          description: 'Проверьте RLS политики для таблицы audit_logs. Выполните fix_audit_logs_rls.sql в Supabase Dashboard',
          variant: 'destructive',
          duration: 10000,
        });
        setLogs([]);
        setTotalCount(0);
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось загрузить логи. Проверьте консоль браузера для деталей.',
          variant: 'destructive',
          duration: 10000,
        });
        setLogs([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1); // Сбрасываем на первую страницу при изменении фильтров
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      case 'login':
        return 'outline';
      case 'logout':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Создание',
      update: 'Обновление',
      delete: 'Удаление',
      login: 'Вход',
      logout: 'Выход',
      view: 'Просмотр',
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      product: 'Товар',
      category: 'Категория',
      banner: 'Баннер',
      order: 'Заказ',
      user: 'Пользователь',
    };
    return labels[type] || type;
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Логи действий</h1>
        <p className="text-muted-foreground">История всех действий в админ-панели</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="mb-2 block">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Поиск по названию, email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action" className="mb-2 block">Действие</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все действия" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все действия</SelectItem>
                  <SelectItem value="create">Создание</SelectItem>
                  <SelectItem value="update">Обновление</SelectItem>
                  <SelectItem value="delete">Удаление</SelectItem>
                  <SelectItem value="login">Вход</SelectItem>
                  <SelectItem value="logout">Выход</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityType" className="mb-2 block">Тип сущности</Label>
              <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все типы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все типы</SelectItem>
                  <SelectItem value="product">Товар</SelectItem>
                  <SelectItem value="category">Категория</SelectItem>
                  <SelectItem value="banner">Баннер</SelectItem>
                  <SelectItem value="order">Заказ</SelectItem>
                  <SelectItem value="user">Пользователь</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица логов */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>История действий</CardTitle>
              <CardDescription>
                Всего записей: {totalCount}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Экспорт
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Логи не найдены</p>
              <p className="text-sm text-muted-foreground">
                {totalCount === 0 
                  ? 'Выполните SQL-скрипт create_audit_logs_table.sql в Supabase Dashboard для создания таблицы логов'
                  : 'Попробуйте изменить фильтры поиска'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Сущность</TableHead>
                      <TableHead>IP адрес</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.createdAt), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {log.userEmail || 'Система'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getEntityTypeLabel(log.entityType)}
                        </TableCell>
                        <TableCell>
                          {log.entityName || `ID: ${log.entityId || 'N/A'}`}
                        </TableCell>
                        <TableCell>
                          {log.ipAddress || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Страница {page} из {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Назад
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;

