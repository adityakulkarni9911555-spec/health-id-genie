import posthog from 'posthog-js';

const PROJECT_TOKEN = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY;
const REGION = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION || 'eu';

let initAttempted = false;

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
      if (import.meta.env.DEV) {
        console.log('[PostHog] loaded');
      }
    },
  });
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
