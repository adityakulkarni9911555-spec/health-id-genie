# Explain the Medora Family plan in-app

## Goal
Make how the Family plan works obvious to users inside the app, so no one is confused about billing, member limits, or privacy.

## What we know today
- Family plan slug is `family`, priced at ₹199/month (`src/pages/Pricing.tsx`).
- A family group can include the owner + up to 5 members, i.e. 6 profiles total (`src/components/FamilyManager.tsx` and `useSubscription.ts`).
- The owner invites by email; invited people are `pending` until they join (`family_members` table in `FamilyManager.tsx`).
- Each member’s documents stay under their own profile/owner-only RLS; the plan only shares the subscription and profile quota.

## Plan
1. Add a small, scannable "How it works" info card to the Family plan column on `src/pages/Pricing.tsx` that lists:
   - One subscription covers the owner + up to 5 family members.
   - Total of 6 profiles.
   - Each member keeps their own private records.
2. Update `src/components/FamilyManager.tsx` to show the same limits and privacy note above the invite form so the owner sees it while managing members.
3. Keep the existing light/dark theme and tablet-friendly spacing already in place.
4. Verify the copy appears correctly in the preview and that no layout breaks on tablet widths.

## Outcome
Users never have to guess what "Family" means: they see member count, pricing, and privacy at a glance.