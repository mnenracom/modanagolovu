import { marketplaceService, MarketplaceSetting, MarketplaceProduct } from './marketplaceService';
import { WildBerriesApiService, WBProduct } from './wildberriesApiService';
import { OzonApiService, OzonProduct } from './ozonApiService';
import { productsService } from './productsService';
import { transformProductFromSupabase } from '@/types/productSupabase';

/**
 * Сервис для синхронизации товаров с маркетплейсов
 */
export class MarketplaceProductsSyncService {
  /**
   * Синхронизировать товары для всех активных аккаунтов
   */
  static async syncAllAccounts(): Promise<void> {
    const settings = await marketplaceService.getAllSettings();
    const activeSettings = settings.filter(s => s.isActive);

    for (const setting of activeSettings) {
      await this.syncAccount(setting);
    }
  }

  /**
   * Синхронизировать товары для конкретного аккаунта
   */
  static async syncAccount(setting: MarketplaceSetting): Promise<void> {
    try {
      if (setting.marketplaceType === 'wildberries') {
        await this.syncWildBerries(setting);
      } else if (setting.marketplaceType === 'ozon') {
        await this.syncOzon(setting);
      }
    } catch (error) {
      console.error(`Ошибка синхронизации товаров для ${setting.marketplaceType} (${setting.accountName}):`, error);
      throw error;
    }
  }

  /**
   * Синхронизировать товары с WildBerries
   */
  private static async syncWildBerries(setting: MarketplaceSetting): Promise<void> {
    const wbService = new WildBerriesApiService({
      apiKey: setting.apiKey,
      sellerId: setting.sellerId,
    });

    try {
      console.log(`[WB Sync] Начинаем синхронизацию товаров для ${setting.accountName}...`);
      
      // ОПТИМИЗАЦИЯ: Получаем все товары из нашей базы один раз для быстрого поиска
      const { data: allOurProducts } = await productsService.getAll();
      const productsByArticle = new Map<string, any>();
      const productsBySku = new Map<string, any>();
      
      allOurProducts.forEach(p => {
        if (p.article) {
          productsByArticle.set(p.article.toLowerCase().trim(), p);
        }
        if (p.sku) {
          productsBySku.set(p.sku.toLowerCase().trim(), p);
        }
      });
      
      console.log(`[WB Sync] Загружено товаров из нашей базы: ${allOurProducts.length}`);
      console.log(`[WB Sync] Товаров с артикулом: ${productsByArticle.size}, с SKU: ${productsBySku.size}`);

      // Сначала пытаемся получить карточки товаров через Marketplace API (с supplierArticle)
      let products = await wbService.getProductsCards();
      
      // Если Marketplace API не вернул данные, используем Statistics API (fallback)
      if (products.length === 0) {
        console.log('[WB Sync] Marketplace API не вернул данные, используем Statistics API...');
        products = await wbService.getProductsList();
      } else {
        console.log(`[WB Sync] Получено ${products.length} товаров через Marketplace API (с supplierArticle)`);
      }

      let updatedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        if ((i + 1) % 50 === 0) {
          console.log(`[WB Sync] Обработано: ${i + 1}/${products.length}, обновлено: ${updatedCount}, пропущено: ${skippedCount}`);
        }
        
        const supplierArticle = product.supplierArticle;
        const nmId = product.nmId;
        
        if (!nmId) {
          skippedCount++;
          continue;
        }
        
        // Ищем товар в нашей базе по supplierArticle (должен совпадать с article или sku)
        let matchingProduct = null;
        
        if (supplierArticle) {
          matchingProduct = productsByArticle.get(supplierArticle.toLowerCase().trim()) ||
                           productsBySku.get(supplierArticle.toLowerCase().trim());
          
          // Если не нашли - логируем для отладки (только первые 10, чтобы не засорять консоль)
          if (!matchingProduct && skippedCount < 10) {
            console.log(`[WB Sync] Товар не найден: supplierArticle="${supplierArticle}", nmId=${nmId}, название="${product.name}"`);
            console.log(`[WB Sync] Проверьте, что в вашей базе есть товар с article или sku="${supplierArticle}"`);
          }
        } else {
          // Если нет supplierArticle - логируем (только первые 10)
          if (skippedCount < 10) {
            console.log(`[WB Sync] У товара нет supplierArticle: nmId=${nmId}, название="${product.name}"`);
          }
        }
        
        // Если товар найден в нашей базе - обновляем wb_nm_id
        if (matchingProduct) {
          // Проверяем, нужно ли обновлять (если уже заполнено - пропускаем)
          if (!matchingProduct.wbNmId || String(matchingProduct.wbNmId) !== String(nmId)) {
            try {
              await productsService.update(parseInt(matchingProduct.id), {
                wbNmId: String(nmId),
              });
              updatedCount++;
              // Логируем успешные обновления (только первые 10)
              if (updatedCount <= 10) {
                console.log(`[WB Sync] ✓ Обновлен wb_nm_id для товара "${matchingProduct.name}" (ID: ${matchingProduct.id}, article: ${matchingProduct.article || 'нет'}, sku: ${matchingProduct.sku || 'нет'}): nmId=${nmId}`);
              }
            } catch (error) {
              console.error(`[WB Sync] Ошибка обновления товара ID ${matchingProduct.id}:`, error);
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
        
        // НЕ сохраняем товары в marketplace_products - это не нужно для контроля цен
      }
      
      console.log(`[WB Sync] Синхронизация завершена. Обработано: ${products.length}, обновлено товаров: ${updatedCount}, пропущено: ${skippedCount}`);
    } catch (error) {
      console.error('Ошибка синхронизации товаров WB:', error);
      throw error;
    }
  }

  /**
   * Синхронизировать товары с OZON
   */
  private static async syncOzon(setting: MarketplaceSetting): Promise<void> {
    const ozonService = new OzonApiService({
      apiKey: setting.apiKey,
      clientId: setting.clientId || '',
    });

    try {
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      let totalProcessed = 0;

      console.log(`[OZON Sync] Начинаем синхронизацию товаров для ${setting.accountName}...`);

      // ОПТИМИЗАЦИЯ: Получаем все товары из нашей базы один раз для быстрого поиска
      const { data: allOurProducts } = await productsService.getAll();
      const productsByArticle = new Map<string, any>();
      const productsBySku = new Map<string, any>();
      
      allOurProducts.forEach(p => {
        if (p.article) {
          productsByArticle.set(p.article.toLowerCase().trim(), p);
        }
        if (p.sku) {
          productsBySku.set(p.sku.toLowerCase().trim(), p);
        }
      });
      
      console.log(`[OZON Sync] Загружено товаров из нашей базы: ${allOurProducts.length}`);
      console.log(`[OZON Sync] Товаров с артикулом: ${productsByArticle.size}, с SKU: ${productsBySku.size}`);

      let updatedCount = 0;
      let skippedCount = 0;

      while (hasMore) {
        const products = await ozonService.getProducts(limit, offset);

        if (products.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`[OZON Sync] Обрабатываем страницу ${Math.floor(offset / limit) + 1}, товаров: ${products.length}`);

        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          totalProcessed++;
          
          if (totalProcessed % 50 === 0) {
            console.log(`[OZON Sync] Обработано: ${totalProcessed}, обновлено: ${updatedCount}, пропущено: ${skippedCount}`);
          }
          
          // Ищем товар в нашей базе по offer_id (должен совпадать с article) или по SKU
          let matchingProduct = null;
          
          if (product.offer_id) {
            matchingProduct = productsByArticle.get(product.offer_id.toLowerCase().trim());
          }
          
          if (!matchingProduct && product.offer_id) {
            matchingProduct = productsBySku.get(product.offer_id.toLowerCase().trim());
          }
          
          // Если товар найден в нашей базе - обновляем ozon_product_id и ozon_offer_id
          if (matchingProduct) {
            // Проверяем, нужно ли обновлять (если уже заполнено - пропускаем)
            if (!matchingProduct.ozonProductId || !matchingProduct.ozonOfferId) {
              try {
                await productsService.update(matchingProduct.id, {
                  ozonProductId: String(product.product_id),
                  ozonOfferId: product.offer_id || null,
                });
                updatedCount++;
              } catch (error) {
                console.error(`[OZON Sync] Ошибка обновления товара ID ${matchingProduct.id}:`, error);
              }
            } else {
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
          
          // НЕ сохраняем товары в marketplace_products - это не нужно для контроля цен
        }

        offset += limit;
        hasMore = products.length === limit;
        
        // Небольшая задержка между страницами, чтобы не перегружать API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`[OZON Sync] Синхронизация завершена. Всего обработано: ${totalProcessed}, обновлено товаров: ${updatedCount}, пропущено: ${skippedCount}`);
    } catch (error) {
      console.error('[OZON Sync] Ошибка синхронизации товаров OZON:', error);
      throw error;
    }
  }
}

