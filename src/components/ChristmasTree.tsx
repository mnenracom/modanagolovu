import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';

interface ChristmasBall {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  delay: number;
  side: 'left' | 'right';
}

export const ChristmasTree = () => {
  const location = useLocation();
  const { activeTheme } = useTheme();
  const [balls, setBalls] = useState<ChristmasBall[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldShow = activeTheme === 'newyear' && !isAdminRoute;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!shouldShow) return;

    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ffa500', '#ff69b4', '#00ffff'];
    const newBalls: ChristmasBall[] = [];
    
    // Создаем шарики для левой ёлки
    for (let i = 0; i < (isMobile ? 8 : 12); i++) {
      newBalls.push({
        id: i,
        left: Math.random() * 15 + 5, // 5-20% от левого края
        top: Math.random() * 60 + 20, // 20-80% от верха
        size: isMobile ? Math.random() * 8 + 6 : Math.random() * 12 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        side: 'left',
      });
    }

    // Создаем шарики для правой ёлки
    for (let i = 0; i < (isMobile ? 8 : 12); i++) {
      newBalls.push({
        id: i + 100,
        left: Math.random() * 15 + 80, // 80-95% от левого края
        top: Math.random() * 60 + 20, // 20-80% от верха
        size: isMobile ? Math.random() * 8 + 6 : Math.random() * 12 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        side: 'right',
      });
    }

    setBalls(newBalls);
  }, [shouldShow, isMobile]);

  if (!shouldShow || isMobile) return null; // На мобильных не показываем ёлки

  return (
    <>
      {/* Левая ёлка */}
      <div className="fixed left-0 top-0 bottom-0 w-[120px] pointer-events-none z-[60] hidden lg:block">
        <div 
          className="absolute inset-0 bg-[url('/christmas-tree-left.png')] bg-contain bg-no-repeat bg-bottom opacity-80"
          style={{
            backgroundSize: 'contain',
            backgroundPosition: 'bottom left',
          }}
        >
          {/* Fallback если изображение не загружено - простая CSS ёлка */}
          <div className="absolute bottom-0 left-0 w-full h-[60vh] flex items-end justify-center">
            <div className="relative w-20 h-full">
              {/* Ствол */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-16 bg-amber-800 rounded-t-lg"></div>
              {/* Ветки */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[40px] border-b-green-700"></div>
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-b-[35px] border-b-green-600"></div>
              <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[30px] border-b-green-500"></div>
            </div>
          </div>
        </div>
        
        {/* Анимированные шарики на левой ёлке */}
        {balls.filter(b => b.side === 'left').map((ball) => (
          <div
            key={ball.id}
            className="absolute christmas-ball"
            style={{
              left: `${ball.left}%`,
              top: `${ball.top}%`,
              width: `${ball.size}px`,
              height: `${ball.size}px`,
              backgroundColor: ball.color,
              borderRadius: '50%',
              boxShadow: `0 0 ${ball.size / 2}px ${ball.color}, inset -2px -2px 4px rgba(0,0,0,0.3)`,
              animation: `ball-glow ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${ball.delay}s`,
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </div>

      {/* Правая ёлка */}
      <div className="fixed right-0 top-0 bottom-0 w-[120px] pointer-events-none z-[60] hidden lg:block">
        <div 
          className="absolute inset-0 bg-[url('/christmas-tree-right.png')] bg-contain bg-no-repeat bg-bottom opacity-80"
          style={{
            backgroundSize: 'contain',
            backgroundPosition: 'bottom right',
          }}
        >
          {/* Fallback если изображение не загружено - простая CSS ёлка */}
          <div className="absolute bottom-0 right-0 w-full h-[60vh] flex items-end justify-center">
            <div className="relative w-20 h-full">
              {/* Ствол */}
              <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-4 h-16 bg-amber-800 rounded-t-lg"></div>
              {/* Ветки */}
              <div className="absolute bottom-16 right-1/2 translate-x-1/2 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[40px] border-b-green-700"></div>
              <div className="absolute bottom-24 right-1/2 translate-x-1/2 w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-b-[35px] border-b-green-600"></div>
              <div className="absolute bottom-32 right-1/2 translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[30px] border-b-green-500"></div>
            </div>
          </div>
        </div>
        
        {/* Анимированные шарики на правой ёлке */}
        {balls.filter(b => b.side === 'right').map((ball) => (
          <div
            key={ball.id}
            className="absolute christmas-ball"
            style={{
              left: `${ball.left}%`,
              top: `${ball.top}%`,
              width: `${ball.size}px`,
              height: `${ball.size}px`,
              backgroundColor: ball.color,
              borderRadius: '50%',
              boxShadow: `0 0 ${ball.size / 2}px ${ball.color}, inset -2px -2px 4px rgba(0,0,0,0.3)`,
              animation: `ball-glow ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${ball.delay}s`,
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </div>
    </>
  );
};

