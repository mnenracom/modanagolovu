import * as XLSX from 'xlsx';
import { ExcelPriceData } from '@/types/priceRule';

/**
 * Сервис для парсинга Excel файлов с ценовыми данными
 */
export class ExcelParserService {
  /**
   * Парсит Excel файл и возвращает массив ценовых данных
   * @param file Файл Excel
   * @returns Массив ценовых данных
   */
  static async parsePriceFile(file: File): Promise<ExcelPriceData[]> {
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
          });

          // Преобразуем в формат ExcelPriceData
          const priceData: ExcelPriceData[] = jsonData
            .map((row: any) => {
              // Поддерживаем различные варианты названий колонок
              const sku = this.getCellValue(row, ['sku', 'артикул', 'Артикул', 'SKU', 'article']);
              const barcode = this.getCellValue(row, ['barcode', 'штрихкод', 'Штрихкод', 'Barcode', 'ean']);
              const minPrice = this.parseNumber(row, ['min_price', 'мин_цена', 'Мин. цена', 'Min Price', 'минимальная цена']);
              const maxPrice = this.parseNumber(row, ['max_price', 'макс_цена', 'Макс. цена', 'Max Price', 'максимальная цена']);
              const costPrice = this.parseNumber(row, ['cost_price', 'себестоимость', 'Себестоимость', 'Cost Price', 'себест']);
              const targetMargin = this.parseNumber(row, ['target_margin', 'маржа', 'Маржа', 'Target Margin', 'целевая маржа']);
              const productName = this.getCellValue(row, ['product_name', 'название', 'Название', 'Product Name', 'товар']);
              const category = this.getCellValue(row, ['category', 'категория', 'Категория', 'Category']);
              const marketplaceType = this.getCellValue(row, ['marketplace', 'маркетплейс', 'Маркетплейс', 'Marketplace', 'mp'])?.toLowerCase();
              const accountName = this.getCellValue(row, ['account', 'аккаунт', 'Аккаунт', 'Account', 'account_name']);

              // Валидация обязательных полей
              if (!sku || minPrice === null || maxPrice === null || costPrice === null) {
                return null;
              }

              return {
                sku: String(sku).trim(),
                barcode: barcode ? String(barcode).trim() : undefined,
                minPrice,
                maxPrice,
                costPrice,
                targetMarginPercent: targetMargin !== null ? targetMargin : undefined,
                productName: productName ? String(productName).trim() : undefined,
                category: category ? String(category).trim() : undefined,
                marketplaceType: marketplaceType === 'wildberries' || marketplaceType === 'wb' ? 'wildberries' : 
                                 marketplaceType === 'ozon' ? 'ozon' : undefined,
                accountName: accountName ? String(accountName).trim() : undefined,
              } as ExcelPriceData;
            })
            .filter((item): item is ExcelPriceData => item !== null);

          resolve(priceData);
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
   * Получает значение ячейки по различным возможным названиям колонок
   */
  private static getCellValue(row: any, possibleNames: string[]): string | null {
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return String(row[name]);
      }
    }
    return null;
  }

  /**
   * Парсит число из ячейки
   */
  private static parseNumber(row: any, possibleNames: string[]): number | null {
    const value = this.getCellValue(row, possibleNames);
    if (!value) return null;
    
    // Убираем пробелы и заменяем запятую на точку
    const cleaned = value.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Создает шаблон Excel файла для загрузки ценовых данных
   */
  static createTemplate(): void {
    const templateData = [
      {
        'sku': 'ART001',
        'артикул': 'ART001',
        'barcode': '1234567890123',
        'штрихкод': '1234567890123',
        'min_price': 1000,
        'мин_цена': 1000,
        'max_price': 2000,
        'макс_цена': 2000,
        'cost_price': 500,
        'себестоимость': 500,
        'target_margin': 20,
        'маржа': 20,
        'product_name': 'Пример товара',
        'название': 'Пример товара',
        'category': 'Категория',
        'категория': 'Категория',
        'marketplace': 'wildberries',
        'маркетплейс': 'wildberries',
        'account': 'Основной',
        'аккаунт': 'Основной',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ценовые правила');

    // Скачиваем файл
    XLSX.writeFile(workbook, 'price_rules_template.xlsx');
  }
}

