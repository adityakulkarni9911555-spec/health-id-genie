import { useEffect } from 'react';
import { initPostHog, posthog, shutdownPostHog } from '@/lib/posthog';

// Initialize as early as possible so feature flags are ready before render.
initPostHog();

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Kick off a feature-flag reload once the provider mounts. This is a
    // no-op if flags are already loaded, but ensures the /decide request is
    // sent promptly for A/B test assignment.
    try {
      posthog.reloadFeatureFlags();
    } catch {
      // Ignore if PostHog is not initialized.
    }

    // In production, send a clean pageleave on unmount. In development,
    // React Strict Mode can mount/unmount quickly, so we skip shutdown
    // to avoid killing the analytics session during HMR.
    if (import.meta.env.PROD) {
      return () => {
        shutdownPostHog();
      };
    }
  }, []);

  return <>{children}</>;
}
