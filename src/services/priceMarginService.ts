import { PriceRule } from '@/types/priceRule';
import { priceRulesService } from './priceRulesService';
import { marketplaceService } from './marketplaceService';
import { telegramService } from './telegramService';

/**
 * Сервис для проверки маржинальности и расчета рекомендуемых цен
 */
export class PriceMarginService {
  /**
   * Проверяет маржинальность для всех ценовых правил
   */
  static async checkAllMargins(marketplaceType?: 'wildberries' | 'ozon', accountName?: string): Promise<void> {
    const rules = await priceRulesService.getAll({ marketplaceType, accountName });

    for (const rule of rules) {
      await this.checkMargin(rule);
    }
  }

  /**
   * Проверяет маржинальность для одного ценового правила
   */
  static async checkMargin(rule: PriceRule): Promise<PriceRule> {
    // Получаем текущую цену товара на маркетплейсе
    const currentPrice = await this.getCurrentPrice(rule);
    
    // Получаем цены конкурентов
    const competitorPrices = await this.getCompetitorPrices(rule);
    
    // Рассчитываем маржу и прибыль
    const calculatedMargin = currentPrice 
      ? ((currentPrice - rule.costPrice) / currentPrice) * 100 
      : null;
    const calculatedProfit = currentPrice 
      ? currentPrice - rule.costPrice 
      : null;

    // Определяем статус маржинальности
    let marginStatus: PriceRule['marginStatus'] = 'ok';
    let priceChangeNeeded = false;
    let recommendedPrice: number | undefined;

    if (!currentPrice) {
      marginStatus = 'no_competitors';
      priceChangeNeeded = true;
    } else if (currentPrice < rule.minPrice) {
      marginStatus = 'below_min';
      priceChangeNeeded = true;
      recommendedPrice = rule.minPrice;
      
      // Отправляем уведомление в Telegram
      telegramService.sendNotification({
        type: 'low_price',
        title: '⚠️ Цена ниже минимальной',
        message: `Товар "${rule.productName || rule.sku}" на ${rule.marketplaceType === 'wildberries' ? 'WildBerries' : 'OZON'} (${rule.accountName}) имеет цену ниже минимальной.`,
        data: {
          SKU: rule.sku,
          Товар: rule.productName || '-',
          Маркетплейс: rule.marketplaceType === 'wildberries' ? 'WB' : 'OZON',
          Аккаунт: rule.accountName,
          Текущая_цена: `${currentPrice.toFixed(2)} ₽`,
          Минимальная_цена: `${rule.minPrice.toFixed(2)} ₽`,
          Рекомендуемая_цена: `${recommendedPrice.toFixed(2)} ₽`,
        },
        priority: 'high',
      }).catch(err => console.error('Ошибка отправки уведомления в Telegram:', err));
    } else if (currentPrice > rule.maxPrice) {
      marginStatus = 'above_max';
      priceChangeNeeded = true;
      recommendedPrice = rule.maxPrice;
    } else if (calculatedMargin !== null && calculatedMargin < rule.targetMarginPercent) {
      marginStatus = 'low_margin';
      priceChangeNeeded = true;
      // Рассчитываем рекомендуемую цену для достижения целевой маржи
      recommendedPrice = rule.costPrice / (1 - rule.targetMarginPercent / 100);
      // Ограничиваем рекомендуемую цену диапазоном
      recommendedPrice = Math.max(rule.minPrice, Math.min(rule.maxPrice, recommendedPrice));
    }

    // Если есть цены конкурентов, корректируем рекомендуемую цену
    if (priceChangeNeeded && competitorPrices.length > 0) {
      const avgCompetitorPrice = competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
      const minCompetitorPrice = Math.min(...competitorPrices);
      
      // Рекомендуем цену чуть ниже средней или минимальной цены конкурентов
      if (recommendedPrice) {
        // Выбираем минимальное значение между рекомендуемой ценой и ценой конкурентов
        recommendedPrice = Math.min(recommendedPrice, avgCompetitorPrice * 0.98); // На 2% ниже средней
        recommendedPrice = Math.max(recommendedPrice, minCompetitorPrice * 0.99); // Но не ниже минимальной конкурентов
      } else {
        recommendedPrice = avgCompetitorPrice * 0.98;
      }
      
      // Ограничиваем диапазоном
      recommendedPrice = Math.max(rule.minPrice, Math.min(rule.maxPrice, recommendedPrice));
    }

    // Обновляем статус в базе данных
    const updated = await priceRulesService.updateMarginStatus(rule.id, {
      marginStatus,
      calculatedMargin: calculatedMargin || undefined,
      calculatedProfit: calculatedProfit || undefined,
      recommendedPrice,
      priceChangeNeeded,
      currentPrice: currentPrice || undefined,
      competitorMinPrice: competitorPrices.length > 0 ? Math.min(...competitorPrices) : undefined,
      competitorAvgPrice: competitorPrices.length > 0 
        ? competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length 
        : undefined,
      competitorMaxPrice: competitorPrices.length > 0 ? Math.max(...competitorPrices) : undefined,
      lastCheckedAt: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Получает текущую цену товара на маркетплейсе
   */
  private static async getCurrentPrice(rule: PriceRule): Promise<number | null> {
    try {
      // Пытаемся найти товар в marketplace_products
      const products = await marketplaceService.getProducts({
        marketplaceType: rule.marketplaceType,
        accountName: rule.accountName,
        sku: rule.sku,
      });

      if (products.length > 0) {
        return products[0].price;
      }

      // Если не нашли, пытаемся получить через API
      const allSettings = await marketplaceService.getAllSettings();
      const settings = allSettings.find(
        s => s.marketplaceType === rule.marketplaceType && s.accountName === rule.accountName
      );

      if (!settings) {
        return null;
      }

      if (rule.marketplaceType === 'wildberries') {
        // TODO: Реализовать получение цены через WB API
        // const wbService = new WildBerriesApiService({ apiKey: settings.apiKey });
        // const product = await wbService.getProductBySku(rule.sku);
        // return product?.price || null;
      } else if (rule.marketplaceType === 'ozon') {
        // TODO: Реализовать получение цены через OZON API
        // const ozonService = new OzonApiService({ apiKey: settings.apiKey, clientId: settings.clientId });
        // const product = await ozonService.getProductBySku(rule.sku);
        // return product?.price || null;
      }

      return null;
    } catch (error) {
      console.error(`Ошибка получения текущей цены для ${rule.sku}:`, error);
      return null;
    }
  }

  /**
   * Получает цены конкурентов (заглушка - в реальности нужно использовать API маркетплейсов)
   */
  private static async getCompetitorPrices(rule: PriceRule): Promise<number[]> {
    // TODO: Реализовать получение цен конкурентов через API маркетплейсов
    // Это может потребовать использования сторонних сервисов или парсинга страниц товаров
    // Пока возвращаем пустой массив
    
    // Пример логики:
    // 1. Найти товар по SKU/barcode на маркетплейсе
    // 2. Получить список конкурентов через API (если доступно)
    // 3. Извлечь цены конкурентов
    
    return [];
  }

  /**
   * Исправляет цену товара на маркетплейсе
   */
  static async fixPrice(rule: PriceRule): Promise<boolean> {
    if (!rule.recommendedPrice) {
      throw new Error('Рекомендуемая цена не рассчитана');
    }

    try {
      const allSettings = await marketplaceService.getAllSettings();
      const settings = allSettings.find(
        s => s.marketplaceType === rule.marketplaceType && s.accountName === rule.accountName
      );

      if (!settings) {
        throw new Error('Настройки маркетплейса не найдены');
      }

      // Обновляем цену через API маркетплейса
      if (rule.marketplaceType === 'wildberries') {
        // TODO: Реализовать обновление цены через WB API
        // const wbService = new WildBerriesApiService({ apiKey: settings.apiKey });
        // await wbService.updatePrice(rule.marketplaceProductId || rule.sku, rule.recommendedPrice);
      } else if (rule.marketplaceType === 'ozon') {
        // TODO: Реализовать обновление цены через OZON API
        // const ozonService = new OzonApiService({ apiKey: settings.apiKey, clientId: settings.clientId });
        // await ozonService.updatePrice(rule.marketplaceProductId || rule.sku, rule.recommendedPrice);
      }

      // Обновляем статус в базе данных
      await priceRulesService.updateMarginStatus(rule.id, {
        currentPrice: rule.recommendedPrice,
        priceChangeNeeded: false,
        marginStatus: 'ok',
        lastUpdatedAt: new Date().toISOString(),
      });

      // Перепроверяем маржу
      const updatedRule = await priceRulesService.getById(rule.id);
      if (updatedRule) {
        await this.checkMargin(updatedRule);
      }

      return true;
    } catch (error) {
      console.error(`Ошибка исправления цены для ${rule.sku}:`, error);
      throw error;
    }
  }
}

