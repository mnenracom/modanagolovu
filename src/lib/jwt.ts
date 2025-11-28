// Утилиты для работы с JWT токенами

export interface JWTPayload {
  userId: string;
  role: string;
  email?: string;
  exp?: number;
}

/**
 * Декодирует JWT токен (без проверки подписи, только для клиента)
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Ошибка декодирования JWT:', error);
    return null;
  }
};

/**
 * Проверяет, не истек ли токен
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }
  
  return Date.now() >= payload.exp * 1000;
};

/**
 * Валидирует токен
 */
export const validateToken = (token: string): boolean => {
  if (!token) {
    return false;
  }
  
  return !isTokenExpired(token);
};










