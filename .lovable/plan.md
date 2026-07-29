## Goal

Bring the published site's Core Web Vitals into passing range:
- LCP < 2.5s (currently ~29s)
- FCP < 1.8s (currently ~52s)
- CLS < 0.1 (currently 0.41)

FCP of 52s is not a rendering problem — that magnitude means the browser is blocked on the network before HTML/JS even parses. So the plan attacks both: shrink and defer the critical path, then stabilize layout.

## What to change

### 1. Shrink the initial JS bundle (biggest LCP/FCP win)

- Add `build.rollupOptions.output.manualChunks` in `vite.config.ts` to split vendor code: `react`/`react-dom`/`react-router` in one chunk, `@supabase/*` in another, `@tanstack/react-query` in a third, Radix UI primitives in a fourth. Prevents the current single mega-chunk that blocks first paint.
- Lazy-load heavy providers that aren't needed for first paint:
  - Move `HelmetProvider` import in `src/main.tsx` behind `React.lazy` — Helmet isn't needed until after mount.
  - Lazy-load `QueryClientProvider`, `TooltipProvider`, `Toaster`, `Sonner` in `src/App.tsx` via `React.lazy` + a wrapper, so `/auth` (which uses none of them for first paint) doesn't ship them upfront.
- `Auth.tsx` currently imports `react-helmet-async` synchronously — swap for a small `<title>`/`<meta>` update via `document.title` in `useEffect` on the auth page only, dropping Helmet from the auth entry.

### 2. Route-level code-splitting for `/auth`

- The landing route users hit is `/auth`. Currently `Auth` is imported eagerly in `App.tsx` (`import Auth from "./pages/Auth"`). Keep it eager but strip its imports of anything not needed above the fold: `useAuthABTest` (PostHog flag lookup), `Helmet`, and the `SiteFooter` — lazy-load them.
- `useAuthABTest.ts` reads PostHog on mount. Wrap the whole hook in `requestIdleCallback` so it never runs in the FCP window.

### 3. Kill the splash screen contribution to LCP

- `SplashScreen` is skipped on `/auth`, but on `/` it currently paints a gradient overlay + animated pulse ring, and its H1 "Medora" is likely the LCP element. Reduce hold to 150ms max and mark the H1 with `fetchpriority` semantics (inline critical CSS for the heading font-size + weight so it paints in the first frame).

### 4. Preload the auth hero elements

- Add `<link rel="preload" as="fetch" href="https://kfvpqejwnhqqwrswjkqj.supabase.co/auth/v1/token" crossorigin>` — already preconnected, but not preloading. Skip if it triggers auth calls; just keep `preconnect`.
- Add `<link rel="modulepreload">` in `index.html` for the built `Auth.tsx` chunk name (via a small vite plugin or manual after first build).

### 5. Fix CLS (0.43 → <0.1)

CLS is layout jumping after paint. Root causes in this codebase:
- `SplashScreen` unmounts and pushes real content in — reserve the same viewport height for the shell before splash unmounts.
- `Auth.tsx` toggles between `signin`/`signup` mode which changes form height — set `min-height` on the form container so the switch doesn't reflow.
- Icon-only buttons (`ThemeToggle`, sign-out) in the header render after hydration — set explicit `w`/`h` on their placeholders.
- Fonts: `index.css` says "system fonts for first paint" but `font-display` isn't declared on any `@font-face`. Audit and add `font-display: swap` to every custom font (if any remain), and set `font-family` on `<html>` in inline CSS so the fallback matches metrics.

### 6. Defer non-critical third parties

- PostHog: already idle-loaded, but `useAuthABTest` calls `getPostHogFlagVariant` on mount — defer as noted above.
- `lovable-tagger` is dev-only ✓.
- `mcpPlugin()` runs in prod — confirm it doesn't inject a runtime script into `index.html`; if it does, remove from prod build.

### 7. Verification

Build locally, then run Playwright against the preview with `page.evaluate` reading `PerformanceObserver` LCP/CLS/FCP entries and print them. Confirm each metric before declaring done. Also check Network panel for the largest blocking resource and iterate if any single chunk is still >150KB gzipped.

## Technical notes

- Order of impact: (1) bundle split + lazy providers is the single biggest win — Helmet + React Query + Supabase JS + Radix likely sum to ~250KB gzipped on the critical path today. Expect FCP to drop by an order of magnitude just from this.
- The 52s FCP suggests the user's network was severely constrained during the measurement; even after fixes, results depend on where the test ran from. I will validate against a throttled Fast 3G profile in Playwright to prove the improvement is real, not just fast-network luck.
- No visual/design changes. No business-logic changes. All edits are in `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/pages/Auth.tsx`, `src/hooks/useAuthABTest.ts`, `src/components/SplashScreen.tsx`, `src/index.css`, and `index.html`.
