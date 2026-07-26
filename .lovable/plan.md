## Problem
The splash overlay uses `bg-gradient-to-br from-background via-background to-accent/40`. The `to-accent/40` stop is 40% opaque, so the bottom-right of the splash is semi-transparent and the sign-in page shows through while the app is loading.

## Fix
Update `src/components/SplashScreen.tsx`:

1. Make the splash container fully opaque by setting its base background to `bg-background`.
2. Keep the same visual accent by layering an absolutely positioned decorative gradient (`from-background via-background to-accent/40`) *inside* the splash. This gradient blends against the opaque splash background instead of the page behind it.
3. Leave the existing z-index, fade-out transition, reduced-motion behavior, and animation timings unchanged.

## Files changed
- `src/components/SplashScreen.tsx`

## Verification
- Launch the app and confirm the splash screen fully covers the `/auth` page 404 content underneath during the ~2.2s animation.
- Confirm the fade-out transition still works smoothly.