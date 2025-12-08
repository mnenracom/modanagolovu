import * as XLSX from 'xlsx';
import { Product } from '@/types/product';
import { productsService, ProductFormData } from '@/services/productsService';

export interface ProductExcelRow {
  артикул: string; // Внутренний артикул (например "ПГХ3005") - обязательное
  SKU?: string; // nmId с WildBerries (например "211164858") - для wb_nm_id
  название: string; // Обязательное
  описание?: string;
  категория: string;
  подкатегория?: string;
  материал?: string;
  себестоимость?: number;
  рекомендованная_цена?: number;
  минимальная_цена?: number;
  максимальная_цена?: number;
  розничная_цена?: number;
  оптовая_цена?: number;
  остаток?: number;
  в_наличии?: string; // "Да" или "Нет"
  цвета?: string; // Через точку с запятой
  размеры?: string; // Через точку с запятой
  баркод?: string;
  фото?: string; // URL фотографии (может быть несколько через точку с запятой)
  вес_граммы?: number; // Вес товара в граммах
  длина_см?: number; // Длина товара в сантиметрах
  ширина_см?: number; // Ширина товара в сантиметрах
  высота_см?: number; // Высота товара в сантиметрах
}

/**
 * Экспорт товаров в Excel файл для редактирования
 */
export async function exportProductsToExcel(): Promise<void> {
  try {
    // Получаем все товары
    const { data: products } = await productsService.getAll({ limit: 10000 });
    
    // Преобразуем товары в формат Excel
    const rows: ProductExcelRow[] = products.map((product) => {
      const retailPrice = product.retailPrice ?? product.price ?? 0;
      const wholesalePrice = product.wholesalePrice ?? product.price ?? 0;
      
      // Получаем себестоимость и рекомендованную цену из metadata
      const costPrice = product.importMetadata?.costPrice || 0;
      const recommendedPrice = product.importMetadata?.recommendedPrice || retailPrice;
      const minPrice = product.importMetadata?.minPrice || recommendedPrice;
      const maxPrice = product.importMetadata?.maxPrice || recommendedPrice;
      
      return {
        артикул: product.article || product.importMetadata?.артикул || '', // Внутренний артикул
        SKU: product.sku || product.wbNmId || '', // nmId с WildBerries (sku теперь = nmId)
        название: product.name,
        описание: product.description || '',
        категория: product.category,
        подкатегория: product.subcategory || '',
        материал: product.material || '',
        себестоимость: costPrice > 0 ? costPrice : undefined,
        рекомендованная_цена: recommendedPrice > 0 ? recommendedPrice : undefined,
        минимальная_цена: minPrice > 0 ? minPrice : undefined,
        максимальная_цена: maxPrice > 0 ? maxPrice : undefined,
        розничная_цена: retailPrice > 0 ? retailPrice : undefined,
        оптовая_цена: wholesalePrice > 0 ? wholesalePrice : undefined,
        остаток: product.stock || 0,
        в_наличии: product.inStock ? 'Да' : 'Нет',
        цвета: product.colors && product.colors.length > 0 ? product.colors.join('; ') : '',
        размеры: product.sizes && product.sizes.length > 0 ? product.sizes.join('; ') : '',
        баркод: product.importMetadata?.barcode || '',
        фото: product.images && product.images.length > 0 ? product.images.join('; ') : '',
        вес_граммы: product.weightGrams || undefined,
        длина_см: product.lengthCm || undefined,
        ширина_см: product.widthCm || undefined,
        высота_см: product.heightCm || undefined,
      };
    });
    
    // Создаем рабочую книгу
    const workbook = XLSX.utils.book_new();
    
    // Создаем лист с данными
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        'артикул',
        'SKU',
        'название',
        'описание',
        'категория',
        'подкатегория',
        'материал',
        'себестоимость',
        'рекомендованная_цена',
        'минимальная_цена',
        'максимальная_цена',
        'розничная_цена',
        'оптовая_цена',
        'остаток',
        'в_наличии',
        'цвета',
        'размеры',
        'баркод',
        'фото',
        'вес_граммы',
        'длина_см',
        'ширина_см',
        'высота_см',
      ],
    });
    
    // Устанавливаем ширину колонок
    const colWidths = [
      { wch: 15 }, // артикул
      { wch: 15 }, // SKU (nmId)
      { wch: 40 }, // название
      { wch: 50 }, // описание
      { wch: 15 }, // категория
      { wch: 20 }, // подкатегория
      { wch: 20 }, // материал
      { wch: 12 }, // себестоимость
      { wch: 18 }, // рекомендованная_цена
      { wch: 15 }, // минимальная_цена
      { wch: 15 }, // максимальная_цена
      { wch: 15 }, // розничная_цена
      { wch: 15 }, // оптовая_цена
      { wch: 10 }, // остаток
      { wch: 12 }, // в_наличии
      { wch: 30 }, // цвета
      { wch: 30 }, // размеры
      { wch: 15 }, // баркод
      { wch: 60 }, // фото
      { wch: 12 }, // вес_граммы
      { wch: 12 }, // длина_см
      { wch: 12 }, // ширина_см
      { wch: 12 }, // высота_см
    ];
    worksheet['!cols'] = colWidths;
    
    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Товары');
    
    // Создаем лист с инструкциями
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['ИНСТРУКЦИЯ ПО ЗАПОЛНЕНИЮ'],
      [''],
      ['ОБЯЗАТЕЛЬНЫЕ ПОЛЯ:'],
      ['- артикул: Внутренний артикул товара (например "ПГХ3005") - обязательное'],
      ['- название: Название товара - обязательное'],
      [''],
      ['ВАЖНО:'],
      ['- Не удаляйте и не переименовывайте колонки'],
      ['- Не меняйте порядок колонок'],
      ['- Артикул должен быть уникальным для каждого товара'],
      ['- SKU: nmId товара с WildBerries (например "211164858") - для синхронизации отзывов'],
      ['- Фото: URL фотографий через точку с запятой (;), например: https://example.com/photo1.jpg; https://example.com/photo2.jpg'],
      ['- Цены указывайте в рублях, без копеек (можно с копейками)'],
      ['- Цвета и размеры указывайте через точку с запятой (;), например: красный; синий; зеленый'],
      ['- В наличии: укажите "Да" или "Нет"'],
      [''],
      ['ПОЛЯ ДЛЯ ЦЕН:'],
      ['- себестоимость: Себестоимость товара (для расчета маржи)'],
      ['- рекомендованная_цена: Рекомендованная цена продажи'],
      ['- минимальная_цена: Минимальная цена (ниже не опускаться)'],
      ['- максимальная_цена: Максимальная цена (выше не подниматься)'],
      ['- розничная_цена: Розничная цена на сайте'],
      ['- оптовая_цена: Оптовая цена (при покупке от определенного количества)'],
    ]);
    instructionsSheet['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Инструкция');
    
    // Сохраняем файл
    const fileName = `товары_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error: any) {
    console.error('Ошибка экспорта товаров в Excel:', error);
    throw new Error(`Не удалось экспортировать товары: ${error.message || 'Неизвестная ошибка'}`);
  }
}

/**
 * Импорт товаров из Excel файла (упрощенный формат)
 */
export async function importProductsFromExcel(
  file: File,
  options: {
    updateExisting?: boolean; // Обновлять существующие товары по SKU
    skipDuplicates?: boolean; // Пропускать дубликаты
  } = {}
): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Берем первый лист
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Конвертируем в JSON (первая строка - заголовки)
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: null,
          header: 1, // Первая строка - заголовки
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Файл пуст или содержит только заголовки'));
          return;
        }
        
        // Первая строка - заголовки
        const headers = (jsonData[0] as any[]).map((h: any) => 
          String(h || '').toLowerCase().trim().replace(/\s+/g, '_')
        );
        
        console.log('Заголовки Excel:', headers);
        
        // Находим индексы колонок (поиск нечувствителен к регистру)
        const getColIndex = (name: string): number => {
          const nameLower = name.toLowerCase();
          return headers.findIndex(h => {
            const hLower = h.toLowerCase();
            return hLower === nameLower || 
                   hLower.includes(nameLower) || 
                   nameLower.includes(hLower);
          });
        };
        
        const colIndexes = {
          артикул: getColIndex('артикул'),
          SKU: getColIndex('sku'),
          название: getColIndex('название'),
          описание: getColIndex('описание'),
          категория: getColIndex('категория'),
          подкатегория: getColIndex('подкатегория'),
          материал: getColIndex('материал'),
          себестоимость: getColIndex('себестоимость'),
          рекомендованная_цена: getColIndex('рекомендованная_цена'),
          минимальная_цена: getColIndex('минимальная_цена'),
          максимальная_цена: getColIndex('максимальная_цена'),
          розничная_цена: getColIndex('розничная_цена'),
          оптовая_цена: getColIndex('оптовая_цена'),
          остаток: getColIndex('остаток'),
          в_наличии: getColIndex('в_наличии'),
          цвета: getColIndex('цвета'),
          размеры: getColIndex('размеры'),
          баркод: getColIndex('баркод'),
          фото: getColIndex('фото'),
          вес_граммы: getColIndex('вес_граммы'),
          длина_см: getColIndex('длина_см'),
          ширина_см: getColIndex('ширина_см'),
          высота_см: getColIndex('высота_см'),
        };
        
        // Проверяем обязательные колонки
        if (colIndexes.артикул === -1 || colIndexes.название === -1) {
          reject(new Error('В файле отсутствуют обязательные колонки: "артикул" или "название"'));
          return;
        }
        
        const results = {
          created: 0,
          updated: 0,
          skipped: 0,
          errors: [] as string[],
        };
        
        const importBatchId = `excel_import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Обрабатываем каждую строку данных
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row || row.length === 0) continue;
          
          try {
            // Извлекаем значения из строки
            const getValue = (colIndex: number): string | null => {
              if (colIndex === -1 || !row[colIndex]) return null;
              const value = String(row[colIndex]).trim();
              return value === '' ? null : value;
            };
            
            const getNumber = (colIndex: number): number | null => {
              const value = getValue(colIndex);
              if (!value) return null;
              const cleaned = value.replace(/\s/g, '').replace(',', '.').replace(/[pр₽]/gi, '');
              const parsed = parseFloat(cleaned);
              return isNaN(parsed) || parsed < 0 ? null : parsed;
            };
            
            // Артикул - это внутренний артикул (например "ПГХ3005") - используется только для идентификации
            const артикул = getValue(colIndexes.артикул);
            // SKU - это nmId с WildBerries (например "211164858") - ОБЯЗАТЕЛЬНО для поля sku
            const wbNmId = getValue(colIndexes.SKU);
            const name = getValue(colIndexes.название);
            
            console.log(`Строка ${i + 1}: артикул="${артикул}", SKU(nmId)="${wbNmId}", название="${name}"`);
            
            // Пропускаем строки без названия или без SKU (nmId)
            if (!name || !wbNmId) {
              if (!wbNmId) {
                console.warn(`Строка ${i + 1}: пропущена - нет SKU (nmId). Артикул: ${артикул || 'не указан'}`);
              }
              results.skipped++;
              continue;
            }
            
            // SKU = nmId из столбца "SKU" (НЕ артикул!)
            const sku = wbNmId;
            
            // Парсим данные
            const description = getValue(colIndexes.описание) || '';
            const category = getValue(colIndexes.категория) || 'scarves';
            const subcategory = getValue(colIndexes.подкатегория);
            const material = getValue(colIndexes.материал) || '';
            const costPrice = getNumber(colIndexes.себестоимость);
            const recommendedPrice = getNumber(colIndexes.рекомендованная_цена);
            const minPrice = getNumber(colIndexes.минимальная_цена);
            const maxPrice = getNumber(colIndexes.максимальная_цена);
            const retailPrice = getNumber(colIndexes.розничная_цена) || recommendedPrice || 0;
            const wholesalePrice = getNumber(colIndexes.оптовая_цена) || retailPrice;
            const stock = getNumber(colIndexes.остаток) || 0;
            const inStockStr = getValue(colIndexes.в_наличии);
            const inStock = inStockStr ? inStockStr.toLowerCase() === 'да' : stock > 0;
            const colorsStr = getValue(colIndexes.цвета);
            const sizesStr = getValue(colIndexes.размеры);
            const barcode = getValue(colIndexes.баркод);
            const фотоStr = getValue(colIndexes.фото);
            const weightGrams = getNumber(colIndexes.вес_граммы);
            const lengthCm = getNumber(colIndexes.длина_см);
            const widthCm = getNumber(colIndexes.ширина_см);
            const heightCm = getNumber(colIndexes.высота_см);
            
            const colors = colorsStr ? colorsStr.split(';').map(c => c.trim()).filter(Boolean) : [];
            const sizes = sizesStr ? sizesStr.split(';').map(s => s.trim()).filter(Boolean) : [];
            
            // Парсим фото - может быть несколько URL через точку с запятой
            const images = фотоStr ? фотоStr.split(';').map(url => url.trim()).filter(url => {
              // Проверяем, что это валидный URL
              try {
                new URL(url);
                return true;
              } catch {
                return false;
              }
            }) : [];
            
            // Формируем данные для создания/обновления товара
            const productFormData: ProductFormData = {
              name,
              description,
              category: category as any,
              subcategory,
              material,
              sku: sku, // SKU = nmId из столбца "SKU" (НЕ артикул!)
              price: retailPrice,
              retail_price: retailPrice,
              wholesale_price: wholesalePrice,
              wholesale_threshold: 10,
              stock_quantity: Math.floor(stock),
              in_stock: inStock,
              colors,
              sizes,
              images: images, // Фото из столбца "фото"
              min_order_quantity: 1,
              import_source: 'excel',
              imported_at: new Date().toISOString(),
              import_batch_id: importBatchId,
              import_metadata: {
                costPrice: costPrice || undefined,
                recommendedPrice: recommendedPrice || undefined,
                minPrice: minPrice || recommendedPrice || undefined,
                maxPrice: maxPrice || recommendedPrice || undefined,
                barcode: barcode || undefined,
              },
              // Сохраняем артикул в отдельное поле article
              article: артикул && артикул.trim() ? артикул.trim() : undefined,
              // wb_nm_id = то же самое, что и sku (nmId)
              wbNmId: wbNmId,
              // Поля для веса и габаритов
              weight_grams: weightGrams ? Math.floor(weightGrams) : undefined,
              length_cm: lengthCm || undefined,
              width_cm: widthCm || undefined,
              height_cm: heightCm || undefined,
            };
            
            console.log(`Товар "${name}": sku="${sku}", article="${productFormData.article || 'не указан'}", wbNmId="${wbNmId}"`);
            
            // Проверяем, существует ли товар с таким SKU
            // Сначала ищем по SKU (nmId), если нет - по артикулу
            const { data: existingProducts } = await productsService.getAll({
              search: sku,
            });
            
            let existing = existingProducts.find(
              p => p.sku && p.sku.toLowerCase().trim() === sku.toLowerCase().trim()
            );
            
            // Если не нашли по SKU, ищем по артикулу (если он указан)
            if (!existing && артикул && артикул.trim()) {
              const { data: productsByArticle } = await productsService.getAll({
                search: артикул,
              });
              
              // Ищем по новому полю article или по старому importMetadata.артикул
              existing = productsByArticle.find(
                p => (p.article && p.article.toLowerCase().trim() === артикул.toLowerCase().trim()) ||
                     (p.importMetadata?.артикул && p.importMetadata.артикул.toLowerCase().trim() === артикул.toLowerCase().trim())
              );
            }
            
            if (existing) {
              if (options.updateExisting) {
                console.log(`Обновление товара ID=${existing.id}: article="${productFormData.article || 'не указан'}"`);
                await productsService.update(parseInt(existing.id), productFormData);
                results.updated++;
              } else if (options.skipDuplicates) {
                results.skipped++;
              } else {
                results.skipped++;
              }
            } else {
              console.log(`Создание нового товара: article="${productFormData.article || 'не указан'}"`);
              await productsService.create(productFormData);
              results.created++;
            }
          } catch (error: any) {
            const errorMsg = `Строка ${i + 1}: ${error.message || 'Неизвестная ошибка'}`;
            results.errors.push(errorMsg);
            console.error(errorMsg, error);
          }
        }
        
        resolve(results);
      } catch (error: any) {
        console.error('Ошибка импорта из Excel:', error);
        reject(new Error(`Ошибка импорта: ${error.message || 'Неизвестная ошибка'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Ошибка чтения файла'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

