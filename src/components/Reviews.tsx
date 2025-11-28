import { useState, useEffect } from 'react';
import { Review, ReviewStats } from '@/types/review';
import { reviewsService } from '@/services/reviewsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ThumbsUp, CheckCircle, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReviewsProps {
  productId: number;
  className?: string;
}

export function Reviews({ productId, className }: ReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'rating_high' | 'helpful'>('newest');
  const [showAll, setShowAll] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [productId, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await reviewsService.getByProduct(productId, {
        status: 'approved',
        sortBy,
        limit: showAll ? 100 : 5,
      });
      setReviews(data);
    } catch (error) {
      console.error('Ошибка загрузки отзывов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await reviewsService.getStats(productId);
      setStats(data);
    } catch (error) {
      console.error('Ошибка загрузки статистики отзывов:', error);
    }
  };

  const toggleExpand = (reviewId: number) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const handleMarkHelpful = async (reviewId: number) => {
    try {
      await reviewsService.markHelpful(reviewId);
      // Обновляем локально
      setReviews(prev =>
        prev.map(r => r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r)
      );
    } catch (error) {
      console.error('Ошибка отметки "Полезно":', error);
    }
  };

  if (loading && !stats) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Отзывы</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Пока нет отзывов. Будьте первым, кто оставит отзыв!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Статистика */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            Отзывы и рейтинги
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Средний рейтинг */}
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-5 w-5",
                        star <= Math.round(stats.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.totalReviews} {stats.totalReviews === 1 ? 'отзыв' : stats.totalReviews < 5 ? 'отзыва' : 'отзывов'}
                </p>
              </div>
            </div>

            {/* Распределение рейтингов */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-8">{rating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Сортировка */}
      {reviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={sortBy === 'newest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('newest')}
          >
            Новые
          </Button>
          <Button
            variant={sortBy === 'rating_high' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('rating_high')}
          >
            Высокий рейтинг
          </Button>
          <Button
            variant={sortBy === 'helpful' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('helpful')}
          >
            Полезные
          </Button>
        </div>
      )}

      {/* Список отзывов */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-muted-foreground text-center">
                Нет отзывов для отображения
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {reviews.map((review) => {
              const isExpanded = expandedReviews.has(review.id);
              const textLines = review.text.split('\n').length;
              const isLongText = textLines > 3 || review.text.length > 300;

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
                      {/* Заголовок отзыва */}
                      <div className="flex items-start justify-between gap-4">
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                            <span>
                              {format(new Date(review.createdAt), 'dd MMMM yyyy', { locale: ru })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Текст отзыва */}
                      <div className="space-y-2">
                        {isLongText && !isExpanded ? (
                          <>
                            <p className="text-sm whitespace-pre-line line-clamp-3">
                              {review.text}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(review.id)}
                              className="h-auto p-0 text-primary"
                            >
                              Читать полностью
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-sm whitespace-pre-line">{review.text}</p>
                            {isLongText && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(review.id)}
                                className="h-auto p-0 text-primary"
                              >
                                Свернуть
                                <ChevronUp className="h-4 w-4 ml-1" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Плюсы и минусы */}
                      {(review.pros || review.cons) && (
                        <div className="grid md:grid-cols-2 gap-3">
                          {review.pros && (
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
                              <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                                Плюсы
                              </p>
                              <p className="text-sm text-green-900 dark:text-green-300">
                                {review.pros}
                              </p>
                            </div>
                          )}
                          {review.cons && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                                Минусы
                              </p>
                              <p className="text-sm text-red-900 dark:text-red-300">
                                {review.cons}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Фото */}
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {review.photos.slice(0, 4).map((photo, idx) => (
                            <div
                              key={idx}
                              className="relative w-20 h-20 rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(photo, '_blank')}
                            >
                              <img
                                src={photo}
                                alt={`Фото отзыва ${idx + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                          {review.photos.length > 4 && (
                            <div className="w-20 h-20 rounded-md border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                              +{review.photos.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Действия */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkHelpful(review.id)}
                          className="h-auto p-0"
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Полезно ({review.helpfulCount})
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Показать все / Свернуть */}
            {reviews.length >= 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAll(!showAll);
                    loadReviews();
                  }}
                >
                  {showAll ? 'Свернуть' : `Показать все отзывы (${stats.totalReviews})`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


