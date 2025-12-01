import { Star, Package, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarketplaceStatsData {
  totalRating: number;
  totalReviews: number;
  totalProductsSold: number;
  yearsOnPlatform: number;
  monthsOnPlatform: number;
}

interface MarketplaceStatsProps {
  data?: MarketplaceStatsData;
}

// Дефолтные данные (можно заменить на данные из настроек или API)
const defaultStats: MarketplaceStatsData = {
  totalRating: 4.85, // Средний рейтинг со всех магазинов
  totalReviews: 4081, // 2215 (WB) + 1866 (OZON)
  totalProductsSold: 9308, // Товаров продано
  yearsOnPlatform: 2,
  monthsOnPlatform: 1,
};

const MarketplaceStats = ({ data = defaultStats }: MarketplaceStatsProps) => {
  const stats = data || defaultStats;

  return (
    <section className="border-b bg-background/50 backdrop-blur-sm relative z-[60]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
          {/* Рейтинг */}
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base">{stats.totalRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">
                ({stats.totalReviews.toLocaleString()} {stats.totalReviews === 1 ? 'оценка' : stats.totalReviews < 5 ? 'оценки' : 'оценок'})
              </span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="hidden md:block w-px h-6 bg-border" />

          {/* Товаров продано */}
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base">{stats.totalProductsSold.toLocaleString()}</span>
              <span className="text-muted-foreground text-xs">товаров продано</span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="hidden md:block w-px h-6 bg-border" />

          {/* На платформе */}
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-base">
                {stats.yearsOnPlatform} {stats.yearsOnPlatform === 1 ? 'год' : stats.yearsOnPlatform < 5 ? 'года' : 'лет'} {stats.monthsOnPlatform} {stats.monthsOnPlatform === 1 ? 'мес' : 'мес'}
              </span>
              <span className="text-muted-foreground text-xs">на маркетплейсах</span>
            </div>
          </div>

          {/* Разделитель */}
          <div className="hidden lg:block w-px h-6 bg-border" />

          {/* Кнопки маркетплейсов */}
          <div className="flex flex-wrap items-center justify-center gap-2 relative z-[61]">
            <a 
              href="https://www.wildberries.ru/seller/285549" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block relative z-[62]"
            >
              <Button size="sm" variant="secondary" className="h-7 text-xs px-3 relative z-[63] bg-background/95 hover:bg-background border shadow-sm">
                Wildberries 1
              </Button>
            </a>
            <a 
              href="https://www.wildberries.ru/seller/250051301" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block relative z-[62]"
            >
              <Button size="sm" variant="secondary" className="h-7 text-xs px-3 relative z-[63] bg-background/95 hover:bg-background border shadow-sm">
                Wildberries 2
              </Button>
            </a>
            <a 
              href="https://www.ozon.ru/seller/modanagolovu-2581934/?miniapp=seller_2581934" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block relative z-[62]"
            >
              <Button size="sm" variant="secondary" className="h-7 text-xs px-3 relative z-[63] bg-background/95 hover:bg-background border shadow-sm">
                OZON 1
              </Button>
            </a>
            <a 
              href="https://www.ozon.ru/seller/pugovka-1039508/?miniapp=seller_1039508" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block relative z-[62]"
            >
              <Button size="sm" variant="secondary" className="h-7 text-xs px-3 relative z-[63] bg-background/95 hover:bg-background border shadow-sm">
                OZON 2
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export { MarketplaceStats };
export default MarketplaceStats;

