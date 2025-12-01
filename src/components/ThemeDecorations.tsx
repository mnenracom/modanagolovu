import { NewYearDecorations } from './NewYearDecorations';
import { SpringDecorations } from './SpringDecorations';

/**
 * Компонент-обертка для всех декораций тем
 * Должен быть внутри BrowserRouter для использования useLocation()
 */
export const ThemeDecorations = () => {
  return (
    <>
      <NewYearDecorations />
      <SpringDecorations />
    </>
  );
};

