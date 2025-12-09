import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { categoriesService } from '@/services/categoriesService';
import { transformProductFromSupabase } from '@/types/productSupabase';
import { transformCategoryFromSupabase } from '@/types/categorySupabase';
import { Product } from '@/types/product';
import { Category } from '@/types/categorySupabase';

const CategoryPage = () => {
  const { category: categorySlug } = useParams<{ category: string }>();
  const { addToCart } = useCart();
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);

  // Загружаем информацию о категории
  useEffect(() => {
    const loadCategory = async () => {
      if (!categorySlug) return;

      try {
        setCategoryLoading(true);
        const data = await categoriesService.getBySlug(categorySlug);
        const transformed = transformCategoryFromSupabase(data);
        setCategory(transformed);
      } catch (error) {
        console.error('Ошибка загрузки категории:', error);
        setCategory(null);
      } finally {
        setCategoryLoading(false);
      }
    };

    loadCategory();
  }, [categorySlug]);

  // Загружаем товары категории из Supabase
  useEffect(() => {
    const loadProducts = async () => {
      if (!categorySlug) return;

      try {
        setLoading(true);
        
        // Маппинг slug категорий к возможным именам категорий в товарах
        // Товары могут использовать либо новые slug, либо старые имена
        const categoryMapping: Record<string, string[]> = {
          'kolpaki': ['kolpaki', 'capor'], // Колпаки
          'platki': ['platki', 'scarves'], // Платки
          'kosynki': ['kosynki', 'kosinka'], // Косынки
          'kapory': ['kapory', 'capor'], // Капоры
          'bandanas': ['bandanas'], // Банданы
        };
        
        const searchTerms = categoryMapping[categorySlug] || [categorySlug];
        
        // Загружаем все товары и фильтруем по категориям
        const { data: allData } = await productsService.getAll({
          in_stock: true,
        });
        
        // Фильтруем товары по возможным вариантам категорий
        const filteredProducts = allData.filter((product: any) => 
          searchTerms.includes(product.category)
        );
        
        // Преобразуем данные из Supabase формата
        const transformedProducts = filteredProducts.map(transformProductFromSupabase);
        setCategoryProducts(transformedProducts);
      } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        setCategoryProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [categorySlug]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          {/* Кнопка "Назад" всегда видна, даже во время загрузки */}
          <Link to="/">
            <Button variant="ghost" className="mb-6" style={{ willChange: 'auto' }}>
              <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" style={{ willChange: 'auto' }} />
              Назад
            </Button>
          </Link>
          
          {categoryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : !category ? (
            <div className="text-center py-12">
              <h1 className="text-4xl font-bold mb-4">Категория не найдена</h1>
              <p className="text-muted-foreground mb-6">
                Категория с таким названием не существует
              </p>
              <Link to="/catalog">
                <Button>Вернуться в каталог</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mb-8">{category.description}</p>
              )}
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : categoryProducts.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">
                  В этой категории пока нет товаров
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={(p) => addToCart(p, 1)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryPage;
