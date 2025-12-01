import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface MinOrderProgressProps {
  current: number;
  target: number;
  orderType: 'retail' | 'wholesale';
  isReached: boolean;
}

export const MinOrderProgress = ({
  current,
  target,
  orderType,
  isReached,
}: MinOrderProgressProps) => {
  const safeTarget = target > 0 ? target : 1; // Защита от деления на ноль
  const percentage = Math.min(100, (current / safeTarget) * 100);
  const remaining = Math.max(0, safeTarget - current);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {isReached ? (
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          )}
          <span className="font-medium truncate">
            {orderType === 'wholesale' ? 'Мин. оптовый заказ' : 'Мин. розничный заказ'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className={isReached ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}>
            {current.toLocaleString()} ₽
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">{safeTarget.toLocaleString()} ₽</span>
        </div>
      </div>
      
      <Progress 
        value={percentage} 
        className={`h-1.5 sm:h-2 ${isReached ? 'bg-green-100 dark:bg-green-900' : ''}`}
      />
      
      {!isReached && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
          <span className="text-muted-foreground">
            Осталось:
          </span>
          <span className="font-semibold text-yellow-600 dark:text-yellow-400">
            {remaining.toLocaleString()} ₽
          </span>
        </div>
      )}
      
      {isReached && (
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 w-fit text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Минимальная сумма достигнута
        </Badge>
      )}
    </div>
  );
};

