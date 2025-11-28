/**
 * Сервис для синхронизации данных с маркетплейсов
 */

import { marketplaceService, MarketplaceSetting } from './marketplaceService';
import { WildBerriesApiService } from './wildberriesApiService';
import { OzonApiService } from './ozonApiService';
import { MarketplaceProductsSyncService } from './marketplaceProductsSyncService';

/**
 * Синхронизировать данные для одного аккаунта
 */
export async function syncMarketplaceAccount(setting: MarketplaceSetting): Promise<void> {
  try {
    // Обновляем статус синхронизации
    await marketplaceService.upsertSetting({
      ...setting,
      lastSyncStatus: 'pending',
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Синхронизируем за последние 7 дней

    const dateFrom = startDate.toISOString().split('T')[0];
    const dateTo = endDate.toISOString().split('T')[0];

    // Сначала синхронизируем товары (чтобы обновить wb_nm_id и другие поля)
    console.log(`Начинаем синхронизацию товаров для ${setting.marketplaceType} (${setting.accountName})...`);
    try {
      await MarketplaceProductsSyncService.syncAccount(setting);
      console.log(`✓ Синхронизация товаров завершена для ${setting.marketplaceType} (${setting.accountName})`);
    } catch (error: any) {
      console.error(`Ошибка синхронизации товаров для ${setting.marketplaceType} (${setting.accountName}):`, error);
      // Продолжаем синхронизацию продаж и заказов, даже если товары не синхронизировались
    }

    // Затем синхронизируем продажи и заказы
    if (setting.marketplaceType === 'wildberries') {
      await syncWildBerries(setting, dateFrom, dateTo);
    } else if (setting.marketplaceType === 'ozon') {
      await syncOzon(setting, dateFrom, dateTo);
    }

    // Обновляем статус успешной синхронизации
    await marketplaceService.upsertSetting({
      ...setting,
      lastSyncAt: new Date().toISOString(),
      lastSyncStatus: 'success',
      lastSyncError: undefined,
    });
  } catch (error: any) {
    console.error(`Ошибка синхронизации ${setting.marketplaceType} (${setting.accountName}):`, error);
    
    // Обновляем статус ошибки
    await marketplaceService.upsertSetting({
      ...setting,
      lastSyncStatus: 'error',
      lastSyncError: error.message || 'Неизвестная ошибка',
    });
    
    throw error;
  }
}

/**
 * Синхронизировать данные WildBerries
 */
async function syncWildBerries(setting: MarketplaceSetting, dateFrom: string, dateTo: string): Promise<void> {
  const wbService = new WildBerriesApiService({
    apiKey: setting.apiKey,
    sellerId: setting.sellerId,
  });

  // Получаем данные
  // Проверяем, имеет ли токен права на Statistics API
  let salesReport: any[] = [];
  let orders: any[] = [];
  
  // Пытаемся получить отчет о продажах, но не критично, если токен не имеет прав
  try {
    salesReport = await wbService.getSalesReport(dateFrom, dateTo);
    console.log(`Получено ${salesReport.length} записей о продажах для ${setting.accountName}`);
  } catch (error: any) {
    // Если токен не имеет прав на Statistics API (например, только Content API), пропускаем
    if (error.message?.includes('token scope not allowed') || error.message?.includes('unauthorized')) {
      console.warn(`Токен для ${setting.accountName} не имеет прав на Statistics API. Пропускаем синхронизацию продаж.`);
      console.warn('Это нормально, если токен предназначен только для Content API (отзывы).');
    } else {
      console.error(`Ошибка получения отчета о продажах WB для ${setting.accountName}:`, error);
    }
    // Продолжаем работу без данных о продажах
  }
  
  // Пытаемся получить заказы, но не критично, если не получится
  try {
    orders = await wbService.getOrders(dateFrom, dateTo);
    console.log(`Получено ${orders.length} заказов для ${setting.accountName}`);
  } catch (error: any) {
    if (error.message?.includes('token scope not allowed') || error.message?.includes('unauthorized')) {
      console.warn(`Токен для ${setting.accountName} не имеет прав на получение заказов. Пропускаем.`);
    } else {
      console.warn('Не удалось получить заказы WB:', error.message);
    }
    // Продолжаем работу без заказов
  }

  // Сохраняем заказы
  for (const order of orders) {
    // Проверяем наличие обязательных полей
    const orderId = order.orderId || order.gNumber || order.id;
    if (!orderId) {
      console.warn('Пропущен заказ без ID:', order);
      continue;
    }
    
    await marketplaceService.saveOrder({
      marketplaceType: 'wildberries',
      accountName: setting.accountName,
      marketplaceOrderId: String(orderId),
      orderNumber: order.gNumber || order.orderNumber || '',
      orderDate: order.date || order.orderDate || new Date().toISOString(),
      status: order.isCancel ? 'cancelled' : (order.status || 'delivered'),
      totalAmount: order.totalPrice || order.totalAmount || 0,
      commission: (order.totalPrice || order.totalAmount || 0) * 0.15, // Примерная комиссия WB (нужно уточнить)
      netAmount: (order.totalPrice || order.totalAmount || 0) * 0.85,
      items: [{
        name: order.supplierArticle || order.supplier_article || order.name || '',
        sku: order.barcode || order.sku || '',
        quantity: order.quantity || 1,
        price: order.totalPrice || order.price || 0,
      }],
      metadata: {
        warehouseName: order.warehouseName,
        oblast: order.oblast,
        nmId: order.nmId,
        subject: order.subject,
        category: order.category,
        brand: order.brand,
      },
    });
  }

  // Если нет данных о продажах (токен не имеет прав), пропускаем агрегацию
  if (salesReport.length === 0) {
    console.log(`Нет данных о продажах для ${setting.accountName}. Пропускаем агрегацию статистики.`);
    return; // Выходим из функции, так как нет данных для обработки
  }

  // Агрегируем статистику по дням
  const salesByDate = new Map<string, any>();

  for (const sale of salesReport) {
    // КРИТИЧНО: Учитываем ТОЛЬКО товары с датой реализации (rr_dt)
    // rr_dt - это дата, когда товар реально продан и выкуплен клиентом
    // Если нет rr_dt, значит товар еще не реализован (в пути, отказ, отмена и т.д.)
    if (!sale.rr_dt) {
      continue; // Пропускаем все товары без даты реализации
    }
    
    // Фильтруем только реально проданные товары (выкупленные)
    // doc_type_name должен быть связан с продажей, а не с возвратом или заказом
    // supplier_oper_name может быть "Продажа", "Возврат", "Отказ" и т.д.
    const docType = sale.doc_type_name?.toLowerCase() || '';
    const supplierOper = sale.supplier_oper_name?.toLowerCase() || '';
    
    // Пропускаем возвраты, отказы, отмены и другие операции, которые не являются продажами
    if (docType.includes('возврат') || supplierOper.includes('возврат') || 
        docType.includes('return') || supplierOper.includes('return') ||
        docType.includes('отказ') || supplierOper.includes('отказ') ||
        docType.includes('отмена') || supplierOper.includes('отмена') ||
        docType.includes('cancel') || supplierOper.includes('cancel') ||
        docType.includes('отклонен') || supplierOper.includes('отклонен') ||
        docType.includes('reject') || supplierOper.includes('reject')) {
      continue; // Пропускаем возвраты, отказы, отмены
    }
    
    // Используем ТОЛЬКО дату реализации (rr_dt) - это гарантирует, что товар реально продан
    const date = sale.rr_dt.split('T')[0];
    if (!date) {
      continue; // Пропускаем записи без даты реализации
    }
    
    if (!salesByDate.has(date)) {
      salesByDate.set(date, {
        date,
        ordersCount: 0,
        revenue: 0, // Выручка (retail_amount)
        commission: 0, // Комиссия WB
        logistics: 0, // Логистика (delivery_rub, dlv_prc)
        storage: 0, // Хранение (если есть в API)
        penalties: 0, // Штрафы (если есть в API)
        returns: 0, // Возвраты
        totalExpenses: 0, // Все расходы
        profit: 0, // Реальная прибыль (выручка - все расходы)
        itemsSold: 0, // Количество реально проданных товаров
      });
    }

    const dayData = salesByDate.get(date)!;
    
    // Количество реально проданных товаров (только выкупленные)
    // quantity может быть отрицательным для возвратов, поэтому берем только положительные значения
    const quantity = Math.max(0, sale.quantity || 0);
    
    // Выручка (цена продажи) - должна быть положительной
    const retailAmount = Math.max(0, sale.retail_amount || sale.retail_price_withdisc_rub || 0);
    
    // Дополнительная проверка: если нет выручки или количества, пропускаем
    // Это может быть запись о возврате или другой операции
    if (quantity === 0 || retailAmount === 0) {
      continue; // Пропускаем записи без количества или выручки
    }
    
    // Комиссия WB (в процентах или уже в рублях)
    const commissionPercent = sale.commission_percent || 0;
    const commissionAmount = commissionPercent > 0 
      ? (retailAmount * commissionPercent) / 100 
      : 0;
    
    // Логистика (доставка) - только положительные значения
    const logisticsAmount = Math.max(0, sale.delivery_rub || sale.dlv_prc || 0);
    
    // Возвраты (если есть) - это расход, берем по модулю
    const returnAmount = Math.abs(sale.return_amount || 0);
    
    // Дополнительные расходы (если есть в API)
    // ppvz_spp_prc и ppvz_kvw_prc_base могут быть связаны с комиссиями/расходами
    const additionalExpenses = Math.max(0, (sale.ppvz_spp_prc || 0) + (sale.ppvz_kvw_prc_base || 0));
    
    // Считаем только реальные продажи (выкупленные товары)
    // Все проверки пройдены: есть rr_dt, есть количество, есть выручка, нет возвратов/отказов
    dayData.ordersCount += 1; // Считаем как один заказ
    dayData.revenue += retailAmount;
    dayData.commission += commissionAmount;
    dayData.logistics += logisticsAmount;
    dayData.returns += returnAmount;
    dayData.itemsSold += quantity; // Только реально проданные товары (с датой реализации)
    
    // Все расходы
    dayData.totalExpenses = dayData.commission + dayData.logistics + dayData.storage + dayData.penalties + dayData.returns + additionalExpenses;
    
    // Реальная прибыль = выручка - все расходы
    dayData.profit = dayData.revenue - dayData.totalExpenses;
  }

  // Сохраняем статистику
  for (const [date, data] of salesByDate.entries()) {
    await marketplaceService.saveSales({
      marketplaceType: 'wildberries',
      accountName: setting.accountName,
      date,
      ordersCount: data.ordersCount,
      revenue: data.revenue,
      commission: data.commission,
      logistics: data.logistics,
      storage: data.storage,
      penalties: data.penalties,
      returns: data.returns,
      totalExpenses: data.totalExpenses,
      profit: data.profit,
      netRevenue: data.profit, // Чистая выручка = прибыль
      itemsSold: data.itemsSold, // Только реально проданные (выкупленные) товары
      averageOrderValue: data.ordersCount > 0 ? data.revenue / data.ordersCount : 0,
    });
  }
}

/**
 * Синхронизировать данные OZON
 */
async function syncOzon(setting: MarketplaceSetting, dateFrom: string, dateTo: string): Promise<void> {
  if (!setting.clientId) {
    throw new Error('Client ID не указан для OZON');
  }

  const ozonService = new OzonApiService({
    apiKey: setting.apiKey,
    clientId: setting.clientId,
  });

  // Получаем данные
  const { orders, analytics, salesReport } = await ozonService.syncData(dateFrom, dateTo);

  // Сохраняем заказы (необязательно, можно пропустить при ошибке)
  try {
    for (const order of orders || []) {
      // Проверяем наличие обязательных полей
      const orderId = order.order_id || order.id;
      if (!orderId) {
        console.warn('Пропущен заказ OZON без ID:', order);
        continue;
      }
      
      const totalAmount = parseFloat(order.financial_data?.products?.[0]?.price || '0') || 0;
      const commission = parseFloat(order.financial_data?.products?.[0]?.commission_amount || '0') || 0;
      const payout = parseFloat(order.financial_data?.products?.[0]?.payout || '0') || 0;

      await marketplaceService.saveOrder({
        marketplaceType: 'ozon',
        accountName: setting.accountName,
        marketplaceOrderId: String(orderId),
        orderNumber: order.order_number,
        orderDate: order.created_at,
        status: order.status,
        customerName: order.customer?.name,
        customerPhone: order.customer?.phone,
        customerEmail: order.customer?.email,
        deliveryAddress: order.analytics_data ? `${order.analytics_data.region}, ${order.analytics_data.city}` : undefined,
        totalAmount,
        commission,
        netAmount: payout,
        deliveryCost: 0,
        items: order.products.map(p => ({
          name: p.name,
          sku: p.offer_id,
          quantity: p.quantity,
          price: parseFloat(p.price || '0'),
        })),
        paymentMethod: order.analytics_data?.payment_type_group_name,
        deliveryMethod: order.delivery_method?.name,
        trackingNumber: order.tracking_number,
        metadata: {
          postingNumber: order.posting_number,
          warehouseName: order.analytics_data?.warehouse_name,
        },
      });
    }
  } catch (error) {
    console.warn('Ошибка сохранения заказов OZON (продолжаем):', error);
  }

  // Обрабатываем финансовый отчет (аналог WB salesReport)
  // Агрегируем статистику по дням
  const salesByDate = new Map<string, any>();
  
  // Сначала собираем количество товаров из заказов (там точно есть информация о количестве)
  const itemsByDate = new Map<string, number>();
  for (const order of orders || []) {
    // Учитываем только доставленные заказы (реально проданные)
    const orderStatus = order.status?.toLowerCase() || '';
    if (orderStatus.includes('delivered') || orderStatus.includes('доставлен') || 
        orderStatus.includes('delivering') || orderStatus.includes('доставляется')) {
      const orderDate = order.delivery_date?.split('T')[0] || order.created_at?.split('T')[0];
      if (orderDate) {
        const totalQuantity = order.products?.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0;
        itemsByDate.set(orderDate, (itemsByDate.get(orderDate) || 0) + totalQuantity);
      }
    }
  }
  
  // Также используем аналитику для проверки количества доставленных товаров
  for (const dayAnalytics of analytics || []) {
    if (dayAnalytics.date && dayAnalytics.delivered_units) {
      // delivered_units - это количество реально доставленных (выкупленных) товаров
      itemsByDate.set(dayAnalytics.date, (itemsByDate.get(dayAnalytics.date) || 0) + dayAnalytics.delivered_units);
    }
  }

  for (const transaction of salesReport || []) {
    // Фильтруем только операции продаж (не возвраты, не отмены)
    const operationType = transaction.operation_type?.toLowerCase() || '';
    const operationTypeName = transaction.operation_type_name?.toLowerCase() || '';
    
    // Пропускаем возвраты и отмены
    if (operationType.includes('return') || operationType.includes('cancel') ||
        operationTypeName.includes('возврат') || operationTypeName.includes('отмена')) {
      continue;
    }
    
    // Учитываем только операции продаж
    // operation_type: "operation" - продажа
    // operation_type: "delivery" - доставка (может быть расходом)
    // operation_type: "services" - услуги (может быть расходом)
    // operation_type: "other_deductions" - прочие удержания (расходы)
    
    const date = transaction.operation_date?.split('T')[0] || transaction.posting?.order_date?.split('T')[0];
    if (!date) {
      continue;
    }
    
    if (!salesByDate.has(date)) {
      salesByDate.set(date, {
        date,
        ordersCount: 0,
        revenue: 0, // Выручка (accruals_for_sale)
        commission: 0, // Комиссия (sale_commission)
        logistics: 0, // Логистика (delivery_charge, accruals_for_sale_delivery)
        storage: 0, // Хранение (storage_fee)
        penalties: 0, // Штрафы (penalty)
        returns: 0, // Возвраты (return_delivery_charge, accruals_for_sale_return)
        totalExpenses: 0,
        profit: 0,
        itemsSold: 0, // Количество проданных товаров
      });
    }

    const dayData = salesByDate.get(date)!;
    
    // Определяем тип операции
    const isSale = operationType === 'operation' || transaction.type === 'orders';
    const isDelivery = operationType === 'delivery';
    const isService = operationType === 'services';
    const isDeduction = operationType === 'other_deductions';
    
    if (isSale) {
      // Продажа - это выручка
      // В API OZON расходы могут приходить как отрицательные числа, берем по модулю
      const revenue = Math.abs(transaction.accruals_for_sale || transaction.amount || 0);
      const commission = Math.abs(transaction.sale_commission || 0);
      
      // Пытаемся получить количество из транзакции
      let quantity = transaction.items?.reduce((sum: number, item: any) => sum + Math.max(0, item.quantity || 0), 0) || 0;
      
      // Если в транзакции нет количества, используем данные из заказов/аналитики
      if (quantity === 0 && itemsByDate.has(date)) {
        // Используем количество из заказов/аналитики для этой даты
        // Но не добавляем повторно, так как это уже учтено
        quantity = 0; // Не добавляем, чтобы не дублировать
      }
      
      dayData.revenue += revenue;
      dayData.commission += commission; // Комиссия всегда положительная (расход)
      if (quantity > 0) {
        dayData.itemsSold += quantity;
      }
      
      // Считаем заказы по уникальным posting_number
      if (transaction.posting?.posting_number) {
        dayData.ordersCount += 1;
      }
    } else if (isDelivery) {
      // Доставка - это расход (всегда положительное число)
      const deliveryCharge = Math.abs(transaction.delivery_charge || transaction.accruals_for_sale_delivery || transaction.amount || 0);
      const deliveryCommission = Math.abs(transaction.sale_commission_delivery || 0);
      dayData.logistics += deliveryCharge + deliveryCommission;
    } else if (isService) {
      // Услуги - могут быть разными расходами (всегда положительные)
      const serviceAmount = Math.abs(transaction.amount || 0);
      // Проверяем тип услуги по названию
      if (transaction.services) {
        for (const service of transaction.services) {
          const servicePrice = Math.abs(service.price || 0);
          const serviceName = service.name?.toLowerCase() || '';
          if (serviceName.includes('хранен') || serviceName.includes('storage')) {
            dayData.storage += servicePrice;
          } else if (serviceName.includes('штраф') || serviceName.includes('penalty')) {
            dayData.penalties += servicePrice;
          } else {
            // Прочие услуги считаем как логистику
            dayData.logistics += servicePrice;
          }
        }
      } else {
        dayData.logistics += serviceAmount;
      }
    } else if (isDeduction) {
      // Прочие удержания (всегда положительные - это расходы)
      const deductionAmount = Math.abs(transaction.amount || 0);
      const deductionName = transaction.operation_type_name?.toLowerCase() || '';
      if (deductionName.includes('хранен') || deductionName.includes('storage')) {
        dayData.storage += deductionAmount;
      } else if (deductionName.includes('штраф') || deductionName.includes('penalty')) {
        dayData.penalties += deductionAmount;
      } else {
        dayData.logistics += deductionAmount;
      }
    }
    
    // Обрабатываем возвраты отдельно (всегда положительные - это расходы)
    if (transaction.return_delivery_charge) {
      dayData.returns += Math.abs(transaction.return_delivery_charge);
    }
    if (transaction.accruals_for_sale_return) {
      dayData.returns += Math.abs(transaction.accruals_for_sale_return);
    }
    if (transaction.sale_commission_return) {
      dayData.returns += Math.abs(transaction.sale_commission_return);
    }
    
    // Хранение и штрафы из отдельных полей (всегда положительные)
    if (transaction.storage_fee) {
      dayData.storage += Math.abs(transaction.storage_fee);
    }
    if (transaction.penalty) {
      dayData.penalties += Math.abs(transaction.penalty);
    }
    if (transaction.other_deductions) {
      dayData.penalties += Math.abs(transaction.other_deductions);
    }
  }

  // Рассчитываем итоговые значения для каждого дня
  for (const [date, data] of salesByDate.entries()) {
    // Все расходы (убеждаемся, что все положительные)
    const commission = Math.abs(data.commission || 0);
    const logistics = Math.abs(data.logistics || 0);
    const storage = Math.abs(data.storage || 0);
    const penalties = Math.abs(data.penalties || 0);
    const returns = Math.abs(data.returns || 0);
    
    data.totalExpenses = commission + logistics + storage + penalties + returns;
    
    // Реальная прибыль = выручка - все расходы
    // Выручка должна быть положительной, расходы тоже
    data.profit = Math.abs(data.revenue || 0) - data.totalExpenses;
    
    // Если количество товаров из финансовых транзакций = 0, используем данные из заказов/аналитики
    let finalItemsSold = data.itemsSold;
    if (finalItemsSold === 0 && itemsByDate.has(date)) {
      finalItemsSold = itemsByDate.get(date) || 0;
    }
    
    // Если все еще 0, пытаемся получить из аналитики
    if (finalItemsSold === 0) {
      const dayAnalytics = analytics?.find((a: any) => a.date === date);
      if (dayAnalytics?.delivered_units) {
        finalItemsSold = dayAnalytics.delivered_units;
      }
    }
    
    // Сохраняем статистику
    await marketplaceService.saveSales({
      marketplaceType: 'ozon',
      accountName: setting.accountName,
      date,
      ordersCount: data.ordersCount || (finalItemsSold > 0 ? 1 : 0), // Если нет заказов, но есть товары, считаем как минимум 1 заказ
      revenue: data.revenue,
      commission: data.commission,
      logistics: data.logistics,
      storage: data.storage,
      penalties: data.penalties,
      returns: data.returns,
      totalExpenses: data.totalExpenses,
      profit: data.profit,
      netRevenue: data.profit, // Чистая выручка = прибыль
      itemsSold: finalItemsSold, // Количество реально проданных (выкупленных) товаров
      averageOrderValue: (data.ordersCount || 1) > 0 ? data.revenue / (data.ordersCount || 1) : 0,
    });
  }
  
  // Если нет финансовых транзакций, но есть аналитика, создаем записи из аналитики
  if (salesByDate.size === 0 && analytics && analytics.length > 0) {
    for (const dayAnalytics of analytics) {
      if (!dayAnalytics.date) continue;
      
      const revenue = dayAnalytics.revenue || 0;
      const itemsSold = dayAnalytics.delivered_units || 0; // delivered_units - реально доставленные товары
      const ordersCount = dayAnalytics.ordered_units || 0;
      
      // Пропускаем дни без продаж
      if (revenue === 0 && itemsSold === 0) continue;
      
      // Примерная комиссия OZON (обычно 5-15%, берем среднее 10%)
      const commission = revenue * 0.1;
      const totalExpenses = commission;
      const profit = revenue - totalExpenses;
      
      await marketplaceService.saveSales({
        marketplaceType: 'ozon',
        accountName: setting.accountName,
        date: dayAnalytics.date,
        ordersCount: ordersCount || (itemsSold > 0 ? 1 : 0),
        revenue,
        commission,
        logistics: 0,
        storage: 0,
        penalties: 0,
        returns: dayAnalytics.returns || 0,
        totalExpenses,
        profit,
        netRevenue: profit,
        itemsSold, // delivered_units - реально доставленные (выкупленные) товары
        averageOrderValue: ordersCount > 0 ? revenue / ordersCount : 0,
      });
    }
  }
}

/**
 * Синхронизировать все активные аккаунты
 */
export async function syncAllMarketplaces(): Promise<void> {
  const settings = await marketplaceService.getAllSettings();
  const activeSettings = settings.filter(s => s.isActive && s.syncEnabled);

  for (const setting of activeSettings) {
    try {
      await syncMarketplaceAccount(setting);
    } catch (error) {
      console.error(`Ошибка синхронизации ${setting.accountName}:`, error);
      // Продолжаем синхронизацию других аккаунтов
    }
  }
}

