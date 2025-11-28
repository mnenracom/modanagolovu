import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isRLSError, handleRLSError } from '@/lib/rlsErrorHandler';
import { toast } from 'sonner';

/**
 * Хук для обработки RLS ошибок в компонентах
 */
export const useRLSErrorHandler = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isHandling, setIsHandling] = useState(false);

  /**
   * Обрабатывает ошибку и показывает соответствующее сообщение
   */
  const handleError = useCallback(async (error: any, customMessage?: string) => {
    if (isHandling) return;
    
    setIsHandling(true);
    
    try {
      const rlsError = handleRLSError(error);
      
      if (rlsError.isRLSError) {
        if (rlsError.requiresRelogin) {
          // Показываем сообщение и предлагаем перелогиниться
          toast.error(rlsError.message, {
            duration: 5000,
            action: {
              label: 'Войти заново',
              onClick: async () => {
                try {
                  await signOut();
                  navigate('/admin/login');
                } catch (err) {
                  console.error('Ошибка при выходе:', err);
                  navigate('/admin/login');
                }
              },
            },
          });
        } else {
          // Показываем сообщение об отсутствии прав
          toast.error(rlsError.message, {
            duration: 5000,
          });
        }
      } else {
        // Обычная ошибка
        const message = customMessage || rlsError.message;
        toast.error(message, {
          duration: 5000,
        });
      }
    } finally {
      setIsHandling(false);
    }
  }, [signOut, navigate, isHandling]);

  /**
   * Обертка для async функций с автоматической обработкой ошибок
   */
  const withErrorHandling = useCallback(async <T,>(
    fn: () => Promise<T>,
    customMessage?: string
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error: any) {
      await handleError(error, customMessage);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    withErrorHandling,
    isRLSError,
  };
};




