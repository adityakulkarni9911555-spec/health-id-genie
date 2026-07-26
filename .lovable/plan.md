## Goal

Reposition Smart Health as a **personal health wallet** for individual users, remove the recently-added staff/role surface entirely, and open every app launch with a short animated logo reveal.

---

## 1. Remove staff features

Delete from the codebase:
- `src/pages/Staff.tsx`
- `src/hooks/useUserRole.ts`
- Staff `<Route>` and `Staff` import in `src/App.tsx`
- "Staff" button + `useUserRole` usage in `src/pages/Index.tsx` header

Database: **leave `user_roles`, `patient_edit_logs`, `staff_get_patient`, and `staff_update_patient_safe_fields` in place.** They are locked down (RLS + `SECURITY DEFINER` with an authorization check) and cost nothing while unused. Removing them requires a destructive migration that isn't needed for the consumer pivot.

## 2. Animated logo splash (every launch)

New component `src/components/SplashScreen.tsx`:
- Full-viewport light gradient background matching the app's hero surface.
- The existing `<Logo>` scales in from 0.85 → 1 with a soft spring, a pulse ring expands and fades behind it, and the wordmark "Smart Health" + tagline fade up.
- Total runtime **~2.4s**, then a 300ms fade-out.
- Pure CSS keyframes + SVG — no video file, no extra deps, no network dependency.
- Includes `prefers-reduced-motion` fallback: static logo shown for 600ms, then dismissed.

Mount in `src/App.tsx` at the top level (outside `<Routes>`) so it plays on every launch regardless of route (auth, home, consent). A `useState` flag hides it after the animation completes. No `sessionStorage` — plays every time per the chosen behavior.

## 3. Consumer "personal health wallet" tone

Copy + iconography updates only (no behavioral changes):

**`src/pages/Index.tsx` hero**
- Chip: "Your health, in your pocket"
- H2: *"Your personal**  health wallet**"* (accent on the last two words)
- Subhead: "Carry your medical essentials, allergies, and emergency info with you — anywhere, anytime. Just for you."
- Three feature cards rewritten around personal ownership:
  - **Always with you** — access on any device you sign in with
  - **Yours alone** — private by design, only you can see it
  - **Ready in emergencies** — critical info one tap away

**`src/pages/Auth.tsx`**
- Headline: "Your health wallet"
- Sub: "Sign in to open your card, or create one in under a minute."

**`index.html`**
- `<title>`: "Smart Health — Your Personal Health Wallet"
- Meta description + og tags aligned to the wallet framing.

**`src/components/HealthCardPreview.tsx`**
- Success heading softened from clinical "Registration Complete!" to "Your health wallet is ready".
- Section title "Full Patient Details" → "Your details".

**`src/components/PatientRegistrationForm.tsx`**
- Section headings shifted from clinical ("Patient Registration") to first-person ("Let's set up your card", "A bit about you", "Your medical info", "Emergency & documents"). Field labels stay the same to keep the data model unchanged.

## 4. Out of scope (intentionally not doing)

- Not changing form fields, database schema, MCP tools, or offline sync.
- Not changing the `HealthCard` printed layout (already premium-branded).
- Not touching document upload or OAuth consent flows.

---

## Technical notes

- Splash uses Tailwind + a small `<style>` block for the pulse ring keyframes; leverages existing `animate-fade-in` / `animate-scale-in` where possible.
- All copy updates are string-only changes in the components listed — no prop or type changes.
- File deletions use `rm`; route/import removals use targeted line edits.

## Files touched

- Delete: `src/pages/Staff.tsx`, `src/hooks/useUserRole.ts`
- Edit: `src/App.tsx`, `src/pages/Index.tsx`, `src/pages/Auth.tsx`, `src/components/HealthCardPreview.tsx`, `src/components/PatientRegistrationForm.tsx`, `index.html`
- Create: `src/components/SplashScreen.tsx`
