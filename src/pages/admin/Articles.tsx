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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Eye, Calendar } from 'lucide-react';
import { articlesService } from '@/services/articlesService';
import { Article } from '@/types/articleSupabase';
import ArticleForm from '@/components/admin/ArticleForm';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const Articles = () => {
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);

  useEffect(() => {
    loadArticles();
  }, [statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadArticles();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await articlesService.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm || undefined,
      });
      setArticles(data);
    } catch (error: any) {
      console.error('Ошибка загрузки статей:', error);
      
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для просмотра статей',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось загрузить статьи',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingArticle) return;

    try {
      await articlesService.delete(parseInt(deletingArticle.id));
      toast({
        title: 'Успешно',
        description: 'Статья удалена',
      });
      await loadArticles();
      setDeletingArticle(null);
    } catch (error: any) {
      console.error('Ошибка удаления статьи:', error);
      
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для удаления статей',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось удалить статью',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingArticle) {
        await articlesService.update(parseInt(editingArticle.id), data);
        toast({
          title: 'Успешно',
          description: 'Статья обновлена',
        });
      } else {
        await articlesService.create(data);
        toast({
          title: 'Успешно',
          description: 'Статья создана',
        });
      }
      
      setIsDialogOpen(false);
      setEditingArticle(null);
      await loadArticles();
    } catch (error: any) {
      console.error('Ошибка сохранения статьи:', error);
      
      if (error.isRLSError) {
        toast({
          title: 'Ошибка доступа',
          description: error.message || 'У вас нет прав для сохранения статей',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: error.message || 'Не удалось сохранить статью',
          variant: 'destructive',
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default">Опубликовано</Badge>;
      case 'draft':
        return <Badge variant="secondary">Черновик</Badge>;
      case 'archived':
        return <Badge variant="outline">Архив</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Статьи блога</h1>
          <p className="text-muted-foreground">Управление статьями и новостями</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Создать статью
        </Button>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по заголовку, содержанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
                <SelectItem value="published">Опубликованные</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица статей */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Статьи не найдены</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Автор</TableHead>
                  <TableHead>Просмотры</TableHead>
                  <TableHead>Дата публикации</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {article.featuredImageUrl && (
                          <img
                            src={article.featuredImageUrl}
                            alt={article.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <div>{article.title}</div>
                          {article.isFeatured && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Избранная
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.category ? (
                        <Badge variant="outline">{article.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(article.status)}</TableCell>
                    <TableCell>{article.authorName || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        {article.viewsCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      {article.publishedAt ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(article.publishedAt), 'dd.MM.yyyy', { locale: ru })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(article)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingArticle(article)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Редактировать статью' : 'Создать статью'}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? 'Внесите изменения в статью'
                : 'Заполните форму для создания новой статьи'}
            </DialogDescription>
          </DialogHeader>
          <ArticleForm
            article={editingArticle}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingArticle(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={!!deletingArticle} onOpenChange={() => setDeletingArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить статью "{deletingArticle?.title}"? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Articles;




