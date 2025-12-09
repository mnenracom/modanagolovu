import { Product } from '@/types/product';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

const ProductCardComponent = ({ product, onAddToCart }: ProductCardProps) => {
  const navigate = useNavigate();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { activeTheme } = useTheme();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  // Получаем розничную цену
  const retailPrice = product.retailPrice ?? product.price ?? 0;
  
  // Мемоизируем materialTags для избежания пересчета
  const materialTags = useMemo(() => 
    (product.material || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
    [product.material]
  );

  // Проверяем, есть ли товар в избранном
  useEffect(() => {
    setIsFavorite(isInWishlist(product.id));
  }, [product.id, isInWishlist]);

  const handleCardClick = useCallback(() => {
    navigate(`/product/${product.id}`);
  }, [navigate, product.id]);

  const handleAddToCartClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  }, [onAddToCart, product]);

  const handleWishlistClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isToggling) return;
    
    setIsToggling(true);
    const newState = await toggleWishlist(product);
    setIsFavorite(newState);
    setIsToggling(false);
  }, [isToggling, toggleWishlist, product]);

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
          className={`absolute top-2 left-2 z-10 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-background/95 hover:bg-background transition-all shadow-sm ${
            isFavorite ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-primary'
          }`}
          onClick={handleWishlistClick}
          disabled={isToggling}
        >
          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${isFavorite ? 'fill-current' : ''}`} />
        </Button>
        
        {product.inStock && (
          <Badge variant="outline" className="text-[10px] sm:text-xs border-primary text-primary absolute top-2 right-2 z-10 bg-background/95 px-2 sm:px-2 py-0.5">
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
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        {/* Название товара */}
        <h3 className="font-semibold text-sm sm:text-lg mb-2 sm:mb-2 group-hover:text-primary transition-smooth line-clamp-2 leading-tight">
          {product.name}
        </h3>
        
        {/* Описание - скрыто на мобильных для компактности */}
        <div className="mb-2 sm:mb-3 min-h-0 sm:min-h-[2.5rem] hidden sm:block">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        </div>
        
        {/* Material tags */}
        <div className="mb-2 sm:mb-3 min-h-[1.25rem] sm:min-h-[2.5rem]">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {materialTags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap px-1.5 py-0.5">
                {tag}
              </Badge>
            ))}
            {materialTags.length > 2 && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0.5">
                +{materialTags.length - 2}
              </Badge>
            )}
          </div>
        </div>

        {/* Цена - выделена на мобильных */}
        <div className="mt-auto">
          <div className="flex items-baseline justify-between sm:justify-end">
            <span className="text-xs sm:text-sm text-muted-foreground sm:hidden">Цена:</span>
            <div className="flex items-baseline gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm text-muted-foreground mr-1 sm:mr-2">от</span>
              <p className="text-xl sm:text-2xl font-extrabold text-primary">{retailPrice.toLocaleString()} ₽</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0">
        <Button 
          className="w-full text-sm sm:text-base h-9 sm:h-10 font-semibold" 
          onClick={handleAddToCartClick}
        >
          <ShoppingCart className="mr-2 h-4 w-4 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">В корзину</span>
          <span className="sm:hidden">В корзину</span>
        </Button>
      </CardFooter>
    </Card>
  );
};

// Кастомная функция сравнения для React.memo
const areEqual = (prevProps: ProductCardProps, nextProps: ProductCardProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.retailPrice === nextProps.product.retailPrice &&
    prevProps.product.inStock === nextProps.product.inStock &&
    prevProps.product.image === nextProps.product.image &&
    prevProps.product.name === nextProps.product.name
  );
};

export const ProductCard = memo(ProductCardComponent, areEqual);
ProductCard.displayName = 'ProductCard';
