import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Petal {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
}

interface Butterfly {
  id: number;
  left: number;
  top: number;
  duration: number;
  delay: number;
}

export const SpringDecorations = () => {
  const location = useLocation();
  const { activeTheme } = useTheme();
  const [petals, setPetals] = useState<Petal[]>([]);
  const [butterflies, setButterflies] = useState<Butterfly[]>([]);
  
  // Проверяем, не находимся ли мы в админке
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  // Показываем только если активна весенняя тема
  const shouldShow = activeTheme === 'spring';

  useEffect(() => {
    if (!shouldShow || isAdminRoute) return;

    // Создаем лепестки
    const createPetals = () => {
      const newPetals: Petal[] = [];
      for (let i = 0; i < 30; i++) {
        newPetals.push({
          id: i,
          left: Math.random() * 100,
          top: -10 - Math.random() * 20,
          size: Math.random() * 3 + 1.5,
          duration: Math.random() * 4 + 6,
          delay: Math.random() * 5,
          rotation: Math.random() * 360,
        });
      }
      setPetals(newPetals);
    };

    // Создаем бабочек
    const createButterflies = () => {
      const newButterflies: Butterfly[] = [];
      for (let i = 0; i < 8; i++) {
        newButterflies.push({
          id: i,
          left: Math.random() * 100,
          top: Math.random() * 100,
          duration: Math.random() * 3 + 4,
          delay: Math.random() * 3,
        });
      }
      setButterflies(newButterflies);
    };

    createPetals();
    createButterflies();
  }, [shouldShow, isAdminRoute]);

  if (!shouldShow || isAdminRoute) return null;

  return (
    <>
      {/* Лепестки */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {petals.map((petal) => (
          <div
            key={petal.id}
            className="absolute spring-petal"
            style={{
              left: `${petal.left}%`,
              top: `${petal.top}%`,
              fontSize: `${petal.size}px`,
              animation: `spring-petal-fall ${petal.duration}s linear infinite`,
              animationDelay: `${petal.delay}s`,
              transform: `rotate(${petal.rotation}deg)`,
            }}
          >
            🌸
          </div>
        ))}
      </div>

      {/* Бабочки */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {butterflies.map((butterfly) => (
          <div
            key={butterfly.id}
            className="absolute spring-butterfly"
            style={{
              left: `${butterfly.left}%`,
              top: `${butterfly.top}%`,
              animation: `spring-butterfly-fly ${butterfly.duration}s ease-in-out infinite`,
              animationDelay: `${butterfly.delay}s`,
            }}
          >
            🦋
          </div>
        ))}
      </div>

      {/* Блестящие частицы */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute spring-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `spring-sparkle ${2 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            <Sparkles className="w-2 h-2 text-pink-300" />
          </div>
        ))}
      </div>

      {/* Весенняя гирлянда сверху */}
      <div className="fixed top-0 left-0 right-0 h-2 pointer-events-none z-50 overflow-hidden">
        <div className="absolute inset-0 spring-garland" />
      </div>
    </>
  );
};

