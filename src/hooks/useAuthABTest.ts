import { useEffect, useMemo, useState } from 'react';
import { posthog } from '@/lib/posthog';

export type AuthHeroVariant = 'control' | 'alternate';

const FLAG_KEY = 'auth_hero_cta_variant';
const STORAGE_KEY = 'medora:ab:auth_hero_variant';

function readStoredVariant(): AuthHeroVariant | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'control' || raw === 'alternate') return raw;
  } catch {
    // Ignore storage errors (private mode, etc.).
  }
  return null;
}

function storeVariant(variant: AuthHeroVariant) {
  try {
    sessionStorage.setItem(STORAGE_KEY, variant);
  } catch {
    // Ignore storage errors.
  }
}

function coinFlip(): AuthHeroVariant {
  return Math.random() < 0.5 ? 'control' : 'alternate';
}

/**
 * Assigns the visitor to an A/B test variant for the /auth hero CTA.
 * Falls back to a client-side 50/50 coin flip if PostHog is unavailable.
 */
export function useAuthABTest() {
  const [variant, setVariant] = useState<AuthHeroVariant>(() => {
    const stored = readStoredVariant();
    if (stored) return stored;
    // Temporary placeholder until PostHog decides.
    return 'control';
  });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredVariant();
    if (stored) {
      setVariant(stored);
      setReady(true);
      return;
    }

    let assigned: AuthHeroVariant | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // PostHog's feature flags may already be cached or may arrive shortly.
    // We use the callback API so we react as soon as flags are loaded.
    const unsubscribe = posthog.onFeatureFlags((flags, flagVariants) => {
      if (import.meta.env.DEV) {
        console.log('[PostHog] onFeatureFlags', flags, flagVariants);
      }
      if (assigned) return; // already decided

      const value = flagVariants?.[FLAG_KEY] ?? posthog.getFeatureFlag(FLAG_KEY);
      if (value === 'alternate') assigned = 'alternate';
      else if (value === 'control') assigned = 'control';

      if (!assigned) {
        assigned = coinFlip();
      }

      storeVariant(assigned);
      setVariant(assigned);
      setReady(true);
      if (timer) clearTimeout(timer);

      posthog.capture('ab_variant_assigned', {
        experiment: FLAG_KEY,
        variant: assigned,
        fallback: !flags.includes(FLAG_KEY),
      });
    });

    // Safety net: if PostHog never fires the callback, still pick a variant.
    timer = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log('[PostHog] safety net fired');
      }
      if (assigned) return;
      unsubscribe?.();
      assigned = coinFlip();
      storeVariant(assigned);
      setVariant(assigned);
      setReady(true);
    }, 2000);

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return useMemo(() => ({ variant, ready, flagKey: FLAG_KEY }), [variant, ready]);
}

export function trackAuthEvent(
  event: 'auth_page_view' | 'signup_started' | 'signup_completed' | 'signin_started' | 'signin_completed',
  properties: Record<string, unknown> = {}
) {
  try {
    const result = posthog.capture(event, properties);
    if (import.meta.env.DEV) {
      console.log('[PostHog] capture', event, properties, 'result:', result);
    }
  } catch (err) {
    // Analytics are best-effort.
    if (import.meta.env.DEV) {
      console.warn('[PostHog] capture error', err);
    }
  }
}
