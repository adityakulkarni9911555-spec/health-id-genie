import posthog from 'posthog-js';

const PROJECT_TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const REGION = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION || 'eu';

let initAttempted = false;
let ready = false;

function scheduleIdle(cb: () => void) {
  if (typeof window === 'undefined') return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(cb, { timeout: 3000 });
  } else {
    window.setTimeout(cb, 1500);
  }
}

export function initPostHog() {
  if (!PROJECT_TOKEN) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY is not set');
    }
    return;
  }

  if (initAttempted) return;
  initAttempted = true;

  const apiHost =
    REGION === 'us'
      ? 'https://us.i.posthog.com'
      : 'https://eu.i.posthog.com';

  posthog.init(PROJECT_TOKEN, {
    api_host: apiHost,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false,
    persistence: 'localStorage',
    loaded: () => {
      ready = true;
      if (import.meta.env.DEV) {
        console.log('[PostHog] loaded');
      }
    },
  });
}

export function ensurePostHogIdle() {
  scheduleIdle(initPostHog);
}

export function capturePostHogEvent(event: string, properties: Record<string, unknown> = {}) {
  ensurePostHogIdle();
  if (!ready) return;
  posthog.capture(event, properties);
}

export function getPostHogFlagVariant(flagKey: string): string | boolean | undefined {
  ensurePostHogIdle();
  if (!ready) return undefined;
  return posthog.getFeatureFlag(flagKey);
}

export function shutdownPostHog() {
  try {
    posthog.capture('$pageleave');
    posthog.shutdown();
  } catch {
    // Best-effort cleanup.
  }
}

export { posthog };
