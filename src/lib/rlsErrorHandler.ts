/**
 * Обработка ошибок RLS (Row Level Security) в Supabase
 */

export interface RLSError {
  isRLSError: boolean;
  message: string;
  requiresRelogin: boolean;
}

/**
 * Проверяет, является ли ошибка ошибкой RLS
 */
export const isRLSError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  // Supabase RLS ошибки обычно содержат:
  // - "permission denied"
  // - "new row violates row-level security policy"
  // - "PGRST" коды ошибок связанные с RLS
  const rlsIndicators = [
    'permission denied',
    'row-level security',
    'RLS',
    'violates row-level security',
    'PGRST301', // PostgREST error code for RLS
    'PGRST116', // PostgREST error code for not found (может быть из-за RLS)
  ];
  
  return rlsIndicators.some(indicator => 
    errorMessage.toLowerCase().includes(indicator.toLowerCase()) ||
    errorCode.includes(indicator)
  );
};

/**
 * Обрабатывает ошибку и определяет, является ли она RLS ошибкой
 */
export const handleRLSError = (error: any): RLSError => {
  const isRLS = isRLSError(error);
  
  if (!isRLS) {
    return {
      isRLSError: false,
      message: error?.message || 'Произошла неизвестная ошибка',
      requiresRelogin: false,
    };
  }
  
  // Определяем, требуется ли перелогиниться
  // Обычно это происходит, когда токен истек или роль изменилась
  const errorMessage = error?.message || '';
  const requiresRelogin = 
    errorMessage.includes('expired') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('token');
  
  return {
    isRLSError: true,
    message: requiresRelogin
      ? 'Ваша сессия истекла или у вас нет доступа к этой операции. Пожалуйста, войдите заново.'
      : 'У вас нет прав для выполнения этой операции. Обратитесь к администратору.',
    requiresRelogin,
  };
};

/**
 * Создает пользовательское сообщение об ошибке для отображения
 */
export const getErrorMessage = (error: any): string => {
  const rlsError = handleRLSError(error);
  
  if (rlsError.isRLSError) {
    return rlsError.message;
  }
  
  // Обработка других типов ошибок
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Произошла ошибка при выполнении операции. Попробуйте еще раз.';
};




