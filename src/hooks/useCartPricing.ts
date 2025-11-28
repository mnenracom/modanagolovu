import { useMemo } from 'react';
import { useCart } from './useCart';
import { Product } from '@/types/product';
import { useSettings } from './useSettings';

export interface CartPricingInfo {
  // Текущая сумма заказа (с учетом скидки, если опт)
  currentTotal: number;
  
  // Розничная сумма заказа (без скидки, для расчета градаций)
  retailTotal: number;
  
  // Тип заказа (retail/wholesale)
  orderType: 'retail' | 'wholesale';
  
  // Общая экономия
  totalEconomy: number;
  
  // Минимальные суммы
  minRetailOrder: number;
  minWholesaleOrder: number;
  
  // Прогресс до минимального заказа
  progressToMinOrder: {
    current: number;
    target: number;
    percentage: number;
    remaining: number;
    isReached: boolean;
  };
  
  // Прогресс до оптового заказа
  progressToWholesaleOrder: {
    current: number;
    target: number;
    percentage: number;
    remaining: number;
    isReached: boolean;
  };
  
  // Информация о переходе на опт
  wholesaleInfo: {
    canSwitchToWholesale: boolean;
    itemsNeededForWholesale: number;
    potentialEconomy: number;
    currentGradation?: { amount: number; percent: number } | null;
    nextGradation?: { amount: number; percent: number } | null;
    allNextGradations?: Array<{ amount: number; percent: number; remaining: number }>; // Все следующие градации с остатком до них
  };
  
  // Детали по каждому товару
  itemDetails: Array<{
    productId: string;
    quantity: number;
    retailPrice: number;
    wholesalePrice: number;
    currentPrice: number;
    isWholesale: boolean;
    economy: number;
  }>;
}

export const useCartPricing = (): CartPricingInfo => {
  const { items } = useCart();
  const { getSettingAsNumber, getWholesaleGradations, error: settingsError } = useSettings();

  // Получаем минимальные суммы из настроек (с fallback на значения по умолчанию)
  // Если настройки не загружены, используем значения по умолчанию
  const minRetailOrderFromSettings = settingsError 
    ? 0 
    : getSettingAsNumber('min_retail_order', 0);
  const minWholesaleOrderFromSettings = settingsError 
    ? 5000 
    : getSettingAsNumber('min_wholesale_order', 5000);
  
  // Получаем градации оптовых цен
  const wholesaleGradations = settingsError ? [] : getWholesaleGradations();

  return useMemo(() => {
    const normalizedMinRetail = Math.max(0, minRetailOrderFromSettings);

    if (items.length === 0) {
      return {
        currentTotal: 0,
        retailTotal: 0,
        orderType: 'retail',
        totalEconomy: 0,
        minRetailOrder: normalizedMinRetail,
        minWholesaleOrder: minWholesaleOrderFromSettings,
        progressToMinOrder: {
          current: 0,
          target: normalizedMinRetail,
          percentage: normalizedMinRetail <= 0 ? 100 : 0,
          remaining: normalizedMinRetail,
          isReached: normalizedMinRetail <= 0,
        },
        progressToWholesaleOrder: {
          current: 0,
          target: minWholesaleOrderFromSettings,
          percentage: 0,
          remaining: minWholesaleOrderFromSettings,
          isReached: false,
        },
        wholesaleInfo: {
          canSwitchToWholesale: false,
          itemsNeededForWholesale: 0,
          potentialEconomy: 0,
          currentGradation: null,
          nextGradation: null,
        },
        itemDetails: [],
      };
    }

    // Используем минимальные суммы из настроек (приоритет над значениями из товара)
    const minRetailOrder = normalizedMinRetail;
    const minWholesaleOrder = minWholesaleOrderFromSettings;

    // Рассчитываем детали по каждому товару (сначала по розничным ценам)
    const itemDetails = items
      .filter((item) => item?.product && item.product.id) // Фильтруем невалидные элементы
      .map((item) => {
        try {
          const retailPrice = item.product?.retailPrice ?? item.product?.price ?? 0;
          const quantity = item.quantity || 0;

          return {
            productId: item.product.id,
            quantity,
            retailPrice,
            wholesalePrice: 0, // Больше не используется
            currentPrice: retailPrice, // Будет пересчитано ниже
            isWholesale: false, // Будет пересчитано ниже
            economy: 0, // Будет пересчитано ниже
          };
        } catch (error) {
          console.error('Ошибка обработки товара в корзине:', error, item);
          // Возвращаем безопасные значения по умолчанию
          return {
            productId: item.product?.id || '',
            quantity: item.quantity || 0,
            retailPrice: 0,
            wholesalePrice: 0,
            currentPrice: 0,
            isWholesale: false,
            economy: 0,
          };
        }
      });

    // Рассчитываем текущую сумму по розничным ценам
    const retailTotal = itemDetails.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);

    // Определяем тип заказа (от суммы заказа)
    const orderType: 'retail' | 'wholesale' = retailTotal >= minWholesaleOrder ? 'wholesale' : 'retail';

    // Находим подходящую градацию оптовых цен
    let applicableGradation: { amount: number; percent: number } | null = null;
    if (orderType === 'wholesale' && wholesaleGradations.length > 0) {
      // Сортируем градации по сумме (по убыванию) и находим первую, которая подходит
      const sortedGradations = [...wholesaleGradations].sort((a, b) => b.amount - a.amount);
      applicableGradation = sortedGradations.find(g => retailTotal >= g.amount) || null;
    }

    // Если оптовый заказ и есть подходящая градация, применяем скидку
    if (orderType === 'wholesale' && applicableGradation) {
      const discountMultiplier = 1 - (applicableGradation.percent / 100);
      itemDetails.forEach((item) => {
        item.currentPrice = item.retailPrice * discountMultiplier;
        item.isWholesale = true;
        item.economy = (item.retailPrice - item.currentPrice) * item.quantity;
      });
    } else {
      // Розничные цены без изменений
      itemDetails.forEach((item) => {
        item.currentPrice = item.retailPrice;
        item.isWholesale = false;
        item.economy = 0;
      });
    }

    // Рассчитываем текущую сумму (с учетом скидки, если опт)
    const currentTotal = itemDetails.reduce((sum, item) => sum + item.currentPrice * item.quantity, 0);

    // Рассчитываем общую экономию
    const totalEconomy = itemDetails.reduce((sum, item) => sum + item.economy, 0);

    // Прогресс до минимального розничного заказа
    const progressToMinOrder = {
      current: currentTotal,
      target: minRetailOrder,
      percentage: minRetailOrder <= 0 ? 100 : Math.min(100, (currentTotal / minRetailOrder) * 100),
      remaining: minRetailOrder <= 0 ? 0 : Math.max(0, minRetailOrder - currentTotal),
      isReached: minRetailOrder <= 0 ? true : currentTotal >= minRetailOrder,
    };

    // Прогресс до оптового заказа
    const progressToWholesaleOrder = {
      current: currentTotal,
      target: minWholesaleOrder,
      percentage: Math.min(100, (currentTotal / minWholesaleOrder) * 100),
      remaining: Math.max(0, minWholesaleOrder - currentTotal),
      isReached: currentTotal >= minWholesaleOrder,
    };

    // Информация о переходе на опт
    const canSwitchToWholesale = retailTotal < minWholesaleOrder && orderType === 'retail';
    const itemsNeededForWholesale = canSwitchToWholesale
      ? Math.ceil((minWholesaleOrder - retailTotal) / (itemDetails[0]?.retailPrice || 1))
      : 0;
    
    // Потенциальная экономия при переходе на опт (от суммы заказа)
    // Находим ближайшую градацию для расчета потенциальной экономии
    let potentialEconomy = 0;
    let nextGradation: { amount: number; percent: number } | null = null;
    let allNextGradations: Array<{ amount: number; percent: number; remaining: number }> = [];
    
    if (wholesaleGradations.length > 0) {
      const sortedGradations = [...wholesaleGradations].sort((a, b) => a.amount - b.amount);
      
      if (canSwitchToWholesale) {
        // Если еще не опт, находим первую градацию
        nextGradation = sortedGradations.find(g => g.amount > retailTotal) || null;
        if (nextGradation) {
          potentialEconomy = retailTotal * (nextGradation.percent / 100);
        }
        // Все градации, которые еще не достигнуты
        allNextGradations = sortedGradations
          .filter(g => g.amount > retailTotal)
          .map(g => ({
            amount: g.amount,
            percent: g.percent,
            remaining: Math.max(0, g.amount - retailTotal), // Остаток до градации по розничной сумме
          }));
      } else if (orderType === 'wholesale' && applicableGradation) {
        // Если уже опт, находим следующую градацию после текущей
        nextGradation = sortedGradations.find(g => g.amount > retailTotal && g.amount > applicableGradation.amount) || null;
        // Все градации, которые еще не достигнуты (больше текущей)
        allNextGradations = sortedGradations
          .filter(g => g.amount > retailTotal && g.amount > applicableGradation.amount)
          .map(g => ({
            amount: g.amount,
            percent: g.percent,
            remaining: Math.max(0, g.amount - retailTotal), // Остаток до градации по розничной сумме
          }));
      }
    }

    return {
      currentTotal,
      retailTotal, // Добавляем розничную сумму для использования в компонентах
      orderType,
      totalEconomy,
      minRetailOrder,
      minWholesaleOrder,
      progressToMinOrder,
      progressToWholesaleOrder,
      wholesaleInfo: {
        canSwitchToWholesale,
        itemsNeededForWholesale,
        potentialEconomy,
        currentGradation: applicableGradation,
        nextGradation,
        allNextGradations,
      },
      itemDetails,
    };
  }, [items, minRetailOrderFromSettings, minWholesaleOrderFromSettings, wholesaleGradations]);
};

