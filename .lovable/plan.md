## Diagnosis

Your metrics point to three specific causes, not general slowness:

- **LCP 6.54s / FCP 5.97s** — `SplashScreen` covers the whole viewport with an opaque `bg-background` overlay for **2200ms** before fading. Chrome measures LCP against the largest element the user actually sees, so nothing "real" can paint until the splash leaves. FCP is also delayed because the splash animations, gradients, and Logo SVG are what paints first.
- **Large JS bundle** — `src/App.tsx` eagerly imports every page (Auth, Pricing, 4 blog posts, Emergency, OAuthConsent, AuthCallback, NotFound, Index) plus PostHog. The browser downloads/parses all of it before the first route can render, extending TTI and pushing LCP later.
- **CLS 0.35** — well above the 0.1 "good" threshold. Likely sources: splash fade → content pops in with no reserved space, hero heading animations, logo/QR images without width/height, and font swap (no `font-display: swap` preload). 0.35 usually means one big shift, not many tiny ones.

## What to change

### 1. Stop the splash from blocking LCP
- Reduce default splash hold from **2200ms → 900ms** (fast path) and fade from 300ms → 200ms.
- Skip the splash entirely on **repeat visits** (sessionStorage flag) — first-time-only welcome.
- Skip on **`/e/:token`** (already done) and also on **`/auth`, `/pricing`, all `/blog/*`** routes so SEO landing pages hit LCP immediately.
- Render the splash **above** the app but let the app mount underneath in parallel, so React hydration/layout finishes during the splash instead of after.

### 2. Code-split routes
- Convert every page import in `src/App.tsx` to `React.lazy(() => import(...))` except `Index` (or `Auth`, whichever is the current landing route).
- Wrap `<Routes>` in `<Suspense fallback={null}>`.
- Expected: initial JS bundle drops significantly, FCP/LCP improve on all routes.

### 3. Kill the CLS
- Add explicit `width`/`height` (or `aspect-ratio`) to the `Logo` component and any hero images.
- Preconnect + preload the display font in `index.html` and add `font-display: swap` so text doesn't reflow when the webfont arrives.
- Remove `translateY` entry animations on the hero `<h1>` and taglines on `/auth` and `/` — those shift layout during LCP measurement. Keep opacity fades (no shift).
- Reserve height for the splash-to-app transition by mounting the app immediately (see item 1) so there's no empty→full jump.

### 4. Small perf wins
- Add `<link rel="preconnect">` for Supabase and PostHog origins in `index.html` so first API calls don't pay DNS/TLS cost during LCP.
- Defer PostHog init until after first paint (`requestIdleCallback` or a `setTimeout(0)` in `PostHogProvider`).

## Files touched

- `src/components/SplashScreen.tsx` — shorter timings, sessionStorage skip, route allow-list.
- `src/App.tsx` — `React.lazy` + `Suspense` for all non-landing routes; splash gating logic.
- `src/pages/Auth.tsx`, `src/pages/Index.tsx` — remove translate-based entry animations on the LCP heading.
- `src/components/Logo.tsx` — set explicit `width`/`height` on the SVG.
- `src/components/PostHogProvider.tsx` — defer `posthog.init` to idle.
- `index.html` — preconnect (Supabase, PostHog, fonts), preload the display font, ensure `font-display: swap`.

## Expected impact

- LCP: **6.5s → ~1.5–2.5s** on `/auth` (biggest lever = removing the 2.2s splash block).
- FCP: **~5.9s → ~1.2s**.
- CLS: **0.35 → under 0.1**.
- INP already good (42ms) — no change.

No backend/schema changes. No visual redesign — the splash still exists but stops blocking, and hero entrance animations become opacity-only.
