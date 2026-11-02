/** Short, optional vibration for taps. Silently does nothing where unsupported or reduced motion is preferred. */
export function tapFeedback(ms = 10) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
