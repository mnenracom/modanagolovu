import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { articlesService } from '@/services/articlesService';
import { Article } from '@/types/articleSupabase';
import { Calendar, Eye, ArrowLeft, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ArticleDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (slug) {
      loadArticle();
    }
  }, [slug]);

  const loadArticle = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      const data = await articlesService.getBySlug(slug);
      setArticle(data);

      // Загружаем похожие статьи
      if (data.categoryId) {
        const related = await articlesService.getPublished({
          categorySlug: data.category?.slug,
          limit: 3,
        });
        setRelatedArticles(related.filter(a => a.id !== data.id).slice(0, 3));
      }
    } catch (error: any) {
      console.error('Ошибка загрузки статьи:', error);
      if (error.message?.includes('не найдена')) {
        navigate('/blog');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Статья не найдена</h1>
            <Button onClick={() => navigate('/blog')}>Вернуться в блог</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        title={article.metaTitle || article.title}
        description={article.metaDescription || article.excerpt || ''}
        keywords={article.metaKeywords}
        image={article.ogImageUrl || article.featuredImageUrl}
        url={`/blog/${article.slug}`}
        type="article"
      />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          {/* Hero секция */}
          {article.featuredImageUrl && (
            <section className="relative h-96 overflow-hidden">
              <img
                src={article.featuredImageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </section>
          )}

          <section className="py-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <Button
                variant="ghost"
                onClick={() => navigate('/blog')}
                className="mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад к блогу
              </Button>

              <article>
                {/* Заголовок и метаданные */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    {article.category && (
                      <Badge variant="outline">{article.category.name}</Badge>
                    )}
                    {article.isFeatured && (
                      <Badge variant="default">Избранное</Badge>
                    )}
                  </div>
                  <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                    {article.publishedAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(article.publishedAt), 'dd MMMM yyyy', { locale: ru })}
                      </div>
                    )}
                    {article.authorName && (
                      <div>Автор: {article.authorName}</div>
                    )}
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {article.viewsCount} просмотров
                    </div>
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Содержание */}
                <div
                  className="article-content mb-12 text-lg leading-relaxed"
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Похожие статьи */}
                {relatedArticles.length > 0 && (
                  <div className="mt-12 pt-12 border-t">
                    <h2 className="text-2xl font-bold mb-6">Похожие статьи</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {relatedArticles.map((related) => (
                        <Card key={related.id} className="hover:shadow-lg transition-shadow">
                          {related.featuredImageUrl && (
                            <div className="relative h-32 overflow-hidden rounded-t-lg">
                              <img
                                src={related.featuredImageUrl}
                                alt={related.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <h3 className="font-bold mb-2 line-clamp-2">{related.title}</h3>
                            {related.excerpt && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {related.excerpt}
                              </p>
                            )}
                            <Link to={`/blog/${related.slug}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                Читать далее
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ArticleDetail;

