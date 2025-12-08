import { useMemo } from 'react';
import { Sparkles, Star } from 'lucide-react';

interface SparklesLayerProps {
  isMobile: boolean;
  type: 'stars' | 'sparkles';
}

export const SparklesLayer = ({ isMobile, type }: SparklesLayerProps) => {
  // Мемоизируем позиции и анимации для избежания ререндеров
  const sparkles = useMemo(() => {
    const count = type === 'stars' ? (isMobile ? 5 : 8) : (isMobile ? 5 : 15);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: type === 'stars' ? 2 + Math.random() * 2 : 1.5 + Math.random() * 1.5,
      delay: Math.random() * 2,
    }));
  }, [isMobile, type]);

  if (type === 'stars') {
    return (
      <div className="fixed inset-0 pointer-events-none z-[66] overflow-hidden hidden sm:block">
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute new-year-sparkle"
            style={{
              left: `${sparkle.left}%`,
              top: `${sparkle.top}%`,
              animation: `sparkle ${sparkle.duration}s ease-in-out infinite`,
              animationDelay: `${sparkle.delay}s`,
              transform: 'translateZ(0)',
            }}
          >
            <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[66] overflow-hidden">
      {sparkles.map((sparkle) => (
        <div
          key={`sparkle-${sparkle.id}`}
          className="absolute new-year-sparkle"
          style={{
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
            animation: `sparkle ${sparkle.duration}s ease-in-out infinite`,
            animationDelay: `${sparkle.delay}s`,
            transform: 'translateZ(0)',
          }}
        >
          <Sparkles className="w-2 h-2 text-yellow-300" />
        </div>
      ))}
    </div>
  );
};

