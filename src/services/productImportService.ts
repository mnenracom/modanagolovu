import * as XLSX from 'xlsx';
import { productsService, ProductFormData } from '@/services/productsService';

export interface ImportedProduct {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  material?: string;
  sku?: string;
  barcode?: string;
  price?: number;
  retail_price?: number;
  wholesale_price?: number;
  stock_quantity?: number;
  in_stock?: boolean;
  colors?: string[];
  sizes?: string[];
  images?: string[];
  // Дополнительные поля из WB
  wb_article?: string;
  wb_barcode?: string;
  wb_price?: number;
  wb_quantity?: number;
  [key: string]: any; // Для других полей
}

export interface ImportPreview {
  products: ImportedProduct[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
}

export class ProductImportService {
  /**
   * Парсит Excel файл с товарами WildBerries
   */
  static async parseWildBerriesExcel(file: File): Promise<ImportedProduct[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Берем первый лист
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Конвертируем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: null,
            header: 1, // Первая строка - заголовки
          });

          if (jsonData.length < 2) {
            reject(new Error('Файл пуст или содержит только заголовки'));
            return;
          }

          // Ищем строку с заголовками (может быть не первая, если есть подзаголовки)
          let headerRowIndex = 0;
          for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0) {
              const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
              // Ищем строку, которая содержит ключевые слова заголовков
              if (rowText.includes('артикул') || rowText.includes('наименование') || 
                  rowText.includes('название') || rowText.includes('категория')) {
                headerRowIndex = i;
                break;
              }
            }
          }

          // Первая строка - заголовки
          const headers = (jsonData[headerRowIndex] as any[]).map((h: any) => 
            String(h || '').toLowerCase().trim()
          );

          console.log('Найденные заголовки в Excel (строка ' + (headerRowIndex + 1) + '):', headers);

          // Остальные строки - данные (начинаем со строки после заголовков)
          const products: ImportedProduct[] = [];

          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;

            // Пропускаем полностью пустые строки
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
            if (!hasData) continue;

            // Пропускаем строки с подсказками/описаниями (обычно содержат длинные тексты без артикулов)
            const rowText = row.map(cell => String(cell || '')).join(' ').toLowerCase();
            if (rowText.includes('это номер или название') || 
                rowText.includes('уникальный идентификатор') ||
                rowText.includes('будет сохранен') ||
                rowText.includes('можно посмотреть') ||
                rowText.includes('если вы не заполните') ||
                rowText.includes('список ссылок') ||
                rowText.includes('ссылка на видео') ||
                rowText.includes('максимальное количество')) {
              console.log(`Пропущена строка ${i + 1} (подсказка/описание):`, rowText.substring(0, 100));
              continue;
            }

            const product: any = {};

            // Парсим каждую колонку
            headers.forEach((header, index) => {
              const value = row[index];
              if (value === null || value === undefined || value === '') return;

              const stringValue = String(value).trim();
              
              // Маппинг колонок - специфично для формата WildBerries
              // Приоритет: точные совпадения, затем частичные
              
              // Наименование / Название
              if (header === 'наименование' || header.includes('наименование') || 
                  header === 'название' || header.includes('название') || 
                  header.includes('name') || header.includes('товар')) {
                product.name = stringValue;
              } 
              // Артикул продавца (SKU)
              else if (header === 'артикул продавца' || header.includes('артикул продавца') ||
                       header === 'артикул' && !header.includes('wb')) {
                product.sku = stringValue;
                product.wb_article = stringValue;
              }
              // Артикул WB
              else if (header.includes('артикул wb') || header.includes('артикулwb') ||
                       (header.includes('артикул') && header.includes('wb'))) {
                product.wb_article = stringValue;
                // Если SKU еще не заполнен, используем артикул WB
                if (!product.sku) {
                  product.sku = stringValue;
                }
              }
              // Описание
              else if (header === 'описание' || header.includes('описание') || 
                       header.includes('description')) {
                product.description = stringValue;
              } 
              // Категория продавца
              else if (header === 'категория продавца' || header.includes('категория продавца') ||
                       header === 'категория' || header.includes('category')) {
                product.category = this.mapCategory(stringValue);
              } 
              // Подкатегория
              else if (header.includes('подкатегория') || header.includes('subcategory')) {
                product.subcategory = stringValue;
              } 
              // Материал
              else if (header.includes('материал') || header.includes('material')) {
                product.material = stringValue;
              } 
              // Баркод / Штрихкод
              else if (header === 'баркод' || header.includes('баркод') ||
                       header.includes('штрихкод') || header.includes('штрих-код') || 
                       header.includes('штрих код') || header.includes('barcode') || 
                       header.includes('ean')) {
                product.barcode = stringValue;
                product.wb_barcode = stringValue;
              } 
              // Цена - НЕ берем из WB, цены будут из второго Excel
              // else if (header.includes('цена') || header.includes('price') || 
              //          header.includes('стоимость')) {
              //   // Пропускаем цены из WB
              // } 
              // Остаток / Количество
              else if (header.includes('остаток') || header.includes('stock') || 
                       header.includes('quantity') || header.includes('количество') || 
                       header.includes('кол-во') || header.includes('колво')) {
                const quantity = this.parseNumber(stringValue);
                if (quantity !== null) {
                  product.stock_quantity = Math.floor(quantity);
                  product.wb_quantity = Math.floor(quantity);
                  product.in_stock = quantity > 0;
                }
              } 
              // Цвет
              else if (header === 'цвет' || header.includes('цвет') || 
                       header.includes('color')) {
                if (!product.colors) product.colors = [];
                const colors = stringValue.split(/[;,]/).map(c => c.trim()).filter(Boolean);
                product.colors.push(...colors);
              } 
              // Размер
              else if (header === 'размер' || header.includes('размер') && !header.includes('рос')) {
                if (!product.sizes) product.sizes = [];
                const sizes = stringValue.split(/[;,]/).map(s => s.trim()).filter(Boolean);
                product.sizes.push(...sizes);
              }
              // Рос. размер (тоже добавляем в размеры)
              else if (header.includes('рос. размер') || header.includes('рос размер') ||
                       header.includes('российский размер')) {
                if (!product.sizes) product.sizes = [];
                const sizes = stringValue.split(/[;,]/).map(s => s.trim()).filter(Boolean);
                product.sizes.push(...sizes);
              }
              // Фото / Изображения
              else if (header === 'фото' || header.includes('фото') ||
                       header.includes('изображен') || header.includes('image') || 
                       header.includes('картинк') || header.includes('photo')) {
                if (!product.images) product.images = [];
                const images = stringValue.split(/[;\s]/).map(img => img.trim()).filter(Boolean);
                product.images.push(...images);
              }
              // Бренд (можем использовать как материал или добавить в описание)
              else if (header === 'бренд' || header.includes('бренд') || 
                       header.includes('brand')) {
                if (!product.material) {
                  product.material = stringValue;
                }
              }
            });

            // Валидация: обязательны название И артикул (SKU)
            // Без артикула мы не сможем объединить с ценами
            if (product.name && product.sku) {
              // Все хорошо, товар валиден
            } else if (product.sku) {
              // Есть артикул, но нет названия - создаем название из артикула
              product.name = `Товар ${product.sku}`;
            } else if (product.name) {
              // Есть название, но нет артикула - пропускаем, так как не сможем объединить с ценами
              console.warn(`Строка ${i + 1} пропущена: есть название "${product.name}", но нет артикула (SKU)`);
              continue;
            } else {
              // Нет ни названия, ни артикула - пропускаем
              console.warn(`Строка ${i + 1} пропущена: нет названия и артикула`);
              continue;
            }

            // Убираем дубликаты из массивов
            if (product.colors) product.colors = [...new Set(product.colors)];
            if (product.sizes) product.sizes = [...new Set(product.sizes)];
            if (product.images) product.images = [...new Set(product.images)];

            // Устанавливаем цены по умолчанию (0), так как цены будут из второго Excel
            if (!product.price && !product.retail_price) {
              product.price = 0;
              product.retail_price = 0;
            }

            products.push(product as ImportedProduct);
          }

          console.log(`Распарсено товаров: ${products.length} из ${jsonData.length - 1} строк`);

          resolve(products);
        } catch (error) {
          console.error('Ошибка парсинга Excel файла:', error);
          reject(new Error(`Ошибка парсинга Excel файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Маппинг категорий из различных форматов
   */
  private static mapCategory(category: string): string {
    const cat = category.toLowerCase().trim();
    
    if (cat.includes('платок') || cat.includes('scarf')) return 'scarves';
    if (cat.includes('бандана') || cat.includes('bandana')) return 'bandanas';
    if (cat.includes('капор') || cat.includes('capor')) return 'capor';
    if (cat.includes('косынка') || cat.includes('kosinka')) return 'kosinka';
    
    // По умолчанию
    return 'scarves';
  }

  /**
   * Парсит число из строки
   */
  private static parseNumber(value: string): number | null {
    if (!value) return null;
    
    // Убираем пробелы и заменяем запятую на точку
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Предпросмотр импорта с валидацией
   */
  static async previewImport(file: File): Promise<ImportPreview> {
    try {
      const products = await this.parseWildBerriesExcel(file);
      const errors: string[] = [];
      const warnings: string[] = [];
      let validCount = 0;

      console.log(`Предпросмотр: найдено ${products.length} товаров`);

      products.forEach((product, index) => {
        const rowNum = index + 2; // +2 потому что первая строка - заголовки, нумерация с 1

        // Валидация: обязательны название и артикул
        if (!product.name) {
          errors.push(`Строка ${rowNum}: отсутствует название товара (обязательно)`);
        }
        if (!product.sku) {
          errors.push(`Строка ${rowNum}: отсутствует артикул (SKU) - обязателен для объединения с ценами`);
        }
        // Цены не проверяем - они будут из второго Excel (всегда будут 0)
        // Количество на складе не проверяем - это нормально для импорта из WB
        if (!product.category) {
          warnings.push(`Строка ${rowNum}: отсутствует категория, будет установлена по умолчанию`);
        }

        // Товар считается валидным только если есть название И артикул
        if (product.name && product.sku) {
          validCount++;
        }
      });

      console.log(`Валидных товаров: ${validCount}, ошибок: ${errors.length}, предупреждений: ${warnings.length}`);

      return {
        products,
        totalCount: products.length,
        validCount,
        invalidCount: products.length - validCount,
        errors,
        warnings,
      };
    } catch (error: any) {
      console.error('Ошибка предпросмотра импорта:', error);
      throw error;
    }
  }

  /**
   * Импортирует товары в базу данных
   */
  static async importProducts(
    products: ImportedProduct[],
    importSource: string = 'wildberries',
    options: {
      updateExisting?: boolean; // Обновлять существующие товары по SKU
      skipDuplicates?: boolean; // Пропускать дубликаты
    } = {}
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const importBatchId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const productData of products) {
      try {
        // Формируем данные для создания товара
        const productFormData: ProductFormData = {
          name: productData.name,
          description: productData.description || '',
          category: productData.category || 'scarves',
          subcategory: productData.subcategory,
          material: productData.material || '',
          sku: productData.sku,
          // Цены всегда 0 - они будут из второго Excel
          price: 0,
          retail_price: 0,
          wholesale_price: productData.wholesale_price || 0,
          wholesale_threshold: 10, // Порог для опта по умолчанию
          stock_quantity: productData.stock_quantity || 0,
          in_stock: productData.in_stock !== undefined ? productData.in_stock : (productData.stock_quantity || 0) > 0,
          colors: productData.colors || [],
          sizes: productData.sizes || [],
          images: productData.images || [],
        };

        // Проверяем, существует ли товар с таким SKU
        if (productData.sku) {
          const { data: existingProducts } = await productsService.getAll({
            search: productData.sku,
          });

          const existing = existingProducts.find(
            p => p.sku && p.sku.toLowerCase().trim() === productData.sku!.toLowerCase().trim()
          );

          if (existing) {
            if (options.updateExisting) {
              // Обновляем существующий товар
              await productsService.update(parseInt(existing.id), {
                ...productFormData,
                import_source: importSource,
                imported_at: new Date().toISOString(),
                import_batch_id: importBatchId,
                import_metadata: {
                  ...productData,
                  updated: true,
                },
              });
              results.updated++;
            } else if (options.skipDuplicates) {
              results.skipped++;
              continue;
            } else {
              // Пропускаем, если не обновляем
              results.skipped++;
              continue;
            }
          } else {
            // Создаем новый товар
            await productsService.create({
              ...productFormData,
              import_source: importSource,
              imported_at: new Date().toISOString(),
              import_batch_id: importBatchId,
              import_metadata: productData,
            });
            results.created++;
          }
        } else {
          // Создаем без SKU (не рекомендуется)
          await productsService.create({
            ...productFormData,
            import_source: importSource,
            imported_at: new Date().toISOString(),
            import_batch_id: importBatchId,
            import_metadata: productData,
          });
          results.created++;
        }
      } catch (error: any) {
        const errorMsg = `Ошибка импорта товара "${productData.name || productData.sku}": ${error.message || 'Неизвестная ошибка'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return results;
  }
}

