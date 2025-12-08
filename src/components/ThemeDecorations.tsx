import { NewYearDecorations } from './NewYearDecorations';
import { SpringDecorations } from './SpringDecorations';
import { ChristmasTree } from './ChristmasTree';

/**
 * Компонент-обертка для всех декораций тем
 * Должен быть внутри BrowserRouter для использования useLocation()
 */
export const ThemeDecorations = () => {
  return (
    <>
      <NewYearDecorations />
      <SpringDecorations />
      <ChristmasTree />
    </>
  );
};


