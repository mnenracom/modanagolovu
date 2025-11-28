import { marketplaceService, MarketplaceSetting } from './marketplaceService';
import { WildBerriesApiService, WBReview } from './wildberriesApiService';
import { OzonApiService, OzonReview } from './ozonApiService';
import { reviewsService } from './reviewsService';
import { Review } from '@/types/review';
import { productsService } from './productsService';

/**
 * Сервис для синхронизации отзывов с маркетплейсов
 */
export class MarketplaceReviewsSyncService {
  /**
   * Синхронизировать отзывы для всех товаров с маркетплейсов
   */
  static async syncAllReviews(marketplaceType?: 'wildberries' | 'ozon'): Promise<void> {
    const settings = await marketplaceService.getAllSettings();
    const activeSettings = settings.filter(s => s.isActive);

    for (const setting of activeSettings) {
      if (marketplaceType && setting.marketplaceType !== marketplaceType) {
        continue;
      }

      await this.syncAccountReviews(setting);
    }
  }

  /**
   * Синхронизировать отзывы для конкретного аккаунта
   * Работает напрямую с товарами из нашей базы, не требует marketplace_products
   */
  static async syncAccountReviews(setting: MarketplaceSetting): Promise<void> {
    try {
      console.log(`Начинаем синхронизацию отзывов для ${setting.marketplaceType} (${setting.accountName})`);
      
      // Сначала пытаемся получить товары из marketplace_products (если есть)
      let marketplaceProducts = await marketplaceService.getProducts({
        marketplaceType: setting.marketplaceType,
        accountName: setting.accountName,
      });

      console.log(`Найдено ${marketplaceProducts.length} товаров в marketplace_products для аккаунта ${setting.accountName}`);

      let syncedCount = 0;
      let skippedCount = 0;

      // Если есть товары в marketplace_products, используем их
      if (marketplaceProducts.length > 0) {
        for (const mpProduct of marketplaceProducts) {
          let ourProductId: number | null = null;

          if (mpProduct.ourProductId) {
            ourProductId = mpProduct.ourProductId;
          } else if (mpProduct.sku) {
            // Ищем товар по SKU (который теперь = nmId для WB)
            try {
              const { data: products } = await productsService.getAll({
                search: mpProduct.sku,
              });
              
              // Для WB: SKU = nmId, ищем точное совпадение
              const matchingProduct = products.find(
                p => p.sku && p.sku.toLowerCase().trim() === mpProduct.sku.toLowerCase().trim()
              );
              
              if (matchingProduct) {
                ourProductId = parseInt(matchingProduct.id);
                console.log(`Найден товар ID=${ourProductId} по SKU (nmId)="${mpProduct.sku}"`);
              } else {
                console.log(`Товар с SKU (nmId)="${mpProduct.sku}" не найден в нашей базе`);
              }
            } catch (error) {
              console.error(`Ошибка поиска товара по SKU (nmId) ${mpProduct.sku}:`, error);
            }
          }

          if (!ourProductId) {
            skippedCount++;
            continue;
          }

          try {
            if (setting.marketplaceType === 'wildberries') {
              // Для WB: marketplaceProductId = nmId, используем его напрямую
              const nmId = mpProduct.marketplaceProductId;
              if (nmId) {
                console.log(`Синхронизация отзывов WB: товар ID=${ourProductId}, nmId=${nmId}`);
                await this.syncWildBerriesReviews(setting, nmId, ourProductId);
                syncedCount++;
              } else {
                console.warn(`Товар ID=${ourProductId}: нет nmId в marketplaceProductId, пропускаем`);
                skippedCount++;
              }
            } else if (setting.marketplaceType === 'ozon') {
              await this.syncOzonReviews(setting, mpProduct.marketplaceProductId, ourProductId);
              syncedCount++;
            }
          } catch (error: any) {
            console.error(`Ошибка синхронизации отзывов для товара ${mpProduct.marketplaceProductId}:`, error);
            skippedCount++;
          }
        }
      } else {
        // Если нет товаров в marketplace_products, работаем напрямую с нашей базой
        console.log(`Товаров в marketplace_products нет. Работаем напрямую с товарами из нашей базы...`);
        
        // Получаем все товары из нашей базы
        const { data: allProducts } = await productsService.getAll({});
        console.log(`Найдено ${allProducts.length} товаров в нашей базе`);

        for (const product of allProducts) {
          let marketplaceId: string | null = null;

          // Для WildBerries: SKU теперь = nmId (правильный nmId с маркетплейса)
          if (setting.marketplaceType === 'wildberries') {
            // Используем wbNmId (если есть) или SKU (который теперь = nmId)
            marketplaceId = product.wbNmId || product.sku || null;
            
            if (!marketplaceId) {
              console.log(`Товар ID=${product.id} "${product.name}": нет wbNmId и SKU, пропускаем`);
              skippedCount++;
              continue;
            }
            
            // Проверяем, что это валидный nmId (число)
            const nmIdNum = parseInt(marketplaceId);
            if (isNaN(nmIdNum) || nmIdNum <= 0) {
              console.warn(`Товар ID=${product.id} "${product.name}": SKU/wbNmId "${marketplaceId}" не является валидным nmId, пропускаем`);
              skippedCount++;
              continue;
            }

            try {
              await this.syncWildBerriesReviews(setting, marketplaceId, product.id);
              syncedCount++;
              
              // Небольшая задержка между товарами, чтобы не перегружать Edge Function
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error: any) {
              // Если ошибка 404 - возможно, это не nmId, пропускаем
              if (!error.message?.includes('404') && !error.message?.includes('not found')) {
                console.error(`Ошибка синхронизации отзывов для товара ${product.id} (nmId: ${marketplaceId}):`, error);
              }
              skippedCount++;
              
              // Задержка даже при ошибке, чтобы не перегружать систему
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } else if (setting.marketplaceType === 'ozon') {
            // Для OZON: используем ozonProductId или ozonOfferId
            if (product.ozonProductId) {
              marketplaceId = product.ozonProductId;
              console.log(`Товар ID=${product.id} "${product.name}": найден ozonProductId=${marketplaceId}`);
            } else if (product.ozonOfferId) {
              // Если нет product_id, используем offer_id (но для отзывов нужен product_id)
              // Пока пропускаем, так как для отзывов нужен именно product_id
              console.log(`Товар ID=${product.id} "${product.name}": есть только ozonOfferId=${product.ozonOfferId}, но для отзывов нужен ozonProductId, пропускаем`);
              skippedCount++;
              continue;
            } else {
              console.log(`Товар ID=${product.id} "${product.name}": нет ozonProductId и ozonOfferId, пропускаем`);
            }
            
            if (!marketplaceId) {
              skippedCount++;
              continue;
            }

            try {
              await this.syncOzonReviews(setting, marketplaceId, product.id);
              syncedCount++;
            } catch (error: any) {
              console.error(`Ошибка синхронизации отзывов OZON для товара ${product.id} (product_id: ${marketplaceId}):`, error);
              skippedCount++;
            }
          }
        }
      }

      console.log(`✓ Синхронизация отзывов завершена для ${setting.accountName}: обработано ${syncedCount} товаров, пропущено ${skippedCount}`);
    } catch (error) {
      console.error(`Ошибка синхронизации отзывов для ${setting.marketplaceType} (${setting.accountName}):`, error);
      throw error;
    }
  }

  /**
   * Синхронизировать отзывы с WildBerries
   */
  private static async syncWildBerriesReviews(
    setting: MarketplaceSetting,
    nmId: string,
    productId: number
  ): Promise<void> {
    const wbService = new WildBerriesApiService({
      apiKey: setting.apiKey,
      sellerId: setting.sellerId,
    });

    try {
      const nmIdNum = parseInt(nmId);
      if (isNaN(nmIdNum)) {
        console.warn(`Неверный nmId для WB: ${nmId}`);
        return;
      }

      // Получаем настройку отзывов из отдельной таблицы
      console.log(`🔍 Поиск настройки отзывов для: marketplaceType=${setting.marketplaceType}, accountName="${setting.accountName}"`);
      const reviewSetting = await marketplaceService.getReviewSettingByAccount(setting.marketplaceType, setting.accountName);
      
      if (!reviewSetting || !reviewSetting.isActive) {
        console.warn(`⚠ Нет активной настройки отзывов для аккаунта "${setting.accountName}" (${setting.marketplaceType}). Пропускаем синхронизацию отзывов.`);
        console.warn(`⚠ Добавьте токен для отзывов в настройках маркетплейсов → вкладка "Отзывы"`);
        console.warn(`⚠ Проверьте, что имя аккаунта в настройке отзывов точно совпадает с "${setting.accountName}"`);
        return;
      }
      
      console.log(`✓ Найдена настройка отзывов для аккаунта "${setting.accountName}": ID=${reviewSetting.id}, активна=${reviewSetting.isActive}`);

      console.log(`Синхронизация отзывов WB для товара ${nmId} (nmIdNum: ${nmIdNum}, productId: ${productId}, аккаунт: ${setting.accountName})`);
      console.log(`Используется токен для отзывов: ${reviewSetting.reviewsApiKey.substring(0, 20)}...`);
      
      // Проверяем, что nmId выглядит валидным (должен быть большим числом, обычно 7-8 цифр)
      if (nmIdNum < 1000000) {
        console.warn(`⚠ Подозрительно маленький nmId: ${nmIdNum}. Возможно, это не правильный nmId товара на WB.`);
        console.warn(`⚠ Проверьте, что в поле wb_nm_id указан правильный номенклатурный ID товара с WildBerries.`);
      }

      // Получаем отзывы через Feedbacks API, используя токен из отдельной настройки
      const reviews = await wbService.getReviews(nmIdNum, 100, 0, reviewSetting.reviewsApiKey);

      console.log(`Получено ${reviews.length} отзывов для товара ${nmId}`);

      if (reviews.length === 0) {
        console.log(`Отзывы для WB товара ${nmId} не найдены или endpoint недоступен`);
        return;
      }

      for (const wbReview of reviews) {
        try {
          // Логируем структуру первого отзыва для отладки
          if (reviews.indexOf(wbReview) === 0) {
            console.log(`🔍 Структура WB отзыва:`, {
              id: wbReview.id,
              nmId: wbReview.nmId,
              productDetails: wbReview.productDetails,
              hasProductDetails: !!wbReview.productDetails,
              keys: Object.keys(wbReview || {}),
            });
          }
          
          // Преобразуем WB отзыв в формат Review
          // externalReviewId должен быть строкой или числом
          const externalReviewId = wbReview.id ? String(wbReview.id) : undefined;
          
          if (!externalReviewId) {
            console.warn(`⚠ Отзыв без ID, пропускаем:`, wbReview);
            continue;
          }
          
          const review: Partial<Review> = {
            productId,
            source: 'wildberries',
            marketplaceType: 'wildberries',
            externalReviewId,
            authorName: wbReview.userName || wbReview.name || 'Покупатель WB',
            rating: wbReview.productValuation || wbReview.rating || 5,
            text: wbReview.text || '',
            pros: wbReview.pros,
            cons: wbReview.cons,
            photos: wbReview.photoLinks || wbReview.photos || [],
            status: 'pending', // Требует модерации
            verifiedPurchase: true, // Отзывы с маркетплейсов - подтвержденные покупки
            metadata: {
              nmId: wbReview.nmId || wbReview.productDetails?.nmId,
              state: wbReview.state,
              wasViewed: wbReview.wasViewed,
              matchingSize: wbReview.matchingSize,
              matchingColor: wbReview.matchingColor,
              productDetails: wbReview.productDetails,
              answer: wbReview.answer,
            },
            externalCreatedAt: wbReview.createdDate || wbReview.date,
          };

          // Если есть ответ продавца
          if (wbReview.answer?.text) {
            review.replyText = wbReview.answer.text;
            review.replyDate = new Date().toISOString();
          }

          // Сохраняем отзыв
          await reviewsService.upsertMarketplaceReview(review);
        } catch (error: any) {
          console.error(`Ошибка сохранения отзыва ${wbReview.id}:`, error);
          // Продолжаем для других отзывов
        }
      }

      console.log(`Синхронизировано ${reviews.length} отзывов для WB товара ${nmId}`);
    } catch (error) {
      console.error(`Ошибка синхронизации отзывов WB для товара ${nmId}:`, error);
      // Не бросаем ошибку, продолжаем для других товаров
    }
  }

  /**
   * Синхронизировать отзывы с OZON
   */
  private static async syncOzonReviews(
    setting: MarketplaceSetting,
    productIdStr: string,
    ourProductId: number
  ): Promise<void> {
    // Получаем настройку отзывов из отдельной таблицы
    console.log(`🔍 Поиск настройки отзывов OZON для: accountName="${setting.accountName}"`);
    const reviewSetting = await marketplaceService.getReviewSettingByAccount(setting.marketplaceType, setting.accountName);
    
    if (!reviewSetting || !reviewSetting.isActive) {
      console.warn(`⚠ Нет активной настройки отзывов для аккаунта "${setting.accountName}". Пропускаем синхронизацию отзывов.`);
      console.warn(`⚠ Добавьте токен для отзывов в настройках маркетплейсов → вкладка "Отзывы"`);
      return;
    }
    
    console.log(`✓ Найдена настройка отзывов OZON для аккаунта "${setting.accountName}": ID=${reviewSetting.id}`);
    
    const ozonService = new OzonApiService({
      apiKey: setting.apiKey,
      clientId: setting.clientId || '',
    });

    try {
      const productId = parseInt(productIdStr);
      if (isNaN(productId)) {
        console.warn(`Неверный product_id для OZON: ${productIdStr}`);
        return;
      }
      
      console.log(`Синхронизация отзывов OZON для товара product_id=${productId} (ourProductId: ${ourProductId}, аккаунт: ${setting.accountName})`);

      let offset = 0;
      const limit = 100;
      let totalSynced = 0;

      while (true) {
        const reviews = await ozonService.getReviews(productId, limit, offset);

        if (reviews.length === 0) {
          break;
        }

        for (const ozonReview of reviews) {
          // Преобразуем OZON отзыв в формат Review
          const review: Partial<Review> = {
            productId: ourProductId,
            source: 'ozon',
            marketplaceType: 'ozon',
            externalReviewId: String(ozonReview.review_id),
            authorName: ozonReview.author?.name || 'Покупатель OZON',
            authorAvatarUrl: ozonReview.author?.avatar,
            rating: ozonReview.rating || 5,
            text: ozonReview.text || '',
            pros: ozonReview.pros,
            cons: ozonReview.cons,
            photos: ozonReview.photos || [],
            status: ozonReview.state === 'approved' || ozonReview.state === 'published' 
              ? 'approved' 
              : 'pending', // Автоматически одобряем опубликованные отзывы
            verifiedPurchase: ozonReview.verified_purchase || false,
            metadata: {
              review_id: ozonReview.review_id,
              sku: ozonReview.sku,
              offer_id: ozonReview.offer_id,
              state: ozonReview.state,
              video: ozonReview.video,
            },
            externalCreatedAt: ozonReview.created_at,
          };

          // Если есть ответ продавца
          if (ozonReview.answer?.text) {
            review.replyText = ozonReview.answer.text;
            review.replyDate = ozonReview.answer.created_at;
          }

          // Сохраняем отзыв
          await reviewsService.upsertMarketplaceReview(review);
        }

        totalSynced += reviews.length;
        offset += limit;

        // Если получили меньше лимита, значит это последняя страница
        if (reviews.length < limit) {
          break;
        }
      }

      console.log(`Синхронизировано ${totalSynced} отзывов для OZON товара ${productIdStr}`);
    } catch (error) {
      console.error(`Ошибка синхронизации отзывов OZON для товара ${productIdStr}:`, error);
      // Не бросаем ошибку, продолжаем для других товаров
    }
  }
}

