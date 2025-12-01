import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Star } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Snowflake {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  type: 'snowflake' | 'star';
}

interface Confetti {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  rotation: number;
}

export const NewYearDecorations = () => {
  const location = useLocation();
  const { activeTheme } = useTheme();
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [confetti, setConfetti] = useState<Confetti[]>([]);
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

  useEffect(() => {
    if (!shouldShow || isAdminRoute) return;

    // Создаем снежинки и звёзды
    const createSnowflakes = () => {
      const flakes: Snowflake[] = [];
      // На мобильных меньше снежинок для производительности
      const count = isMobile ? 30 : 80;
      for (let i = 0; i < count; i++) {
        flakes.push({
          id: i,
          left: Math.random() * 100,
          top: -10 - Math.random() * 20,
          size: isMobile ? Math.random() * 3 + 1 : Math.random() * 5 + 1.5, // Меньше размер на мобильных
          duration: Math.random() * 4 + 6,
          delay: Math.random() * 8,
          type: Math.random() > 0.7 ? 'star' : 'snowflake',
        });
      }
      setSnowflakes(flakes);
    };

    // Создаем конфетти (уменьшенная активность)
    const createConfetti = () => {
      const confettiItems: Confetti[] = [];
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];
      // На мобильных меньше конфетти
      const count = isMobile ? 10 : 20;
      for (let i = 0; i < count; i++) {
        confettiItems.push({
          id: i,
          left: Math.random() * 100,
          top: -5 - Math.random() * 10,
          size: isMobile ? Math.random() * 4 + 2 : Math.random() * 6 + 3, // Меньше размер на мобильных
          duration: Math.random() * 4 + 5, // Увеличили длительность (медленнее)
          delay: Math.random() * 8, // Увеличили задержку
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
        });
      }
      setConfetti(confettiItems);
    };

    createSnowflakes();
    createConfetti();
  }, [shouldShow, isAdminRoute]);

  if (!shouldShow || isAdminRoute) return null;

  return (
    <>
      {/* Снежинки и звёзды */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
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
            }}
          >
            {flake.type === 'star' ? '⭐' : '❄'}
          </div>
        ))}
      </div>

      {/* Конфетти (уменьшенная активность) */}
      <div className="fixed inset-0 pointer-events-none z-45 overflow-hidden">
        {confetti.map((item) => (
          <div
            key={item.id}
            className="absolute new-year-confetti"
            style={{
              left: `${item.left}%`,
              top: `${item.top}%`,
              width: `${item.size}px`,
              height: `${item.size}px`,
              backgroundColor: item.color,
              animation: `confetti-fall ${item.duration}s linear infinite`,
              animationDelay: `${item.delay}s`,
              transform: `rotate(${item.rotation}deg)`,
              borderRadius: '50%',
              boxShadow: `0 0 ${item.size / 2}px ${item.color}`,
              opacity: 0.6, // Уменьшили непрозрачность
            }}
          />
        ))}
      </div>

      {/* Блестящие звёздочки (уменьшенное количество, меньше на мобильных) */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden hidden sm:block">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute new-year-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          </div>
        ))}
      </div>

      {/* Дополнительные блестящие частицы (меньше на мобильных) */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(isMobile ? 10 : 25)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute new-year-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `sparkle ${1.5 + Math.random() * 1.5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <Sparkles className="w-2 h-2 text-yellow-300" />
          </div>
        ))}
      </div>
    </>
  );
};

