# Why bounce rate is 91%

## What the data shows (last 30 days)

- 11 visitors, 12 pageviews, **1.09 pages/visit**, **91% bounce**.
- **10 of 11 visits landed directly on `/auth`** (the sign-in page). 1 landed on an emergency `/e/:token` scan.
- Sources: 10 Direct, 1 Google app. Devices: 10 mobile, 1 desktop. Countries: IN, US.

So the bounce rate isn't really a content problem — it's a **landing-page problem**: almost everyone is being dropped straight onto the login wall with nothing to read, no value prop, and no reason to click a second page. Emergency scans (`/e/:token`) are also single-purpose by design — the doctor views one page and closes it, which counts as a bounce.

## Root causes

1. **`/auth` is the de-facto landing page for shared links.** It shows only a sign-in form — no hero, no explanation of Medora, no secondary CTA — so unauthenticated visitors leave.
2. **Home (`/`) isn't the entry point people share.** Marketing/social links likely point to `/auth` (or users hit it after clicking a "Sign in" CTA elsewhere).
3. **Emergency page is intentionally single-view.** It will always bounce; that's correct behavior, but it inflates the metric.
4. **No internal linking from `/auth`.** Even curious visitors can't reach `/blog/*` or pricing from the login page.

## Plan to lower bounce

1. **Redesign `/auth` as a value-first landing page**
   - Add a hero above the sign-in card: Medora tagline, 3 benefit bullets (emergency access, document vault, family plan), and a screenshot/illustration.
   - Add a secondary CTA: "See how it works" → scroll to features, and "Read the guide" → `/blog/benefits-of-personal-health-records`.
   - Keep the sign-in form on the right (desktop) / below hero (mobile).

2. **Add a footer with internal links on `/auth` and `/`**
   - Links to `/pricing`, the 3 blog posts, and `/` — gives visitors a second click and improves crawl depth.

3. **Redirect bare `/auth` visits from marketing sources to `/`**
   - Anywhere our own marketing/OG/share links point to `/auth`, change them to `/`. Keep `/auth` reachable via the "Sign in" button.
   - Audit `Logo` link target, OG URLs, and any share strings.

4. **Exclude `/e/:token` from bounce-sensitive reporting (documentation only)**
   - Note in the analytics view that emergency scans are expected single-page sessions so we can read the real bounce rate for marketing pages.

5. **Add "Related reading" block to each blog post**
   - Link the 3 blog posts to each other + to `/` and `/pricing`. Directly raises pages/visit.

## Technical notes

- Files to touch: `src/pages/Auth.tsx` (hero + CTAs), `src/pages/Index.tsx` (footer component), new `src/components/SiteFooter.tsx`, `src/pages/BlogBenefitsPHR.tsx` / `BlogDigitalIdVsBracelets.tsx` / `BlogRequestMedicalRecords.tsx` (related reading), and any OG/share URL constants in `src/lib/publicUrl.ts` or metadata blocks.
- No schema, RLS, or auth-flow changes. Sign-in behavior stays identical; we're only adding surrounding content and links.
- Traffic sample is very small (11 visitors) — after shipping, re-check in 2–3 weeks before drawing conclusions.

<presentation-actions>
<presentation-link url="/projects/0392aa24-616c-429a-bf3d-b6add5225e03/settings/project-insights">View analytics</presentation-link>
</presentation-actions>
