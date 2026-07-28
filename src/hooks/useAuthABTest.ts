import { useEffect, useMemo, useState } from 'react';
import { capturePostHogEvent, getPostHogFlagVariant } from '@/lib/posthog';

export type AuthHeroVariant = 'control' | 'alternate';

const FLAG_KEY = 'auth_hero_cta_variant';
const STORAGE_KEY = 'medora:ab:auth_hero_variant';

function readStoredVariant(): AuthHeroVariant | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'control' || raw === 'alternate') return raw;
  } catch {
    // Ignore storage errors (private mode, etc.).
  }
  return null;
}

function storeVariant(variant: AuthHeroVariant) {
  try {
    localStorage.setItem(STORAGE_KEY, variant);
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
    const assigned = coinFlip();
    storeVariant(assigned);
    return assigned;
  });

  const [ready] = useState(true);

  useEffect(() => {
    setVariant((current) => {
      storeVariant(current);
      return current;
    });

    const idleTimer = window.setTimeout(() => {
      const remoteVariant = getPostHogFlagVariant(FLAG_KEY);
      capturePostHogEvent('ab_variant_assigned', {
        experiment: FLAG_KEY,
        variant,
        remoteVariant,
        lockedForStability: true,
      });
    }, 2500);

    return () => window.clearTimeout(idleTimer);
  }, [variant]);

  return useMemo(() => ({ variant, ready, flagKey: FLAG_KEY }), [variant, ready]);
}

export function trackAuthEvent(
  event: 'auth_page_view' | 'signup_started' | 'signup_completed' | 'signin_started' | 'signin_completed',
  properties: Record<string, unknown> = {}
) {
  try {
    capturePostHogEvent(event, properties);
  } catch (err) {
    // Analytics are best-effort.
    if (import.meta.env.DEV) {
      console.warn('[PostHog] capture error', err);
    }
  }
}
