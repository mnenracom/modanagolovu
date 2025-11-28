import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { productNotificationsService } from '@/services/productNotificationsService';
import { useUserAuth } from '@/hooks/useUserAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductNotificationButtonProps {
  productId: number;
  productName: string;
  className?: string;
}

export function ProductNotificationButton({
  productId,
  productName,
  className,
}: ProductNotificationButtonProps) {
  const { user, isAuthenticated } = useUserAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    checkSubscription();
  }, [productId, user?.id, isAuthenticated]);

  const checkSubscription = async () => {
    if (!isAuthenticated && !user?.email) {
      setChecking(false);
      return;
    }

    try {
      setChecking(true);
      const subscribed = await productNotificationsService.isSubscribed(
        productId,
        user?.id,
        user?.email
      );
      setIsSubscribed(subscribed);
      if (user?.email) {
        setEmail(user.email);
      }
    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!email.trim()) {
      toast.error('Введите email');
      return;
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Введите корректный email');
      return;
    }

    try {
      setLoading(true);
      await productNotificationsService.subscribe(
        {
          productId,
          email: email.trim(),
        },
        user?.id
      );
      
      setIsSubscribed(true);
      setDialogOpen(false);
      toast.success('Вы подписались на уведомление о поступлении товара');
    } catch (error: any) {
      console.error('Ошибка подписки:', error);
      toast.error(error.message || 'Ошибка подписки на уведомление');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      await productNotificationsService.unsubscribe(
        productId,
        user?.id,
        user?.email || email
      );
      
      setIsSubscribed(false);
      toast.success('Вы отписались от уведомлений');
    } catch (error: any) {
      console.error('Ошибка отписки:', error);
      toast.error(error.message || 'Ошибка отписки от уведомления');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Bell className="h-4 w-4 mr-2" />
        Загрузка...
      </Button>
    );
  }

  if (isSubscribed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnsubscribe}
        disabled={loading}
        className={cn("text-green-600 border-green-600 hover:bg-green-50", className)}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        {loading ? 'Отписка...' : 'Подписан на уведомление'}
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        <Bell className="h-4 w-4 mr-2" />
        Уведомить о поступлении
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Уведомление о поступлении товара</DialogTitle>
            <DialogDescription>
              Мы отправим вам уведомление, когда товар "{productName}" снова появится в наличии.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notification-email">Email</Label>
              <Input
                id="notification-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                На этот email придет уведомление, когда товар появится в наличии
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubscribe} disabled={loading || !email.trim()}>
              {loading ? 'Подписка...' : 'Подписаться'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}




