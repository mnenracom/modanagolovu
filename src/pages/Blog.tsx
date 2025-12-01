import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SEO } from '@/components/SEO';
import { articlesService } from '@/services/articlesService';
import { articleCategoriesService } from '@/services/articleCategoriesService';
import { Article } from '@/types/articleSupabase';
import { ArticleCategory } from '@/types/articleSupabase';
import { Search, Calendar, Eye, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const Blog = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    loadCategories();
    loadArticles();
  }, [selectedCategory, currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadArticles();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadCategories = async () => {
    try {
      const data = await articleCategoriesService.getActive();
      setCategories(data);
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      const data = await articlesService.getPublished({
        categorySlug: selectedCategory !== 'all' ? selectedCategory : undefined,
        search: searchTerm || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      });
      setArticles(data);
    } catch (error) {
      console.error('Ошибка загрузки статей:', error);
    } finally {
      setLoading(false);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <SEO
        title="Блог - Новости и статьи"
        description="Читайте последние новости и статьи о платках, косынках, банданах и капорах. Полезные советы и тренды в мире аксессуаров."
        keywords="новости, статьи, платки, косынки, банданы, капоры, мода, аксессуары"
      />
      <div className="flex min-h-screen flex-col w-full overflow-x-hidden">
        <Header />
        <main className="flex-1 w-full overflow-x-hidden">
          {/* Hero секция */}
          <section className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 py-12">
            <div className="container mx-auto px-4">
              <h1 className="text-4xl font-bold text-center mb-4">Блог и новости</h1>
              <p className="text-center text-muted-foreground max-w-2xl mx-auto">
                Читайте последние новости, полезные статьи и советы о платках, косынках и аксессуарах
              </p>
            </div>
          </section>

          {/* Фильтры */}
          <section className="py-8 border-b">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Поиск статей..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Статьи */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Статьи не найдены</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => (
                    <Card key={article.id} className="flex flex-col hover:shadow-lg transition-shadow">
                      {article.featuredImageUrl && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={article.featuredImageUrl}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="flex-1 flex flex-col p-6">
                        <div className="flex items-center gap-2 mb-2">
                          {article.category && (
                            <Badge variant="outline">{article.category.name}</Badge>
                          )}
                          {article.isFeatured && (
                            <Badge variant="default">Избранное</Badge>
                          )}
                        </div>
                        <h2 className="text-xl font-bold mb-2 line-clamp-2">
                          {article.title}
                        </h2>
                        {article.excerpt && (
                          <p className="text-muted-foreground mb-4 flex-1 line-clamp-3">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                          <div className="flex items-center gap-4">
                            {article.publishedAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(article.publishedAt), 'dd.MM.yyyy', { locale: ru })}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {article.viewsCount}
                            </div>
                          </div>
                        </div>
                        <Link to={`/blog/${article.slug}`}>
                          <Button variant="outline" className="w-full">
                            Читать далее
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Пагинация */}
              {articles.length > 0 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Назад
                  </Button>
                  <span className="flex items-center px-4">
                    Страница {currentPage}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={articles.length < itemsPerPage}
                  >
                    Вперед
                  </Button>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Blog;




