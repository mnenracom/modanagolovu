import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface ImageGuidelines {
  // Размеры в пикселях
  width: number;
  height: number;
  aspectRatio?: number;
  
  // Размеры в миллиметрах (для печати/дизайна)
  widthMm?: number;
  heightMm?: number;
  
  // Зоны безопасности (в пикселях от краев)
  safeZone?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Зоны безопасности в миллиметрах
  safeZoneMm?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  
  // Дополнительная информация
  description?: string;
  maxFileSizeMB?: number;
  recommendedFormat?: string;
  dpi?: number; // Для печати
}

interface ImageUploadGuidelinesProps {
  guidelines: ImageGuidelines;
  title?: string;
  variant?: 'default' | 'compact';
}

export const ImageUploadGuidelines = ({
  guidelines,
  title = 'Рекомендации по загрузке изображения',
  variant = 'default',
}: ImageUploadGuidelinesProps) => {
  const {
    width,
    height,
    aspectRatio,
    widthMm,
    heightMm,
    safeZone,
    safeZoneMm,
    description,
    maxFileSizeMB = 5,
    recommendedFormat = 'JPG, PNG, WebP',
    dpi = 72,
  } = guidelines;

  // Конвертация пикселей в миллиметры (при 72 DPI: 1 дюйм = 25.4 мм, 1 дюйм = 72 px)
  const pxToMm = (px: number, dpiValue: number = dpi) => {
    return ((px / dpiValue) * 25.4).toFixed(1);
  };

  const calculatedWidthMm = widthMm || parseFloat(pxToMm(width, dpi));
  const calculatedHeightMm = heightMm || parseFloat(pxToMm(height, dpi));

  if (variant === 'compact') {
    return (
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              📐 Рекомендуемый размер:
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              <strong>{width} × {height} px</strong>
              {aspectRatio && ` (${aspectRatio.toFixed(2)}:1)`}
              {widthMm && ` • ${calculatedWidthMm} × ${calculatedHeightMm} мм`}
            </p>
            {maxFileSizeMB && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Макс. размер файла: {maxFileSizeMB} MB • Формат: {recommendedFormat}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <AlertDescription className="text-blue-900 dark:text-blue-100">
        <div className="space-y-3">
          <div>
            <p className="font-semibold mb-2">{title}</p>
            {description && <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">{description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Размеры в пикселях */}
            <div className="bg-white dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                📐 Размеры в пикселях:
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>{width} × {height} px</strong>
              </p>
              {aspectRatio && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Соотношение сторон: {aspectRatio.toFixed(2)}:1
                </p>
              )}
            </div>

            {/* Размеры в миллиметрах */}
            <div className="bg-white dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                📏 Размеры в миллиметрах:
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>{calculatedWidthMm} × {calculatedHeightMm} мм</strong>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                При разрешении {dpi} DPI
              </p>
            </div>
          </div>

          {/* Зоны безопасности */}
          {(safeZone || safeZoneMm) && (
            <div className="bg-white dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                ⚠️ Зоны безопасности:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {safeZone && (
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 mb-1">В пикселях:</p>
                    <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                      <li>Сверху: {safeZone.top} px</li>
                      <li>Справа: {safeZone.right} px</li>
                      <li>Снизу: {safeZone.bottom} px</li>
                      <li>Слева: {safeZone.left} px</li>
                    </ul>
                  </div>
                )}
                {safeZoneMm && (
                  <div>
                    <p className="text-blue-600 dark:text-blue-400 mb-1">В миллиметрах:</p>
                    <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                      <li>Сверху: {safeZoneMm.top} мм</li>
                      <li>Справа: {safeZoneMm.right} мм</li>
                      <li>Снизу: {safeZoneMm.bottom} мм</li>
                      <li>Слева: {safeZoneMm.left} мм</li>
                    </ul>
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                ⚠️ Важно: Размещайте важные элементы (текст, кнопки) в пределах зон безопасности, чтобы они не были обрезаны на разных устройствах.
              </p>
            </div>
          )}

          {/* Технические требования */}
          <div className="bg-white dark:bg-blue-900 p-3 rounded border border-blue-200 dark:border-blue-700">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ⚙️ Технические требования:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Максимальный размер файла: <strong>{maxFileSizeMB} MB</strong></li>
              <li>• Рекомендуемый формат: <strong>{recommendedFormat}</strong></li>
              {dpi && <li>• Разрешение: <strong>{dpi} DPI</strong> (для печати рекомендуется 300 DPI)</li>}
            </ul>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};




