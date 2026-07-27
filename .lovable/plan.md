## Goal
Let users switch the app between Light, Dark, and System (auto-sync with phone) themes. When set to System, the app follows the device's OS preference in real time.

## What we'll build

1. **Theme engine** (`src/hooks/useTheme.ts`)
   - Modes: `light` | `dark` | `system`
   - Persists choice in `localStorage` (`medora-theme`)
   - Listens to `window.matchMedia('(prefers-color-scheme: dark)')` and updates instantly when the phone toggles dark mode
   - Applies `class="light"` or `class="dark"` to `<html>` and sets `color-scheme` accordingly

2. **Dark theme tokens** (`src/index.css`)
   - Add a `.dark` block mirroring the existing light palette: dark background, elevated surfaces, adjusted primary/accent, borders, muted text, shadows tuned for dark UI
   - Keep the medical purple-indigo/teal identity, just on a deep neutral base
   - Ensure glassmorphism utilities, `.input-large`, `.btn-touch`, splash, sync banners, and HealthCard read well in dark
   - Print styles stay forced-light (so printed Health Card is always white)

3. **Theme toggle UI** (`src/components/ThemeToggle.tsx`)
   - Compact 3-option control (Sun / Moon / Smartphone icons) with tablet-friendly 56px targets
   - Placed in the sticky glass header in `src/pages/Index.tsx` and on `src/pages/Auth.tsx`
   - Shows current mode and, when in System, a small "Auto" hint

4. **Bootstrap without flash**
   - Add a tiny inline script in `index.html` that reads `localStorage` + `matchMedia` and sets the `<html>` class before React mounts, so first paint (including SplashScreen) matches the chosen theme
   - Remove the hardcoded `class="light"` currently forced on `<html>`; `color-scheme` becomes dynamic

5. **Emergency page stays neutral**
   - `/e/:token` remains forced-light (clinician context, printable, no persistence) — theme hook is skipped on that route

## Out of scope
- No changes to auth, database, storage, edge functions, or business logic
- No new colors beyond the dark counterparts of existing tokens
- Printed Health Card output unchanged (always light)
