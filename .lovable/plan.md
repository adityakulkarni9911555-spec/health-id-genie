## Goal

Bounced visitors currently land on `/auth` or the benefits blog post and see either a login form or a wall of article text — no obvious, intent-matching primary action. Add clear above-the-fold CTAs that match each page's user intent so first-time visitors take a next step instead of leaving.

## Changes

### 1. `src/pages/Auth.tsx` — hero CTA + signup deep link

- In the hero (left column), add a prominent primary CTA row directly under the benefits bullets, visible above the fold on both mobile and desktop:
  - Primary button: **"Create my free health wallet"** → switches the form to signup mode and scrolls/focuses the email field.
  - Secondary button: **"I already have an account"** → switches to signin mode and focuses email.
  - Below the buttons: small reassurance line — "Free forever for 1 profile · No credit card · 30-second setup".
- On mobile (`< lg`), reorder so the hero (headline + bullets + primary CTA) renders **before** the form card, so the CTA is the first thing above the fold instead of the raw form. Keep the form immediately below for users who scroll.
- Read `?mode=signup` from the URL on mount and default `mode` to `"signup"` when present, so links from the blog land users directly in signup.

### 2. `src/pages/BlogBenefitsPHR.tsx` — inline CTA block

- Directly after the intro paragraph (above the fold on desktop and after ~1 scroll on mobile), insert a bordered CTA card:
  - Heading: "Start your own personal health record"
  - One-line pitch matching guide intent.
  - Primary button → `/auth?mode=signup&next=/` labeled **"Create my free health record"**.
  - Secondary link → `/pricing` labeled "See plans".
- Add a second, simpler CTA line at the end of the article (before the existing related-reading block) linking to `/auth?mode=signup&next=/`.

### 3. Optional consistency

- Apply the same end-of-article CTA pattern to `src/pages/BlogDigitalIdVsBracelets.tsx` and `src/pages/BlogRequestMedicalRecords.tsx` so every blog exit path has a clear conversion route. (One-line addition per file.)

## Out of scope

- No copy changes to `/pricing` or `/` (signed-out `/` already redirects to `/auth`).
- No new routes, no analytics wiring, no A/B testing framework.
- No visual redesign of the auth form itself — only hero-side additions and mobile reordering.

## Technical notes

- CTA buttons use existing shadcn `Button` variants (`default` + `outline`) and `btn-touch` for tablet sizing — no new tokens or styles.
- Signup deep link: `useSearchParams().get("mode") === "signup"` sets initial `mode` state in `Auth.tsx`.
- Focus handling: attach a `ref` to the email input and call `.focus()` from the hero CTA handlers.
