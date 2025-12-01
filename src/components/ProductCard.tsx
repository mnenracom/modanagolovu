import { Product } from '@/types/product';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export const ProductCard = ({ product, onAddToCart }: ProductCardProps) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { activeTheme } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Получаем розничную цену
  const retailPrice = product.retailPrice ?? product.price ?? 0;
  
  const materialTags = (product.material || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  // Проверяем, есть ли товар в избранном
  useEffect(() => {
    setIsFavorite(isInWishlist(product.id));
  }, [product.id, isInWishlist]);

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем переход на страницу товара
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем переход на страницу товара
    if (isToggling) return;
    
    setIsToggling(true);
    const newState = await toggleWishlist(product);
    setIsFavorite(newState);
    setIsToggling(false);
  };

  const getCardBorderClass = () => {
    if (activeTheme === 'newyear') return 'new-year-card-border';
    if (activeTheme === 'spring') return 'spring-card-border';
    return '';
  };

  return (
    <Card 
      className={`group overflow-hidden hover:shadow-elegant transition-smooth h-full flex flex-col cursor-pointer ${getCardBorderClass()}`}
      onClick={handleCardClick}
    >
      <div className="aspect-square overflow-hidden bg-muted relative">
        {/* Кнопка избранного */}
        <Button
          variant="ghost"
          size="icon"
          className={`absolute top-2 left-2 z-10 h-9 w-9 rounded-full bg-background/90 hover:bg-background transition-all ${
            isFavorite ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-primary'
          }`}
          onClick={handleWishlistClick}
          disabled={isToggling}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
        </Button>
        
        {product.inStock && (
          <Badge variant="outline" className="text-xs border-primary text-primary absolute top-2 right-2 z-10 bg-background/90">
            В наличии
          </Badge>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-smooth"
            onError={(e) => {
              // Если изображение не загрузилось, показываем placeholder
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EНет фото%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            Нет фото
          </div>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-smooth line-clamp-2">
          {product.name}
        </h3>
        <div className="mb-3 min-h-[2.5rem]">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
        {/* Material tags block (fixed two lines) */}
        <div className="mt-2 mb-1 min-h-[2.5rem] max-h-[2.5rem] overflow-hidden">
          <div className="flex flex-wrap gap-2">
            {materialTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs whitespace-nowrap">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price row: розничная цена */}
        <div className="mt-2">
          <div className="flex items-center justify-end">
            <span className="text-sm text-muted-foreground mr-2">от</span>
            <p className="text-2xl font-extrabold text-primary">{retailPrice.toLocaleString()} ₽</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={handleAddToCartClick}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          В корзину
        </Button>
      </CardFooter>
    </Card>
  );
};
