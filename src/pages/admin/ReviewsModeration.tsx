import { useState, useEffect, useMemo } from 'react';
import { Review } from '@/types/review';
import { reviewsService } from '@/services/reviewsService';
import { MarketplaceReviewsSyncService } from '@/services/marketplaceReviewsSyncService';
import { productsService } from '@/services/productsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/dialog';
import { Star, CheckCircle, XCircle, Eye, EyeOff, RefreshCw, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ReviewsModeration() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Map<number, { name: string; article: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideEmptyText, setHideEmptyText] = useState(true); // По умолчанию скрываем отзывы без текста

  useEffect(() => {
    // Сначала загружаем товары, потом отзывы
    const initialize = async () => {
      await loadProducts();
      await loadReviews();
    };
    initialize();
  }, []);

  useEffect(() => {
    loadReviews();
  }, [filterStatus, filterSource, hideEmptyText]);

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      loadReviews();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      const result = await productsService.getAll({});
      const allProducts = result.data || [];
      const productsMap = new Map<number, { name: string; article: string | null }>();
      
      allProducts.forEach(product => {
        // product.id может быть строкой, нужно преобразовать в число
        const productId = typeof product.id === 'string' ? parseInt(product.id) : product.id;
        if (productId && !isNaN(productId)) {
          productsMap.set(productId, {
            name: product.name,
            article: product.article || null,
          });
        }
      });
      
      console.log(`Загружено ${productsMap.size} товаров для отображения артикулов`);
      setProducts(productsMap);
    } catch (error: any) {
      console.error('Ошибка загрузки товаров:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterSource !== 'all') {
        params.source = filterSource;
      }

      const data = await reviewsService.getAll(params);
      
      // Фильтрация отзывов без текста (применяем первой, чтобы не обрабатывать лишние)
      let filtered = data;
      if (hideEmptyText) {
        filtered = filtered.filter(r => r.text && r.text.trim().length > 0);
      }
      
      // Фильтрация по поисковому запросу
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(r => {
          const product = products.get(r.productId);
          const productArticle = product?.article || '';
          const productName = product?.name || '';
          
          return (
            r.authorName.toLowerCase().includes(query) ||
            r.text.toLowerCase().includes(query) ||
            r.productId.toString().includes(query) ||
            productArticle.toLowerCase().includes(query) ||
            productName.toLowerCase().includes(query)
          );
        });
      }
      
      setReviews(filtered);
    } catch (error: any) {
      console.error('Ошибка загрузки отзывов:', error);
      toast.error('Ошибка загрузки отзывов');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncReviews = async () => {
    try {
      setSyncing(true);
      toast.info('Начинаем синхронизацию отзывов...');
      
      await MarketplaceReviewsSyncService.syncAllReviews();
      
      toast.success('Синхронизация отзывов завершена');
      await loadReviews();
    } catch (error: any) {
      console.error('Ошибка синхронизации отзывов:', error);
      toast.error('Ошибка синхронизации отзывов');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatus = async (
    reviewId: number,
    status: 'pending' | 'approved' | 'rejected' | 'hidden'
  ) => {
    try {
      await reviewsService.updateStatus(reviewId, status);
      toast.success('Статус отзыва обновлен');
      await loadReviews();
    } catch (error: any) {
      console.error('Ошибка обновления статуса:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleBulkUpdateStatus = async (
    reviewIds: number[],
    status: 'pending' | 'approved' | 'rejected' | 'hidden'
  ) => {
    try {
      await reviewsService.bulkUpdateStatus(reviewIds, status);
      toast.success(`Обновлено ${reviewIds.length} отзывов`);
      await loadReviews();
    } catch (error: any) {
      console.error('Ошибка массового обновления:', error);
      toast.error('Ошибка массового обновления');
    }
  };

  const handleAddReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      return;
    }

    try {
      await reviewsService.addReply(selectedReview.id, replyText);
      toast.success('Ответ добавлен');
      setReplyDialogOpen(false);
      setReplyText('');
      setSelectedReview(null);
      await loadReviews();
    } catch (error: any) {
      console.error('Ошибка добавления ответа:', error);
      toast.error('Ошибка добавления ответа');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      hidden: 'outline',
    };

    const labels: Record<string, string> = {
      approved: 'Одобрен',
      pending: 'На модерации',
      rejected: 'Отклонен',
      hidden: 'Скрыт',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const stats = {
    total: reviews.length,
    approved: reviews.filter(r => r.status === 'approved').length,
    pending: reviews.filter(r => r.status === 'pending').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Модерация отзывов</h1>
          <p className="text-muted-foreground mt-1">
            Управление отзывами с сайта и маркетплейсов
          </p>
        </div>
        <Button
          onClick={handleSyncReviews}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          Синхронизировать отзывы
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Всего отзывов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Одобрено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">На модерации</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Отклонено</p>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Поиск</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по автору, тексту, артикулу..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Скрыть отзывы без текста</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={hideEmptyText}
                  onCheckedChange={(checked) => {
                    setHideEmptyText(checked);
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {hideEmptyText ? 'Скрыты' : 'Показаны'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="pending">На модерации</SelectItem>
                  <SelectItem value="approved">Одобренные</SelectItem>
                  <SelectItem value="rejected">Отклоненные</SelectItem>
                  <SelectItem value="hidden">Скрытые</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Источник</Label>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="website">Сайт</SelectItem>
                  <SelectItem value="wildberries">WildBerries</SelectItem>
                  <SelectItem value="ozon">OZON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список отзывов */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
            <p className="mt-4 text-muted-foreground">Загрузка отзывов...</p>
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Отзывы не найдены</p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => {
            // Определяем стиль карточки в зависимости от источника отзыва
            const getCardStyle = () => {
              if (review.source === 'wildberries') {
                return 'border-l-4 border-l-[#8B00FF] bg-purple-50/50 dark:bg-purple-950/20 shadow-sm'; // Фиолетовый для WB
              } else if (review.source === 'ozon') {
                return 'border-l-4 border-l-[#005BFF] bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'; // Синий для OZON
              } else {
                return 'border-l-4 border-l-primary bg-primary/5 shadow-sm'; // Цвет сайта для отзывов с сайта
              }
            };
            
            return (
            <Card key={review.id} className={getCardStyle()}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                "h-4 w-4",
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              )}
                            />
                          ))}
                        </div>
                        {review.title && (
                          <span className="font-semibold">{review.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{review.authorName}</span>
                        {review.verifiedPurchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Подтвержденная покупка
                          </Badge>
                        )}
                        {review.source !== 'website' && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs font-semibold",
                              review.source === 'wildberries' 
                                ? 'border-[#8B00FF] text-[#8B00FF] bg-purple-50 dark:bg-purple-950/30' 
                                : 'border-[#005BFF] text-[#005BFF] bg-blue-50 dark:bg-blue-950/30'
                            )}
                          >
                            {review.source === 'wildberries' ? 'WB' : 'OZON'}
                          </Badge>
                        )}
                        {getStatusBadge(review.status)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(review.createdAt), 'dd MMMM yyyy HH:mm', { locale: ru })}
                        </span>
                        {(() => {
                          // Преобразуем productId в число для поиска в Map
                          const productId = typeof review.productId === 'string' ? parseInt(review.productId) : review.productId;
                          const product = products.get(productId);
                          
                          // Если товары еще не загружены, показываем ID
                          if (products.size === 0) {
                            return (
                              <span className="text-sm text-muted-foreground">
                                Товар ID: {productId}
                              </span>
                            );
                          }
                          
                          // Если товар не найден в кэше, показываем ID
                          if (!product) {
                            return (
                              <span className="text-sm text-muted-foreground">
                                Товар ID: {productId} (не найден)
                              </span>
                            );
                          }
                          
                          const article = product.article;
                          const productName = product.name;
                          
                          return (
                            <span className="text-sm text-muted-foreground">
                              {article ? `Артикул: ${article}` : `Товар ID: ${productId}`}
                              {productName && (
                                <span className="ml-2 text-xs">({productName.length > 30 ? productName.substring(0, 30) + '...' : productName})</span>
                              )}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Текст отзыва */}
                  <p className="text-sm whitespace-pre-line">{review.text}</p>

                  {/* Плюсы и минусы */}
                  {(review.pros || review.cons) && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {review.pros && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                            Плюсы
                          </p>
                          <p className="text-sm">{review.pros}</p>
                        </div>
                      )}
                      {review.cons && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md">
                          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                            Минусы
                          </p>
                          <p className="text-sm">{review.cons}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Фото */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {review.photos.slice(0, 4).map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Фото ${idx + 1}`}
                          className="w-20 h-20 rounded-md object-cover border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  {/* Действия */}
                  <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                    {review.status !== 'approved' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleUpdateStatus(review.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Одобрить
                      </Button>
                    )}
                    {review.status !== 'rejected' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(review.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Отклонить
                      </Button>
                    )}
                    {review.status !== 'hidden' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(review.id, 'hidden')}
                      >
                        <EyeOff className="h-4 w-4 mr-1" />
                        Скрыть
                      </Button>
                    )}
                    {review.status === 'hidden' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(review.id, 'approved')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Показать
                      </Button>
                    )}
                    {!review.replyText && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReview(review);
                          setReplyDialogOpen(true);
                        }}
                      >
                        Ответить
                      </Button>
                    )}
                    <span className="text-sm text-muted-foreground ml-auto">
                      Полезно: {review.helpfulCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      {/* Диалог ответа */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ответить на отзыв</DialogTitle>
            <DialogDescription>
              Ваш ответ будет виден всем пользователям
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ответ</Label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Введите ответ на отзыв..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddReply} disabled={!replyText.trim()}>
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


