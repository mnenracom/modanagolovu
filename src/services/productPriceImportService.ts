import * as XLSX from 'xlsx';
import { productsService } from '@/services/productsService';

export interface PriceImportData {
  sku: string;
  costPrice?: number;
  recommendedPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  barcode?: string;
  description?: string;
}

export interface PriceImportResult {
  matched: number;
  updated: number;
  notFound: string[];
  errors: string[];
}

/**
 * Сервис для импорта цен из Excel и объединения с существующими товарами
 */
export class ProductPriceImportService {
  /**
   * Парсит Excel файл с ценами (себестоимость, рекомендованная цена)
   */
  static async parsePriceFile(file: File): Promise<PriceImportData[]> {
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

          // Ищем строку с заголовками (может быть не первая, если есть заголовки таблиц)
          let headerRowIndex = -1;
          
          // Сначала ищем точное совпадение: "АРТИКУЛ" в первой колонке или в любой колонке
          for (let i = 0; i < Math.min(30, jsonData.length); i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0) {
              // Проверяем первую ячейку
              const firstCell = String(row[0] || '').toLowerCase().trim();
              // Также проверяем все ячейки строки
              const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
              
              // Ищем "артикул" в любой форме (может быть "Артикул", "АРТИКУЛ", "артикул продавца" и т.д.)
              const hasArticle = firstCell === 'артикул' || 
                                 firstCell.includes('артикул') ||
                                 rowText.includes('артикул');
              
              if (hasArticle) {
                // Проверяем, что есть хотя бы одна ценовая колонка
                const hasCost = rowText.includes('себестоимость') || 
                               rowText.includes('себест') ||
                               rowText.includes('cost');
                const hasRecommended = rowText.includes('рекомендованная') || 
                                      rowText.includes('рекомендованная цена') ||
                                      rowText.includes('recommended');
                const hasPrice = rowText.includes('цена') && !rowText.includes('рекомендованная');
                
                if (hasCost || hasRecommended || hasPrice) {
                  headerRowIndex = i;
                  console.log(`Найдена строка заголовков: ${i + 1}, первая ячейка: "${firstCell}"`);
                  console.log(`Содержимое строки:`, row.slice(0, 10).map(cell => String(cell || '').substring(0, 20)));
                  break;
                }
              }
            }
          }

          // Если не нашли по точному совпадению, ищем по ключевым словам (более гибко)
          if (headerRowIndex === -1) {
            console.log('Не найдено точное совпадение "АРТИКУЛ", ищем по ключевым словам...');
            for (let i = 0; i < Math.min(30, jsonData.length); i++) {
              const row = jsonData[i] as any[];
              if (row && row.length > 0) {
                const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
                
                // Более гибкий поиск артикула
                const hasArticle = rowText.includes('артикул') || 
                                  rowText.includes('article') ||
                                  rowText.includes('sku') ||
                                  rowText.includes('код') ||
                                  rowText.includes('номер');
                
                // Более гибкий поиск цен
                const hasCost = rowText.includes('себестоимость') || 
                               rowText.includes('себест') ||
                               rowText.includes('cost') ||
                               rowText.includes('себестоим');
                const hasRecommended = rowText.includes('рекомендованная') || 
                                      rowText.includes('рекомендованная цена') ||
                                      rowText.includes('recommended') ||
                                      rowText.includes('рекоменд');
                const hasPrice = (rowText.includes('цена') || rowText.includes('price')) && 
                                !rowText.includes('рекомендованная');
                
                // Если есть артикул и хотя бы одна из ценовых колонок
                if (hasArticle && (hasCost || hasRecommended || hasPrice)) {
                  headerRowIndex = i;
                  console.log(`Найдена строка заголовков по ключевым словам: ${i + 1}`);
                  console.log(`Содержимое строки:`, row.slice(0, 10).map(cell => String(cell || '').substring(0, 20)));
                  break;
                }
              }
            }
          }
          
          // Если все еще не нашли, пробуем найти любую строку с "цена" или "себестоимость"
          if (headerRowIndex === -1) {
            console.log('Пробуем найти строку с любыми ценовыми колонками...');
            for (let i = 0; i < Math.min(30, jsonData.length); i++) {
              const row = jsonData[i] as any[];
              if (row && row.length > 0) {
                const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
                const hasCost = rowText.includes('себестоимость') || rowText.includes('себест') || rowText.includes('cost');
                const hasPrice = rowText.includes('цена') || rowText.includes('price');
                
                if (hasCost || hasPrice) {
                  // Проверяем, что это не просто данные (если в первой ячейке число - это данные, не заголовки)
                  const firstCell = String(row[0] || '').trim();
                  const isNumber = !isNaN(parseFloat(firstCell.replace(',', '.')));
                  
                  if (!isNumber) {
                    headerRowIndex = i;
                    console.log(`Найдена строка с ценовыми колонками (возможно заголовки): ${i + 1}`);
                    console.log(`Содержимое строки:`, row.slice(0, 10).map(cell => String(cell || '').substring(0, 20)));
                    break;
                  }
                }
              }
            }
          }

          if (headerRowIndex === -1) {
            console.error('Не найдена строка с заголовками! Первые 10 строк:');
            for (let i = 0; i < Math.min(10, jsonData.length); i++) {
              const row = jsonData[i] as any[];
              const rowText = row ? row.map(cell => String(cell || '')).join(' | ') : 'пустая строка';
              console.log(`Строка ${i + 1}:`, rowText.substring(0, 200));
              // Также выводим первые 5 ячеек отдельно
              if (row && row.length > 0) {
                console.log(`  Первые 5 ячеек:`, row.slice(0, 5).map(cell => String(cell || '').substring(0, 30)));
              }
            }
            reject(new Error('Не найдена строка с заголовками (АРТИКУЛ, себестоимость, рекомендованная цена). Проверьте консоль для просмотра первых строк файла.'));
            return;
          }

          // Находим все блоки с заголовками (могут быть в разных колонках)
          const headerRow = jsonData[headerRowIndex] as any[];
          const blocks: Array<{ startCol: number; endCol: number; headers: string[] }> = [];
          
          // Проверяем предыдущие строки на наличие "АРТИКУЛ" в первой колонке
          // (иногда "АРТИКУЛ" находится в строке выше, а текущая строка содержит только "БАРКОД", "себестоимость" и т.д.)
          let articleColInPrevRow = -1;
          for (let prevRowIdx = Math.max(0, headerRowIndex - 2); prevRowIdx < headerRowIndex; prevRowIdx++) {
            const prevRow = jsonData[prevRowIdx] as any[];
            if (prevRow && prevRow.length > 0) {
              for (let col = 0; col < Math.min(5, prevRow.length); col++) {
                const cell = String(prevRow[col] || '').toLowerCase().trim();
                if (cell === 'артикул' || cell.includes('артикул') || cell === 'sku' || cell.includes('article')) {
                  articleColInPrevRow = col;
                  console.log(`Найден "АРТИКУЛ" в строке ${prevRowIdx + 1}, колонка ${col}`);
                  break;
                }
              }
              if (articleColInPrevRow >= 0) break;
            }
          }
          
          // Упрощенная логика: ищем все колонки с "артикул" или "баркод" и создаем блоки
          const articleCols: number[] = [];
          const barcodeCols: number[] = [];
          
          // Если нашли "АРТИКУЛ" в предыдущей строке, добавляем эту колонку
          if (articleColInPrevRow >= 0) {
            articleCols.push(articleColInPrevRow);
          }
          
          for (let col = 0; col < headerRow.length; col++) {
            const header = String(headerRow[col] || '').toLowerCase().trim();
            if (header === 'артикул' || header.includes('артикул') || header === 'sku' || header.includes('article')) {
              if (!articleCols.includes(col)) {
                articleCols.push(col);
              }
            } else if (header === 'баркод' || header.includes('баркод') || header.includes('barcode')) {
              barcodeCols.push(col);
            }
          }
          
          // Если есть колонки с "артикул", создаем блоки от каждой
          if (articleCols.length > 0) {
            for (let i = 0; i < articleCols.length; i++) {
              const startCol = articleCols[i];
              // Ищем конец блока - следующая колонка с "артикул" или "баркод", или конец строки
              let endCol = headerRow.length - 1;
              if (i < articleCols.length - 1) {
                endCol = articleCols[i + 1] - 1;
              } else if (barcodeCols.length > 0) {
                // Если есть "баркод" после "артикул", ищем последнюю колонку блока с "баркод"
                const nextBarcodeCol = barcodeCols.find(bc => bc > startCol);
                if (nextBarcodeCol !== undefined) {
                  // Ищем конец блока с "баркод"
                  for (let col = nextBarcodeCol; col < headerRow.length; col++) {
                    const header = String(headerRow[col] || '').toLowerCase().trim();
                    if (header && (header.includes('цена') || header.includes('себест'))) {
                      endCol = col;
                    } else if (col > nextBarcodeCol + 3) {
                      // Если прошли более 3 колонок после "баркод" и не нашли цену, останавливаемся
                      break;
                    }
                  }
                }
              }
              // Ищем последнюю непустую колонку в блоке
              for (let col = endCol; col >= startCol; col--) {
                const header = String(headerRow[col] || '').toLowerCase().trim();
                if (header && (header.includes('цена') || header.includes('себест') || header.includes('баркод') || header.includes('описание'))) {
                  endCol = col;
                  break;
                }
              }
              // Формируем заголовки блока: если "АРТИКУЛ" из предыдущей строки, добавляем его в заголовки
              const blockHeaders: string[] = [];
              if (startCol === articleColInPrevRow && articleColInPrevRow >= 0) {
                blockHeaders.push('артикул'); // Добавляем "артикул" в заголовки, если он из предыдущей строки
              }
              // Добавляем заголовки из текущей строки
              const headersFromCurrentRow = headerRow.slice(Math.max(startCol, articleColInPrevRow >= 0 ? articleColInPrevRow + 1 : startCol), endCol + 1)
                .map((h: any) => String(h || '').toLowerCase().trim());
              blockHeaders.push(...headersFromCurrentRow);
              
              blocks.push({
                startCol,
                endCol,
                headers: blockHeaders
              });
            }
          } 
          // Если нет "артикул", но есть "баркод", создаем блоки от каждого "баркод"
          else if (barcodeCols.length > 0) {
            for (let i = 0; i < barcodeCols.length; i++) {
              const startCol = barcodeCols[i];
              let endCol = headerRow.length - 1;
              if (i < barcodeCols.length - 1) {
                endCol = barcodeCols[i + 1] - 1;
              }
              // Ищем последнюю непустую колонку в блоке
              for (let col = endCol; col >= startCol; col--) {
                const header = String(headerRow[col] || '').toLowerCase().trim();
                if (header && (header.includes('цена') || header.includes('себест'))) {
                  endCol = col;
                  break;
                }
              }
              const blockHeaders = headerRow.slice(startCol, endCol + 1).map((h: any) => String(h || '').toLowerCase().trim());
              blocks.push({
                startCol,
                endCol,
                headers: blockHeaders
              });
            }
          }
          // Если ничего не нашли, используем весь ряд (простой случай - один блок)
          else {
            // Находим первую и последнюю непустую колонку
            let firstCol = -1;
            let lastCol = -1;
            for (let col = 0; col < headerRow.length; col++) {
              const header = String(headerRow[col] || '').toLowerCase().trim();
              if (header && (header.includes('артикул') || header.includes('баркод') || header.includes('себест') || header.includes('цена'))) {
                if (firstCol === -1) firstCol = col;
                lastCol = col;
              }
            }
            if (firstCol >= 0 && lastCol >= 0) {
              const blockHeaders = headerRow.slice(firstCol, lastCol + 1).map((h: any) => String(h || '').toLowerCase().trim());
              blocks.push({
                startCol: firstCol,
                endCol: lastCol,
                headers: blockHeaders
              });
            } else {
              // Последний вариант - весь ряд
              blocks.push({
                startCol: 0,
                endCol: headerRow.length - 1,
                headers: headerRow.map((h: any) => String(h || '').toLowerCase().trim())
              });
            }
          }

          console.log(`Найдено блоков с данными: ${blocks.length}`);
          blocks.forEach((block, idx) => {
            console.log(`Блок ${idx + 1}: колонки ${block.startCol}-${block.endCol}, заголовки:`, block.headers.slice(0, 5));
          });

          const priceData: PriceImportData[] = [];

          // Обрабатываем каждый блок отдельно
          for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
            const block = blocks[blockIdx];
            console.log(`Обработка блока ${blockIdx + 1} (колонки ${block.startCol}-${block.endCol})...`);

            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
              const row = jsonData[i] as any[];
              if (!row || row.length === 0) continue;

              // Проверяем, есть ли данные в текущем блоке
              const hasDataInBlock = row.slice(block.startCol, block.endCol + 1).some(
                cell => cell !== null && cell !== undefined && String(cell).trim() !== ''
              );
              if (!hasDataInBlock) continue;

              // Пропускаем строки-заголовки таблиц и подзаголовки (проверяем первую колонку блока)
              const firstCellInBlock = String(row[block.startCol] || '').trim().toUpperCase();
              const firstCellLower = String(row[block.startCol] || '').trim().toLowerCase();
              
              // Пропускаем строку с "АРТИКУЛ", "ОПИСАНИЕ", "WB/OZON" - это подзаголовок
              if (firstCellInBlock === 'АРТИКУЛ' || 
                  firstCellInBlock === 'ОПИСАНИЕ' ||
                  firstCellInBlock.includes('WB/OZON')) {
                continue; // Пропускаем подзаголовок
              }
              
              // Пропускаем только если это явно заголовок таблицы (не артикул товара)
              // НЕ пропускаем если это похоже на артикул (начинается с букв и содержит цифры)
              const looksLikeArticle = /^[А-ЯA-Z]{2,}\d+/.test(firstCellInBlock);
              
              if (firstCellInBlock && firstCellInBlock.length > 3 && !looksLikeArticle && (
                  (firstCellInBlock.includes('КОЛПАК') && !firstCellInBlock.includes('АРТИКУЛ')) ||
                  (firstCellInBlock.includes('СОЛОХ') && !firstCellInBlock.includes('АРТИКУЛ')) ||
                  (firstCellInBlock.includes('КДУ') && firstCellInBlock.length > 10) ||
                  (firstCellInBlock.includes('ПЛАТОК') && firstCellInBlock.includes('ГОЛОВНОЙ')) ||
                  (firstCellInBlock.includes('КОСЫНКА') && firstCellInBlock.includes('ДВУСТОРОННЯЯ'))
              )) {
                continue; // Пропускаем заголовок таблицы
              }

              const item: any = {};

              // Проверяем, есть ли заголовок "артикул" в блоке
              const hasArticleHeader = block.headers.some(h => 
                h === 'артикул' || 
                h.includes('артикул') || 
                h === 'sku' || 
                h.includes('article')
              );
              
              // Если в блоке есть "артикул" (в том числе из предыдущей строки), берем значение из первой колонки блока
              if (hasArticleHeader) {
                const firstCellValue = String(row[block.startCol] || '').trim();
                if (firstCellValue && 
                    firstCellValue.length > 0 && 
                    firstCellValue.length < 50 &&
                    firstCellValue.toLowerCase() !== 'артикул' &&
                    firstCellValue.toLowerCase() !== 'описание' &&
                    !firstCellValue.toLowerCase().includes('wb/ozon') &&
                    !firstCellValue.toLowerCase().includes('это номер') &&
                    !firstCellValue.toLowerCase().includes('уникальный идентификатор')) {
                  item.sku = firstCellValue;
                }
              }
              // Если в блоке нет "артикул", проверяем колонку 0 (первая колонка) - там обычно находится АРТИКУЛ
              if (!item.sku && row.length > 0) {
                const col0Value = String(row[0] || '').trim();
                // Проверяем, похоже ли значение на артикул (не цвет, не описание, не пустое)
                if (col0Value && 
                    col0Value.length >= 3 && 
                    col0Value.length < 50 &&
                    !col0Value.toLowerCase().includes('микс') &&
                    !col0Value.toLowerCase().includes('цвет') &&
                    !col0Value.toLowerCase().includes('черн') &&
                    !col0Value.toLowerCase().includes('розов') &&
                    !col0Value.toLowerCase().includes('желт') &&
                    !col0Value.toLowerCase().includes('коричнев') &&
                    !col0Value.toLowerCase().includes('сер') &&
                    !col0Value.toLowerCase().includes('бел') &&
                    !col0Value.toLowerCase().includes('син') &&
                    !col0Value.toLowerCase().includes('красн') &&
                    !col0Value.toLowerCase().includes('зелен') &&
                    !(col0Value.includes('/') && col0Value.length < 20 && !/^[А-ЯA-Z0-9]+\/[А-ЯA-Z0-9]+/.test(col0Value)) && // Цвета через слэш, но не артикулы вида "ABC/123"
                    col0Value.toLowerCase() !== 'артикул' &&
                    col0Value.toLowerCase() !== 'описание' &&
                    !col0Value.toLowerCase().includes('wb/ozon') &&
                    !col0Value.toLowerCase().includes('это номер') &&
                    !col0Value.toLowerCase().includes('уникальный идентификатор') &&
                    /[А-ЯA-Z0-9]/.test(col0Value)) { // Должен содержать буквы или цифры
                  item.sku = col0Value;
                }
              }
              
              // Если все еще нет артикула и блок начинается с "баркод", 
              // проверяем колонку перед блоком - там может быть артикул (но только если это не описание)
              if (!item.sku && block.startCol > 1) {
                const firstHeader = block.headers[0] || '';
                const startsWithBarcode = firstHeader === 'баркод' || firstHeader.includes('баркод') || firstHeader.includes('barcode');
                
                if (startsWithBarcode) {
                  const colBeforeBlock = block.startCol - 1;
                  const valueBeforeBlock = String(row[colBeforeBlock] || '').trim();
                  
                  // Проверяем, похоже ли значение на артикул (не цвет, не описание)
                  if (valueBeforeBlock && 
                      valueBeforeBlock.length >= 3 && 
                      valueBeforeBlock.length < 50 &&
                      !valueBeforeBlock.toLowerCase().includes('микс') &&
                      !valueBeforeBlock.toLowerCase().includes('цвет') &&
                      !valueBeforeBlock.toLowerCase().includes('черн') &&
                      !valueBeforeBlock.toLowerCase().includes('розов') &&
                      !valueBeforeBlock.toLowerCase().includes('желт') &&
                      !valueBeforeBlock.toLowerCase().includes('коричнев') &&
                      !valueBeforeBlock.toLowerCase().includes('сер') &&
                      !valueBeforeBlock.toLowerCase().includes('бел') &&
                      !valueBeforeBlock.toLowerCase().includes('син') &&
                      !valueBeforeBlock.toLowerCase().includes('красн') &&
                      !valueBeforeBlock.toLowerCase().includes('зелен') &&
                      !(valueBeforeBlock.includes('/') && valueBeforeBlock.length < 20 && !/^[А-ЯA-Z0-9]+\/[А-ЯA-Z0-9]+/.test(valueBeforeBlock)) &&
                      valueBeforeBlock.toLowerCase() !== 'артикул' &&
                      valueBeforeBlock.toLowerCase() !== 'описание' &&
                      !valueBeforeBlock.toLowerCase().includes('wb/ozon') &&
                      !valueBeforeBlock.toLowerCase().includes('это номер') &&
                      !valueBeforeBlock.toLowerCase().includes('уникальный идентификатор') &&
                      /[А-ЯA-Z0-9]/.test(valueBeforeBlock)) {
                    item.sku = valueBeforeBlock;
                  }
                }
              }

              // Обрабатываем заголовки блока
              block.headers.forEach((header, headerIndex) => {
                const colIndex = block.startCol + headerIndex;
                const value = row[colIndex];
                if (value === null || value === undefined || value === '') return;

                const stringValue = String(value).trim();
              
                // Артикул (SKU) - точное совпадение в приоритете
                if (header === 'артикул' || 
                    (header.includes('артикул') && !header.includes('wb') && !header.includes('ozon')) ||
                    header === 'sku' || header.includes('sku') || 
                    header === 'article' || header.includes('article')) {
                  // Пропускаем если это подсказка, а не реальный артикул
                  if (!stringValue.toLowerCase().includes('это номер') && 
                      !stringValue.toLowerCase().includes('уникальный идентификатор') &&
                      !stringValue.toLowerCase().includes('будет сохранен')) {
                    item.sku = stringValue;
                  }
                }
                // Себестоимость
                else if (header === 'себестоимость' || header.includes('себестоимость') ||
                         header.includes('cost') || header.includes('себест')) {
                  // Пропускаем если это не число (например, "P" или пусто)
                  if (stringValue !== 'p' && stringValue !== 'р' && stringValue !== '₽' && stringValue !== '-') {
                    const price = this.parseNumber(stringValue);
                    if (price !== null && price > 0) {
                      item.costPrice = price;
                    }
                  }
                }
                // Рекомендованная цена
                else if (header === 'рекомендованная цена' || 
                         (header.includes('рекомендованная') && header.includes('цена')) ||
                         header.includes('recommended')) {
                  // Пропускаем если это не число
                  if (stringValue !== 'p' && stringValue !== 'р' && stringValue !== '₽' && stringValue !== '-') {
                    const price = this.parseNumber(stringValue);
                    if (price !== null && price > 0) {
                      item.recommendedPrice = price;
                    }
                  }
                }
                // Минимальная цена
                else if (header.includes('мин') && header.includes('цена') ||
                         header.includes('min') && header.includes('price')) {
                  const price = this.parseNumber(stringValue);
                  if (price !== null) {
                    item.minPrice = price;
                  }
                }
                // Максимальная цена
                else if (header.includes('макс') && header.includes('цена') ||
                         header.includes('max') && header.includes('price')) {
                  const price = this.parseNumber(stringValue);
                  if (price !== null) {
                    item.maxPrice = price;
                  }
                }
                // Баркод
                else if (header.includes('баркод') || header.includes('barcode') ||
                         header.includes('штрихкод')) {
                  item.barcode = stringValue;
                }
                // Описание
                else if (header.includes('описание') || header.includes('description')) {
                  item.description = stringValue;
                }
              });

              // Валидация: должен быть артикул
              if (item.sku && item.sku.length > 0 && item.sku.length < 50) {
                // Пропускаем если артикул выглядит как подсказка или заголовок
                const skuLower = item.sku.toLowerCase();
                if (!skuLower.includes('это номер') && 
                    !skuLower.includes('уникальный идентификатор') &&
                    !skuLower.includes('будет сохранен') &&
                    skuLower !== 'артикул' &&
                    skuLower !== 'описание' &&
                    !skuLower.includes('wb/ozon')) {
                  // Добавляем даже если нет цен - они могут быть добавлены позже
                  priceData.push(item as PriceImportData);
                } else {
                  console.log(`Строка ${i + 1}: пропущен артикул "${item.sku}" (похож на подсказку/заголовок)`);
                }
              } else {
                // Логируем, почему артикул не найден
                if (block.startCol > 0) {
                  const colBeforeBlock = block.startCol - 1;
                  const valueBeforeBlock = String(row[colBeforeBlock] || '').trim();
                  console.log(`Строка ${i + 1}: нет артикула. Колонка перед блоком (${colBeforeBlock}): "${valueBeforeBlock}", первая колонка блока: "${String(row[block.startCol] || '').trim()}"`);
                } else {
                  console.log(`Строка ${i + 1}: нет артикула. Первая колонка блока: "${String(row[block.startCol] || '').trim()}"`);
                }
              }
            }
          }

          console.log(`Распарсено записей с ценами: ${priceData.length}`);
          if (priceData.length > 0) {
            const withCostPrice = priceData.filter(p => p.costPrice).length;
            const withRecommendedPrice = priceData.filter(p => p.recommendedPrice).length;
            const withBothPrices = priceData.filter(p => p.costPrice && p.recommendedPrice).length;
            console.log(`Статистика: с себестоимостью: ${withCostPrice}, с рекомендованной ценой: ${withRecommendedPrice}, с обеими: ${withBothPrices}`);
            if (priceData.length > 0 && withCostPrice === 0 && withRecommendedPrice === 0) {
              console.warn('⚠️ ВНИМАНИЕ: Найдены артикулы, но нет цен! Проверьте названия колонок в Excel.');
              console.warn('Ожидаемые названия колонок: "себестоимость" или "рекомендованная цена"');
            }
          } else {
            console.warn('⚠️ Не найдено ни одной записи с ценами!');
            console.warn('Проверьте:');
            console.warn('1. Есть ли в файле строка с заголовками (АРТИКУЛ, себестоимость, рекомендованная цена)');
            console.warn('2. Правильно ли названы колонки');
            console.warn('3. Есть ли данные в строках после заголовков');
          }
          resolve(priceData);
        } catch (error) {
          console.error('Ошибка парсинга Excel файла с ценами:', error);
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
   * Парсит число из строки
   */
  private static parseNumber(value: string): number | null {
    if (!value) return null;
    
    // Убираем пробелы, заменяем запятую на точку, убираем "P", "₽" и другие символы
    let cleaned = value.replace(/\s/g, '')
                      .replace(',', '.')
                      .replace(/[pр₽]/gi, '')
                      .replace(/-/g, '')
                      .trim();
    
    // Если после очистки ничего не осталось, возвращаем null
    if (!cleaned || cleaned === '') return null;
    
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) || parsed <= 0 ? null : parsed;
  }

  /**
   * Объединяет данные о ценах с существующими товарами по артикулу
   */
  static async mergePricesWithProducts(
    priceData: PriceImportData[],
    options: {
      updateCostPrice?: boolean;
      updateRecommendedPrice?: boolean;
      updateBarcode?: boolean;
      updateDescription?: boolean;
    } = {}
  ): Promise<PriceImportResult> {
    const result: PriceImportResult = {
      matched: 0,
      updated: 0,
      notFound: [],
      errors: [],
    };

    // Получаем все товары
    const { data: allProducts } = await productsService.getAll({ limit: 10000 });

    // Создаем индекс товаров по SKU (без учета регистра и пробелов)
    const productsBySku = new Map<string, any>();
    allProducts.forEach((product: any) => {
      if (product.sku) {
        const normalizedSku = product.sku.toLowerCase().trim();
        productsBySku.set(normalizedSku, product);
      }
    });

    console.log(`Найдено товаров в базе: ${allProducts.length}, с SKU: ${productsBySku.size}`);

    for (const priceItem of priceData) {
      try {
        if (!priceItem.sku) {
          result.errors.push(`Запись без артикула пропущена`);
          continue;
        }

        const normalizedSku = priceItem.sku.toLowerCase().trim();
        const product = productsBySku.get(normalizedSku);

        if (!product) {
          result.notFound.push(priceItem.sku);
          continue;
        }

        result.matched++;

        // Формируем данные для обновления
        const updateData: any = {};

        // Сохраняем цены в import_metadata для использования в системе управления ценами
        if (!updateData.import_metadata) {
          updateData.import_metadata = product.importMetadata || {};
        }

        // Обновляем себестоимость (для расчета маржи и автоцен)
        if (options.updateCostPrice && priceItem.costPrice !== undefined && priceItem.costPrice > 0) {
          updateData.import_metadata.costPrice = priceItem.costPrice;
        }

        // Обновляем рекомендованную цену (для автоцен на маркетплейсах)
        if (options.updateRecommendedPrice && priceItem.recommendedPrice !== undefined && priceItem.recommendedPrice > 0) {
          updateData.import_metadata.recommendedPrice = priceItem.recommendedPrice;
          // Также сохраняем как minPrice и maxPrice для системы управления ценами
          updateData.import_metadata.minPrice = priceItem.minPrice || priceItem.recommendedPrice;
          updateData.import_metadata.maxPrice = priceItem.maxPrice || priceItem.recommendedPrice;
          
          // НЕ обновляем retail_price - это цена на сайте, она может отличаться от рекомендованной
        }

        // Обновляем баркод
        if (options.updateBarcode && priceItem.barcode) {
          // Баркод обычно не хранится в products, но можно сохранить в metadata
          updateData.import_metadata = updateData.import_metadata || product.importMetadata || {};
          updateData.import_metadata.barcode = priceItem.barcode;
        }

        // Обновляем описание (если оно пустое или короче нового)
        if (options.updateDescription && priceItem.description) {
          if (!product.description || product.description.length < priceItem.description.length) {
            updateData.description = priceItem.description;
          }
        }

        // Обновляем товар, если есть что обновлять
        if (Object.keys(updateData).length > 0) {
          await productsService.update(parseInt(product.id), updateData);
          result.updated++;
        }
      } catch (error: any) {
        const errorMsg = `Ошибка обновления товара ${priceItem.sku}: ${error.message || 'Неизвестная ошибка'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return result;
  }
}

