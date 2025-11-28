import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Maximize2, ZoomIn, ZoomOut, RotateCw, Check, X } from 'lucide-react';

interface ImageCropperProps {
  image: string | File | null;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: File) => void;
  aspectRatio?: number; // Соотношение сторон (ширина/высота), например 1 для квадрата, 4/3 для 4:3
  circularCrop?: boolean; // Круглая обрезка
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Crop {
  x: number;
  y: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const getRadianAngle = (degreeValue: number) => {
  return (degreeValue * Math.PI) / 180;
};

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No 2d context');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
};

export const ImageCropper = ({
  image,
  open,
  onClose,
  onCropComplete,
  aspectRatio = 1,
  circularCrop = false,
}: ImageCropperProps) => {
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Загружаем изображение при открытии
  useEffect(() => {
    if (image && open) {
      if (image instanceof File) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setImageSrc(reader.result as string);
        });
        reader.readAsDataURL(image);
      } else if (typeof image === 'string') {
        setImageSrc(image);
      }
    } else if (!open) {
      setImageSrc('');
    }
  }, [image, open]);

  // Сбрасываем состояние при закрытии
  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  const onCropChange = useCallback((crop: Crop) => {
    setCrop(crop);
  }, []);

  const onCropCompleteCallback = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return;

    try {
      setLoading(true);
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );

      // Конвертируем Blob в File
      const fileName = image instanceof File ? image.name : 'cropped-image.jpg';
      const croppedImageFile = new File([croppedImageBlob], fileName, {
        type: 'image/jpeg',
      });

      onCropComplete(croppedImageFile);
      handleClose();
    } catch (error) {
      console.error('Ошибка при кадрировании:', error);
      alert('Ошибка при кадрировании изображения');
    } finally {
      setLoading(false);
    }
  };

  // Предустановленные соотношения сторон
  const aspectRatios = [
    { label: 'Квадрат', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
    { label: 'Свободное', value: undefined },
  ];

  const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | undefined>(aspectRatio ?? 1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Кадрирование изображения</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Выбор соотношения сторон */}
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map((ratio) => (
              <Button
                key={ratio.label}
                type="button"
                variant={selectedAspectRatio === ratio.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedAspectRatio(ratio.value)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                {ratio.label}
              </Button>
            ))}
          </div>

          {/* Область кадрирования */}
          <div className="relative w-full h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={selectedAspectRatio ?? undefined}
                onCropChange={onCropChange}
                onCropComplete={onCropCompleteCallback}
                cropShape={circularCrop ? 'round' : 'rect'}
                showGrid={!circularCrop}
              />
            )}
          </div>

          {/* Элементы управления */}
          <div className="space-y-4">
            {/* Масштаб */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoomOut className="h-4 w-4" />
                  <span className="text-sm">Масштаб</span>
                  <ZoomIn className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
              />
            </div>

            {/* Поворот */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCw className="h-4 w-4" />
                  <span className="text-sm">Поворот</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {rotation}°
                </span>
              </div>
              <Slider
                value={[rotation]}
                min={0}
                max={360}
                step={1}
                onValueChange={(value) => setRotation(value[0])}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleCrop}
            disabled={loading || !croppedAreaPixels}
          >
            <Check className="h-4 w-4 mr-2" />
            {loading ? 'Обработка...' : 'Применить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

