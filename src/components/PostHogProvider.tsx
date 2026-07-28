import { useEffect } from 'react';
import { initPostHog, shutdownPostHog } from '@/lib/posthog';

// Defer PostHog init until the browser is idle so it doesn't compete
// with the first paint / LCP.
function scheduleIdle(cb: () => void) {
  if (typeof window === 'undefined') return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 0);
  }
}

if (typeof window !== 'undefined') {
  scheduleIdle(() => {
    initPostHog();
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    scheduleIdle(initPostHog);

    if (import.meta.env.PROD) {
      return () => {
        shutdownPostHog();
      };
    }
  }, []);

  return <>{children}</>;
}
