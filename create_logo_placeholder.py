#!/usr/bin/env python3
"""
Скрипт для создания placeholder логотипа
Создает простой PNG файл с текстом "МОДАНАГОЛОВУ"
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Размеры логотипа (пропорции 4:1)
WIDTH = 250
HEIGHT = 62

# Создаем изображение с прозрачным фоном
img = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 0))
draw = ImageDraw.Draw(img)

# Рисуем красный фон
draw.rectangle([(0, 0), (WIDTH, HEIGHT)], fill=(239, 68, 68, 255))

# Пытаемся использовать системный шрифт, если не найден - используем дефолтный
try:
    # Для Windows
    font = ImageFont.truetype("arial.ttf", 28)
except:
    try:
        # Для Linux/Mac
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except:
        # Дефолтный шрифт
        font = ImageFont.load_default()

# Рисуем текст
text = "МОДАНАГОЛОВУ"
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
text_x = (WIDTH - text_width) // 2
text_y = (HEIGHT - text_height) // 2

draw.text((text_x, text_y), text, fill=(255, 255, 255, 255), font=font)

# Сохраняем в public/logo.png
output_path = os.path.join('public', 'logo.png')
os.makedirs('public', exist_ok=True)
img.save(output_path, 'PNG')

print(f"✅ Placeholder логотип создан: {output_path}")
print(f"   Размер: {WIDTH}×{HEIGHT}px")
print(f"   Замените этот файл на ваш логотип с такими же пропорциями!")

