// Утилита для получения названий категорий
export const getCategoryName = (category: string): string => {
  if (!category) return 'Не указано';
  
  const categoryNames: Record<string, string> = {
    scarves: 'Платки на голову',
    platki: 'Платки на голову',
    kosinka: 'Косынки',
    kosynki: 'Косынки',
    bandanas: 'Банданы',
    capor: 'Капор',
    kapory: 'Капоры',
    kolpaki: 'Колпаки',
    // Добавляем варианты с подчеркиваниями и дефисами
    'kosynki_na_rezinke': 'Косынки на резинке',
    'kosynki-na-rezinke': 'Косынки на резинке',
  };
  
  // Убираем дефис в начале, если есть
  const normalizedCategory = category.startsWith('-') ? category.slice(1) : category;
  
  // Проверяем точное совпадение
  if (categoryNames[category]) {
    return categoryNames[category];
  }
  
  // Проверяем нормализованное значение
  if (categoryNames[normalizedCategory]) {
    return categoryNames[normalizedCategory];
  }
  
  // Если не найдено, пытаемся преобразовать slug в читаемое название
  // Убираем дефисы и подчеркивания, делаем первую букву заглавной
  const readableName = normalizedCategory
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  return readableName;
};









