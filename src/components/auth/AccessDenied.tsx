import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, LogIn, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AccessDeniedProps {
  message?: string;
  requiresRelogin?: boolean;
  onRetry?: () => void;
}

const AccessDenied = ({ 
  message, 
  requiresRelogin = false,
  onRetry 
}: AccessDeniedProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleRelogin = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      navigate('/admin/login');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Доступ запрещен
          </CardTitle>
          <CardDescription className="text-center">
            {requiresRelogin
              ? 'Ваша сессия истекла или изменились права доступа'
              : 'У вас нет прав для доступа к этому ресурсу'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {requiresRelogin ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Пожалуйста, войдите в систему заново, чтобы обновить права доступа.
                </p>
                <Button 
                  onClick={handleRelogin} 
                  className="w-full"
                  variant="default"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Войти заново
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Обратитесь к администратору для получения доступа.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate('/admin')} 
                    variant="outline"
                    className="flex-1"
                  >
                    На главную
                  </Button>
                  {onRetry && (
                    <Button 
                      onClick={handleRetry} 
                      variant="default"
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Попробовать снова
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;




