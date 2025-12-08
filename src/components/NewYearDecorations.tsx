import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { SparklesLayer } from './SparklesLayer';

interface Snowflake {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  type: 'snowflake' | 'star';
}

interface ChristmasBall {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  delay: number;
}

export const NewYearDecorations = () => {
  const location = useLocation();
  const { activeTheme } = useTheme();
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  // Проверяем, не находимся ли мы в админке
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Показываем только если активна новогодняя тема
  const shouldShow = activeTheme === 'newyear';

  // Определяем размер экрана
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Мемоизируем генерацию снежинок для избежания лишних ререндеров
  const snowflakesData = useMemo(() => {
    if (!shouldShow || isAdminRoute) return [];
    
    const flakes: Snowflake[] = [];
    const count = isMobile ? 20 : 50;
    for (let i = 0; i < count; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        top: -10 - Math.random() * 20,
        size: isMobile ? Math.random() * 2.5 + 1 : Math.random() * 4 + 1.5,
        duration: Math.random() * 3 + 8,
        delay: Math.random() * 10,
        type: Math.random() > 0.8 ? 'star' : 'snowflake',
      });
    }
    return flakes;
  }, [shouldShow, isAdminRoute, isMobile]);

  useEffect(() => {
    if (!shouldShow || isAdminRoute) return;
    setSnowflakes(snowflakesData);
  }, [shouldShow, isAdminRoute, snowflakesData]);

  if (!shouldShow || isAdminRoute) return null;

  return (
    <>
      {/* Оптимизированные снежинки и звёзды */}
      <div className="fixed inset-0 pointer-events-none z-[68] overflow-hidden">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className={`absolute new-year-snowflake ${flake.type === 'star' ? 'text-yellow-300' : 'text-white/80'}`}
            style={{
              left: `${flake.left}%`,
              top: `${flake.top}%`,
              fontSize: `${flake.size}px`,
              animation: `snowfall ${flake.duration}s linear infinite`,
              animationDelay: `${flake.delay}s`,
              filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))',
              transform: 'translateZ(0)', // GPU acceleration
            }}
          >
            {flake.type === 'star' ? '⭐' : '❄'}
          </div>
        ))}
      </div>

      {/* Оптимизированные блестящие звёздочки (меньше на мобильных) */}
      <div className="fixed inset-0 pointer-events-none z-[66] overflow-hidden hidden sm:block">
        {[...Array(isMobile ? 5 : 8)].map((_, i) => (
          <div
            key={i}
            className="absolute new-year-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              transform: 'translateZ(0)', // GPU acceleration
            }}
          >
            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          </div>
        ))}
      </div>

      {/* Оптимизированные блестящие частицы */}
      <div className="fixed inset-0 pointer-events-none z-[66] overflow-hidden">
        {[...Array(isMobile ? 5 : 15)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute new-year-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${1.5 + Math.random() * 1.5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              transform: 'translateZ(0)', // GPU acceleration
            }}
          >
            <Sparkles className="w-2 h-2 text-yellow-300" />
          </div>
        ))}
      </div>
    </>
  );
};

