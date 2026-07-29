## Problem

When users navigate between pages (e.g. `/auth` → `/`, or to `/pricing`), they briefly see a blank white screen. This happens because every non-`/auth` route is lazy-loaded (`React.lazy`) and the `<Suspense>` fallback in `src/App.tsx` is currently `null`, so nothing renders while the route chunk downloads.

## Solution

Reuse the Medora splash visual (logo + pulse ring, "Your health, in your pocket") as a lightweight **route transition loader** so users always see the brand instead of white.

### Changes

1. **New component `src/components/RouteLoader.tsx`**
   - A stripped-down version of `SplashScreen` — same logo, same pulse animation, same background gradient, no timers, no `onDone` callback.
   - Respects `useDeviceConditions` (disables the pulse on power-saver / reduced-motion, just shows the static logo).
   - Renders full-screen (`fixed inset-0`) on top of the app.
   - Only appears while a lazy chunk is loading, then unmounts as soon as React finishes suspending.

2. **`src/App.tsx`** — use `<RouteLoader />` as the `<Suspense fallback>` instead of `null`. That single change covers every lazy route (`/`, `/pricing`, all blog pages, `/e/:token`, `/auth/callback`, etc.).

3. **Avoid a flash for already-cached routes**
   - The idle-time prefetch already added in `src/pages/Auth.tsx` warms `/` and `/pricing`, so those transitions typically resolve synchronously and the loader never appears.
   - For uncached chunks, the loader shows only for the duration of the network fetch, keeping brand continuity.

### What the loader looks like

Same visual language as the initial splash:

```text
┌────────────────────────────┐
│                            │
│         ◯ (pulse)          │
│         [Medora logo]      │
│           Medora           │
│  Your health, in your pocket │
│                            │
└────────────────────────────┘
```

Background: subtle `background → accent/40` gradient (already defined in tokens), no hardcoded colors.

### What is intentionally NOT changed

- The initial `SplashScreen` (session-scoped, shown once) stays as-is — it still hides on `/auth`, `/e/:token`, `/pricing`, and blog routes to protect LCP on SEO-critical pages.
- No new animations, no video file (a real video would hurt load time on every navigation); the loader is pure CSS/SVG so it's instant.
- No changes to backend, routing, auth, or data layers.

### Files touched

- `src/components/RouteLoader.tsx` — new (~40 lines)
- `src/App.tsx` — 1-line change to the Suspense fallback
