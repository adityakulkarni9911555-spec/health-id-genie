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
    const holdMs = lite ? 400 : 2200;
    const fadeMs = lite ? 150 : 300;

    const leaveTimer = window.setTimeout(() => setLeaving(true), holdMs);
    const doneTimer = window.setTimeout(onDone, holdMs + fadeMs);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone, powerSaver, reducedMotion]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ${
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
          0% { transform: scale(0.82); opacity: 0; }
          60% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes splash-text-in {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .splash-pulse-ring {
          animation: splash-pulse 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .splash-logo {
          animation: splash-logo-in 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .splash-title {
          animation: splash-text-in 600ms ease-out 400ms both;
        }
        .splash-tagline {
          animation: splash-text-in 600ms ease-out 600ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .splash-pulse-ring { animation: none; opacity: 0; }
          .splash-logo, .splash-title, .splash-tagline { animation: none; opacity: 1; transform: none; }
        }
      `}</style>

      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center mb-6">
          <span
            className="splash-pulse-ring absolute inset-0 m-auto w-24 h-24 rounded-3xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(258, 89%, 72%), hsl(174, 62%, 45%))',
              filter: 'blur(2px)',
            }}
          />
          <span
            className="splash-pulse-ring absolute inset-0 m-auto w-24 h-24 rounded-3xl"
            style={{
              background:
                'linear-gradient(135deg, hsl(258, 89%, 72%), hsl(174, 62%, 45%))',
              animationDelay: '0.6s',
              filter: 'blur(2px)',
            }}
          />
          <div className="splash-logo relative drop-shadow-lg">
            <Logo size={96} />
          </div>
        </div>
        <h1 className="splash-title font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Medora
        </h1>
        <p className="splash-tagline mt-1.5 text-sm text-muted-foreground">
          Your health, in your pocket
        </p>
      </div>
    </div>
  );
};
