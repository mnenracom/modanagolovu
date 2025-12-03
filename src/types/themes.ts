export type ThemeId = 'none' | 'newyear' | 'spring';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export const THEMES: Theme[] = [
  {
    id: 'none',
    name: 'Обычная тема',
    description: 'Стандартное оформление без праздничных эффектов',
    icon: '🎨',
    enabled: true,
  },
  {
    id: 'newyear',
    name: 'Новогодняя',
    description: 'Снежинки, гирлянды и праздничное настроение',
    icon: '🎄',
    enabled: true,
  },
  {
    id: 'spring',
    name: 'Весенняя',
    description: 'Цветы, бабочки и весеннее настроение',
    icon: '🌸',
    enabled: true,
  },
];

export const DEFAULT_THEME: ThemeId = 'none';


