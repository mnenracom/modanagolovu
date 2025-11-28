import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Filter } from 'lucide-react';
import { productsService } from '@/services/productsService';
import { categoriesService } from '@/services/categoriesService';
import { transformProductFromSupabase } from '@/types/productSupabase';
import { transformCategoryFromSupabase } from '@/types/categorySupabase';
import { Product } from '@/types/product';
import { Category } from '@/types/categorySupabase';

const Catalog = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  // Загружаем товары из Supabase
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const { data } = await productsService.getAll({
          in_stock: true, // Только товары в наличии
        });
        
        // Преобразуем данные из Supabase формата
        const transformedProducts = data.map(transformProductFromSupabase);
        setProducts(transformedProducts);
      } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Загружаем категории из Supabase
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await categoriesService.getActive();
        const transformed = data.map(transformCategoryFromSupabase);
        setCategories(transformed);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  // Генерируем списки цветов и материалов из загруженных товаров
  const allColors = Array.from(new Set(products.flatMap((p) => p.colors || [])));
  const allMaterials = Array.from(
    new Set(
      products
        .flatMap((p) => (p.material || '').split(',').map((m) => m.trim()))
        .filter((m) => m.length > 0)
    )
  );

  const filteredProducts = products.filter((product) => {
    // Сопоставляем категорию товара со slug категорий из Supabase
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const colorMatch =
      selectedColors.length === 0 || 
      (product.colors && selectedColors.some((c) => product.colors.includes(c)));
    const materialMatch =
      selectedMaterials.length === 0 ||
      (product.material &&
        product.material
          .split(',')
          .map((m) => m.trim())
          .some((m) => selectedMaterials.includes(m)));
    return categoryMatch && colorMatch && materialMatch;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-background">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-8">Каталог товаров</h1>
          
          {/* Filters */}
          <div className="mb-8 p-6 bg-card rounded-lg shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Фильтры</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Категория</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
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

              <div>
                <label className="text-sm font-medium mb-2 block">Материал</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedMaterials.length === 0 ? 'Все материалы' : `Материалы: ${selectedMaterials.length}`}
                      <span className="opacity-60">▾</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Искать материал..." />
                      <CommandEmpty>Ничего не найдено.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {allMaterials.map((mat) => {
                            const checked = selectedMaterials.includes(mat);
                            return (
                              <CommandItem key={mat} onSelect={() => {
                                setSelectedMaterials((prev) =>
                                  prev.includes(mat) ? prev.filter((m) => m !== mat) : [...prev, mat]
                                );
                              }}>
                                <Checkbox checked={checked} className="mr-2" />
                                {mat}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Цвет</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedColors.length === 0 ? 'Все цвета' : `Цвета: ${selectedColors.length}`}
                      <span className="opacity-60">▾</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Искать цвет..." />
                      <CommandEmpty>Ничего не найдено.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {allColors.map((color) => {
                            const checked = selectedColors.includes(color);
                            return (
                              <CommandItem key={color} onSelect={() => {
                                setSelectedColors((prev) =>
                                  prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
                                );
                              }}>
                                <Checkbox checked={checked} className="mr-2" />
                                {color}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedMaterials([]);
                    setSelectedColors([]);
                  }}
                  className="w-full"
                >
                  Сбросить фильтры
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="mb-4">
            <p className="text-muted-foreground">
              Найдено товаров: <span className="font-semibold text-foreground">{filteredProducts.length}</span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              {products.length === 0 
                ? 'Товары пока не добавлены' 
                : 'По выбранным фильтрам товары не найдены'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={(p) => addToCart(p, 1)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Catalog;
