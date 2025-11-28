/**
 * Форматирует цену для отображения
 * Убирает ноль после рубля, если цена равна 0
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined || price === 0) {
    return '₽';
  }
  return `${price.toLocaleString('ru-RU')} ₽`;
};

/**
 * Форматирует цену с возможностью показать 0
 */
export const formatPriceWithZero = (price: number | null | undefined): string => {
  if (price === null || price === undefined) {
    return '0 ₽';
  }
  return `${price.toLocaleString('ru-RU')} ₽`;
};


