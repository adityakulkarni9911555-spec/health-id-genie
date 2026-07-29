import { capturePostHogEvent } from './posthog';

// Report Core Web Vitals to PostHog + console.
// One event per metric per page load: `web_vitals` with metric name/value/rating.
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  import('web-vitals').then(({ onLCP, onFCP, onCLS, onINP, onTTFB }) => {
    const send = (metric: {
      name: string;
      value: number;
      rating: string;
      id: string;
      navigationType?: string;
    }) => {
      const payload = {
        metric_name: metric.name,
        metric_value: Math.round(metric.value * 1000) / 1000,
        metric_rating: metric.rating,
        metric_id: metric.id,
        navigation_type: metric.navigationType,
        path: window.location.pathname,
      };
      try {
        capturePostHogEvent('web_vitals', payload);
      } catch {
        // best-effort
      }
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`[web-vitals] ${metric.name}=${payload.metric_value} (${metric.rating})`);
      }
    };

    onLCP(send);
    onFCP(send);
    onCLS(send);
    onINP(send);
    onTTFB(send);
  });
}
