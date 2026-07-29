import { Logo } from '@/components/Logo';
import { useDeviceConditions } from '@/hooks/useDeviceConditions';

export const RouteLoader = () => {
  const { powerSaver, reducedMotion } = useDeviceConditions();
  const lite = powerSaver || reducedMotion;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading Medora"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/40 pointer-events-none"
        aria-hidden="true"
      />
      <style>{`
        @keyframes route-loader-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          80% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .route-loader-ring {
          animation: route-loader-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .route-loader-ring { animation: none; opacity: 0; }
        }
      `}</style>

      <div className="flex flex-col items-center relative">
        <div className="relative flex items-center justify-center mb-5" style={{ width: 80, height: 80 }}>
          {!lite && (
            <span
              className="route-loader-ring absolute inset-0 m-auto w-20 h-20 rounded-3xl"
              style={{
                background: 'linear-gradient(135deg, hsl(258, 89%, 72%), hsl(174, 62%, 45%))',
                filter: 'blur(2px)',
              }}
            />
          )}
          <div className="relative drop-shadow-lg">
            <Logo size={80} />
          </div>
        </div>
        <p className="font-display text-lg font-semibold tracking-tight text-foreground">Medora</p>
        <p className="mt-1 text-xs text-muted-foreground">Your health, in your pocket</p>
      </div>
    </div>
  );
};
