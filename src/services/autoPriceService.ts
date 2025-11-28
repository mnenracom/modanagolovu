/**
 * Сервис для автоматического управления ценами на маркетплейсах
 * Проверяет цены на WB и сравнивает с минимальной/рекомендованной ценой из базы
 */

import { supabase } from '@/lib/supabase';
import { WildBerriesApiService, WBProductPrice, WBPriceUpdate } from './wildberriesApiService';
import { marketplaceService } from './marketplaceService';
import { productsService } from './productsService';

export interface PriceCheckResult {
  productId: number;
  article: string;
  sku: string;
  productName: string;
  nmId?: number; // nmId товара на WB (для обновления цен)
  currentWbPrice: number; // Финальная цена со скидкой на WB (цена, за которую продается)
  baseWbPrice?: number; // Базовая цена на WB (до скидки)
  discount?: number; // Процент скидки на WB
  minPrice: number;
  recommendedPrice: number;
  costPrice: number;
  status: 'ok' | 'below_min' | 'below_recommended' | 'above_max' | 'not_found';
  needsUpdate: boolean;
  suggestedPrice: number;
  margin: number;
  profit: number;
  autoPriceEnabled?: boolean; // Включено ли автоисправление для этого товара
  priceChangeTooLarge?: boolean; // Превышен ли максимальный процент изменения
  lastPrice?: number; // Последняя известная цена
  maxChangePercent?: number; // Максимальный процент изменения
  marketplaceType?: 'wildberries' | 'ozon'; // Тип маркетплейса
  accountName?: string; // Название аккаунта
}

export interface AutoPriceSyncResult {
  checked: number;
  needsUpdate: number;
  updated: number;
  errors: string[];
  results: PriceCheckResult[];
}

export class AutoPriceService {
  /**
   * Проверить цены товаров на маркетплейсе и сравнить с минимальной/рекомендованной ценой
   */
  static async checkPrices(accountName: string, marketplaceType: 'wildberries' | 'ozon' = 'wildberries'): Promise<AutoPriceSyncResult> {
    const result: AutoPriceSyncResult = {
      checked: 0,
      needsUpdate: 0,
      updated: 0,
      errors: [],
      results: [],
    };

    try {
      // Получаем настройки маркетплейса
      const settings = await marketplaceService.getAllSettings();
      const marketplaceSetting = settings.find(
        s => s.marketplaceType === marketplaceType && s.accountName === accountName
      );

      if (!marketplaceSetting) {
        throw new Error(`Настройки для аккаунта ${accountName} не найдены`);
      }

      // Для OZON пока не реализовано
      if (marketplaceType === 'ozon') {
        throw new Error('Проверка цен для OZON пока не реализована. Используйте WildBerries.');
      }

      // Получаем настройки цен для этого аккаунта
      const priceSetting = await marketplaceService.getPriceSettingByAccount(marketplaceType, accountName);
      
      if (!priceSetting || !priceSetting.isActive) {
        throw new Error(`Настройки API цен для аккаунта ${accountName} не найдены или неактивны. Добавьте API ключ для цен в настройках маркетплейсов (вкладка "Цены").`);
      }

      // Создаем сервис WB с API ключом для цен
      const wbService = new WildBerriesApiService({
        apiKey: priceSetting.pricesApiKey,
        sellerId: marketplaceSetting.sellerId,
      });

      // Получаем все товары из базы, у которых есть артикул и цены
      const { data: products, count } = await productsService.getAll();
      
      if (!products || products.length === 0) {
        throw new Error('Товары не найдены в базе данных');
      }

      // Фильтруем товары: нужен wbNmId для проверки цен на WB
      // НЕ фильтруем по наличию цен в базе - цены с WB мы должны видеть в любом случае
      const productsWithPrices = products.filter(product => {
        // Главное условие - наличие wbNmId для запроса к WB API
        const hasWbNmId = product.wbNmId || (product.sku && !isNaN(Number(product.sku)));
        return hasWbNmId;
      });

      if (productsWithPrices.length === 0) {
        const totalProducts = products.length;
        const productsWithoutWbNmId = products.filter(p => !p.wbNmId && (!p.sku || isNaN(Number(p.sku)))).length;
        
        throw new Error(
          `Не найдено товаров с wbNmId для проверки цен. ` +
          `Всего товаров: ${totalProducts}, ` +
          `без wbNmId: ${productsWithoutWbNmId}. ` +
          `Для проверки цен необходимо синхронизировать товары через "Маркетплейсы → Дашборд → Синхронизировать" или указать wbNmId вручную в форме редактирования товара.`
        );
      }

      // Получаем nmId для запроса к WB API
      // Важно: для Discounts & Prices API нужен nmId (номенклатурный ID), а не supplierArticle
      // nmId хранится в поле wbNmId продукта
      const nmIds = productsWithPrices
        .map(p => {
          // Используем wbNmId (nmId с WB), если его нет - пробуем sku (может содержать nmId)
          const nmId = p.wbNmId || p.sku;
          if (nmId) {
            // Преобразуем в число, если это строка
            const numId = typeof nmId === 'string' ? parseInt(nmId, 10) : nmId;
            return isNaN(numId) ? null : numId;
          }
          return null;
        })
        .filter((id): id is number => id !== null && id > 0);

      console.log(`Проверяем цены для ${nmIds.length} товаров...`);
      console.log('nmId для запроса:', nmIds.slice(0, 10), nmIds.length > 10 ? `... и еще ${nmIds.length - 10}` : '');
      
      if (nmIds.length === 0) {
        const productsWithoutNmId = productsWithPrices.filter(p => !p.wbNmId && !p.sku).length;
        throw new Error(
          `Не найдено nmId для проверки цен. ` +
          `Товаров без wbNmId: ${productsWithoutNmId} из ${productsWithPrices.length}. ` +
          `Убедитесь, что товары имеют wbNmId (номенклатурный ID с WildBerries). ` +
          `Для этого нужно синхронизировать товары через "Маркетплейсы → Дашборд → Синхронизировать".`
        );
      }

      // Получаем текущие цены на WB
      // API поддерживает до 1000 товаров за запрос, метод сам разобьет на батчи
      let wbPrices: WBProductPrice[] = [];
      try {
        wbPrices = await wbService.getProductsWithPrices(nmIds);
      } catch (error: any) {
        console.error('Ошибка получения цен с WB:', error);
        const errorMessage = error.message || 'Неизвестная ошибка';
        
        // Если это ошибка прав доступа, показываем понятное сообщение
        if (errorMessage.includes('token scope not allowed') || errorMessage.includes('Ошибка прав доступа')) {
          result.errors.push(
            `Ошибка прав доступа API ключа для цен. ` +
            `Убедитесь, что в настройках маркетплейсов (вкладка "Цены") указан API ключ с правами "ЦЕНЫ" или "ЦЕНЫ ОТЗЫВЫ". ` +
            `Текущий токен не имеет доступа к Discounts & Prices API.`
          );
        } else {
          result.errors.push(`Ошибка получения цен с WB: ${errorMessage}`);
        }
        
        // Продолжаем работу с теми товарами, для которых цены получены
      }

      // Создаем Map для быстрого поиска цен по nmId
      const pricesByNmId = new Map<number, WBProductPrice>();
      wbPrices.forEach(price => {
        if (price.nmId) {
          pricesByNmId.set(price.nmId, price);
        }
      });

      // Проверяем каждый товар
      for (const product of productsWithPrices) {
        try {
          result.checked++;
          
          const nmId = product.wbNmId ? (typeof product.wbNmId === 'string' ? parseInt(product.wbNmId, 10) : product.wbNmId) : null;
          const article = product.article || product.sku || '';
          const metadata = product.importMetadata || {};
          // Минимальная цена - из metadata или retailPrice/price как fallback
          const minPrice = metadata.minPrice || metadata.recommendedPrice || product.retailPrice || product.price || 0;
          // Рекомендованная цена - из metadata или retailPrice/price
          const recommendedPrice = metadata.recommendedPrice || product.retailPrice || product.price || minPrice;
          const costPrice = metadata.costPrice || 0;
          const maxPrice = metadata.maxPrice || recommendedPrice * 1.5; // Если нет maxPrice, используем 150% от рекомендованной

          if (!nmId) {
            result.errors.push(
              `Товар "${product.name}" (артикул: ${article || 'не указан'}): отсутствует wbNmId (номенклатурный ID с WildBerries). ` +
              `Для проверки цен: 1) Синхронизируйте товары через "Маркетплейсы → Дашборд → Синхронизировать" или 2) Укажите wbNmId вручную в форме редактирования товара.`
            );
            continue;
          }

          // Получаем текущую цену на WB по nmId
          const wbPrice = pricesByNmId.get(nmId);
          if (!wbPrice) {
            // Товар не найден на WB или нет цены
            console.warn(`⚠ Товар с nmId ${nmId} (артикул: ${article || 'не указан'}, название: "${product.name}") не найден в ответе от WB API или цена отсутствует`);
            result.results.push({
              productId: parseInt(product.id),
              article,
              sku: product.sku || '',
              productName: product.name,
              nmId: nmId,
              marketplaceType: marketplaceType,
              accountName: accountName,
              currentWbPrice: 0,
              minPrice,
              recommendedPrice,
              costPrice,
              status: 'not_found', // Изменено с 'ok' на 'not_found'
              needsUpdate: false,
              suggestedPrice: recommendedPrice,
              margin: 0,
              profit: 0,
              autoPriceEnabled: product.autoPriceEnabled ?? false,
            });
            continue;
          }

          // Финальная цена со скидкой (цена, за которую продается на WB)
          const currentWbPrice = wbPrice.priceWithDiscount || wbPrice.price || 0;
          // Базовая цена (до скидки)
          const baseWbPrice = wbPrice.price || 0;
          const discount = wbPrice.discount || 0;
          const lastPrice = product.lastMarketplacePrice || currentWbPrice;
          const maxChangePercent = product.maxPriceChangePercent || 25.00; // По умолчанию 25%
          
          // Определяем статус
          let status: PriceCheckResult['status'] = 'ok';
          let needsUpdate = false;
          let suggestedPrice = currentWbPrice;
          let priceChangeTooLarge = false;

          // Рассчитываем рекомендуемую цену с учетом защиты от резких перепадов
          let targetPrice = recommendedPrice;
          
          // Если цена ниже минимума - обязательно исправляем
          if (currentWbPrice < minPrice) {
            status = 'below_min';
            needsUpdate = true;
            targetPrice = recommendedPrice;
          } 
          // Если цена ниже рекомендованной - предлагаем исправить (только если включено автоисправление)
          else if (currentWbPrice < recommendedPrice) {
            status = 'below_recommended';
            // Автоисправление только если включено для товара
            needsUpdate = product.autoPriceEnabled === true;
            targetPrice = recommendedPrice;
          } 
          // Если цена выше максимума - можно снизить
          else if (currentWbPrice > maxPrice) {
            status = 'above_max';
            needsUpdate = false; // Не критично, можно оставить
            targetPrice = recommendedPrice;
          } else {
            status = 'ok';
            needsUpdate = false;
            targetPrice = currentWbPrice;
          }

          // Защита от резких перепадов цен (чтобы не попасть в карантин на WB)
          if (lastPrice > 0 && targetPrice !== currentWbPrice) {
            const priceDiff = Math.abs(targetPrice - lastPrice);
            const priceDiffPercent = (priceDiff / lastPrice) * 100;
            
            if (priceDiffPercent > maxChangePercent) {
              // Слишком большой перепад - ограничиваем изменение
              priceChangeTooLarge = true;
              if (targetPrice > lastPrice) {
                // Повышение цены - ограничиваем максимумом
                suggestedPrice = lastPrice * (1 + maxChangePercent / 100);
              } else {
                // Снижение цены - ограничиваем минимумом
                suggestedPrice = lastPrice * (1 - maxChangePercent / 100);
              }
              // Убеждаемся, что не выходим за границы
              suggestedPrice = Math.max(minPrice, Math.min(maxPrice, suggestedPrice));
            } else {
              suggestedPrice = targetPrice;
            }
          } else {
            suggestedPrice = targetPrice;
          }

          // Рассчитываем маржу и прибыль
          const margin = costPrice > 0 
            ? ((currentWbPrice - costPrice) / currentWbPrice) * 100 
            : 0;
          const profit = currentWbPrice - costPrice;

          const checkResult: PriceCheckResult = {
            productId: parseInt(product.id),
            article,
            sku: product.sku || '',
            productName: product.name,
            nmId: wbPrice.nmId, // Сохраняем nmId для обновления цен
            currentWbPrice, // Финальная цена со скидкой (цена, за которую продается)
            baseWbPrice: baseWbPrice > 0 ? baseWbPrice : undefined, // Базовая цена (до скидки)
            discount: discount > 0 ? discount : undefined, // Процент скидки
            minPrice,
            recommendedPrice,
            costPrice,
            status: status || 'ok', // Гарантируем, что status всегда определен
            needsUpdate,
            suggestedPrice: suggestedPrice || currentWbPrice,
            margin,
            profit,
            autoPriceEnabled: product.autoPriceEnabled ?? false,
            priceChangeTooLarge: priceChangeTooLarge || false,
            lastPrice: lastPrice || currentWbPrice,
            maxChangePercent: maxChangePercent || 25.00,
            marketplaceType: marketplaceType,
            accountName: accountName,
          };

          result.results.push(checkResult);

          if (needsUpdate) {
            result.needsUpdate++;
          }
        } catch (error: any) {
          console.error(`Ошибка проверки товара ${product.id}:`, error);
          result.errors.push(`Товар ${product.name} (${product.article}): ${error.message}`);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Ошибка проверки цен:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Обновить цены на WB для товаров, которые требуют обновления
   */
  static async updatePrices(
    accountName: string,
    priceUpdates: Array<{ nmId: number; article: string; newPrice: number }>
  ): Promise<{ success: number; errors: string[] }> {
    const result = {
      success: 0,
      errors: [] as string[],
    };

    try {
      // Получаем настройки маркетплейса
      const settings = await marketplaceService.getAllSettings();
      const wbSetting = settings.find(
        s => s.marketplaceType === 'wildberries' && s.accountName === accountName
      );

      if (!wbSetting) {
        throw new Error(`Настройки для аккаунта ${accountName} не найдены`);
      }

      // Получаем настройки цен для этого аккаунта
      const priceSetting = await marketplaceService.getPriceSettingByAccount('wildberries', accountName);
      
      if (!priceSetting || !priceSetting.isActive) {
        throw new Error(`Настройки API цен для аккаунта ${accountName} не найдены или неактивны. Добавьте API ключ для цен в настройках маркетплейсов (вкладка "Цены").`);
      }

      // Создаем сервис WB с API ключом для цен
      const wbService = new WildBerriesApiService({
        apiKey: priceSetting.pricesApiKey,
        sellerId: wbSetting.sellerId,
      });

      // Формируем данные для обновления цен
      // API использует nmID (с заглавной D), а не nmId
      const priceUpdateData: WBPriceUpdate[] = priceUpdates.map(update => ({
        nmID: update.nmId, // Преобразуем nmId в nmID для API
        price: update.newPrice,
        discount: 0, // Пока не используем скидки, только цены
      }));

      // Устанавливаем цены на WB
      const task = await wbService.setPricesAndDiscounts(priceUpdateData);
      
      console.log(`Задача обновления цен создана: ${task.taskId}`);
      
      // Обновляем last_marketplace_price и last_price_update_at для каждого товара
      const { data: products } = await productsService.getAll();
      const now = new Date().toISOString();
      
      for (const update of priceUpdates) {
        try {
          // Находим товар по артикулу или nmId
          const product = products.find(p => 
            p.article === update.article || 
            (p.wbNmId && String(p.wbNmId) === String(update.nmId))
          );
          
          if (product) {
            await productsService.update(parseInt(product.id), {
              lastMarketplacePrice: update.newPrice,
              lastPriceUpdateAt: now,
            });
          }
        } catch (error: any) {
          console.error(`Ошибка обновления last_marketplace_price для товара ${update.article}:`, error);
          // Не критично, продолжаем
        }
      }
      
      result.success = priceUpdates.length;

      return result;
    } catch (error: any) {
      console.error('Ошибка обновления цен:', error);
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Получить товары с ценами ниже минимальной или рекомендованной
   */
  static async getLowPriceAlerts(accountName: string): Promise<PriceCheckResult[]> {
    const checkResult = await this.checkPrices(accountName);
    return checkResult.results.filter(
      r => r.status === 'below_min' || r.status === 'below_recommended'
    );
  }
}

