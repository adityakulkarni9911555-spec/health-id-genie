import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { useDeviceConditions } from '@/hooks/useDeviceConditions';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen = ({ onDone }: SplashScreenProps) => {
  const [leaving, setLeaving] = useState(false);
  const { powerSaver, reducedMotion } = useDeviceConditions();

  useEffect(() => {
    const lite = powerSaver || reducedMotion;
    // Keep the splash short so it never blocks LCP measurement.
    const holdMs = lite ? 200 : 500;
    const fadeMs = lite ? 100 : 150;

    const leaveTimer = window.setTimeout(() => setLeaving(true), holdMs);
    const doneTimer = window.setTimeout(onDone, holdMs + fadeMs);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone, powerSaver, reducedMotion]);


  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-200 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-hidden={leaving}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/40 pointer-events-none"
        aria-hidden="true"
      />
      <style>{`
        @keyframes splash-pulse {
          0% { transform: scale(0.6); opacity: 0.6; }
          80% { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes splash-logo-in {
          0% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
        .splash-pulse-ring {
          animation: splash-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .splash-logo {
          animation: splash-logo-in 250ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .splash-pulse-ring { animation: none; opacity: 0; }
          .splash-logo { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-6" style={{ width: 96, height: 96 }}>
          <span
            className="splash-pulse-ring absolute inset-0 m-auto w-24 h-24 rounded-3xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(258, 89%, 72%), hsl(174, 62%, 45%))',
              filter: 'blur(2px)',
            }}
          />
          <div className="splash-logo relative drop-shadow-lg">
            <Logo size={96} />
          </div>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Medora
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your health, in your pocket
        </p>
      </div>
    </div>
  );
};
