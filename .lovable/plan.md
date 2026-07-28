# Plan: Freemium + Family Plan Monetization for Medora (India / INR)

## Goal
Add a paid subscription layer to Medora so the app can generate revenue while keeping a useful free tier. The first launch targets the Indian consumer market with Razorpay checkout, monthly billing only, and two paid tiers:

- **Free** — 1 profile, up to 5 documents
- **Premium** — ₹99/month, 1 profile, unlimited documents
- **Family** — ₹199/month, up to 5 profiles, unlimited documents

## Current State (verified)
- Medora is a consumer health wallet: one `auth.users` account links to one `profiles` row, which links to one `patients` row.
- `patients` already has owner-only RLS, `documents` JSONB array, and emergency share tokens.
- Storage bucket `patient-documents` is private and owner-scoped.
- No subscription, billing, or plan-limit code exists today.
- Razorpay is **not** available as a Lovable connector, so this will use custom secrets + Supabase Edge Functions.

## Proposed Architecture

### 1. Database Schema

New tables (all in `public` with RLS + GRANTs):

#### `subscription_plans`
Static catalog of plans.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| slug | text unique | `free`, `premium`, `family` |
| name | text | "Premium", "Family" |
| price_inr | integer | paise (₹99 = 9900) |
| max_profiles | integer | 1, 1, 5 |
| max_documents | integer | 5, null, null |
| razorpay_plan_id | text | optional, for future Razorpay subscriptions |

#### `user_subscriptions`
One active subscription per user / family group.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK auth.users | the paying user |
| plan_slug | text | `premium` or `family` |
| status | text | `active`, `cancelled`, `past_due` |
| started_at | timestamptz | |
| expires_at | timestamptz | monthly expiry |
| razorpay_order_id | text | |
| razorpay_payment_id | text | |
| created_at / updated_at | timestamptz | |

#### `family_groups`
For Family plan ownership.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK auth.users | paying user |
| plan_slug | text | `family` |
| max_members | integer | 5 |
| created_at | timestamptz | |

#### `family_members`
Links additional accounts to a family group.

| column | type | notes |
|--------|------|-------|
| id | uuid PK | |
| group_id | uuid FK family_groups | |
| user_id | uuid FK auth.users | invited member |
| invited_email | text | used before signup |
| status | text | `pending`, `active`, `removed` |
| created_at | timestamptz | |

#### `profiles` extension
Add to existing `profiles` table:
- `plan_slug` text default `'free'`
- `family_group_id` uuid nullable FK
- `subscription_expires_at` timestamptz nullable

#### Enforcement helpers
- SQL function `check_document_limit(_patient_id uuid)` returns whether the owning profile can add another document based on its effective plan.
- SQL function `effective_plan(_user_id uuid)` returns `free`/`premium`/`family` by checking personal subscription + family membership.
- SQL function `can_add_family_member(_group_id uuid)` returns boolean.

### 2. Razorpay Integration

Custom secrets to request from the user:
- `RAZORPAY_KEY_ID` (publishable, can also be embedded in frontend)
- `RAZORPAY_KEY_SECRET` (server-only)
- `RAZORPAY_WEBHOOK_SECRET` (server-only, for webhooks)

Edge Functions:

#### `razorpay-create-order`
- Authenticated only.
- Accepts `plan_slug` (`premium` or `family`).
- Creates a Razorpay order for the correct INR amount.
- Stores the order ID against the user in `user_subscriptions` (status `pending`).
- Returns `{ order_id, amount, currency: 'INR', key_id }`.

#### `razorpay-verify-payment`
- Authenticated only.
- Accepts `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`.
- Verifies Razorpay signature using HMAC SHA256.
- On success: activates subscription, sets `expires_at = now() + 1 month`, updates `profiles.plan_slug`.
- For Family plan: creates `family_groups` row.
- Returns `{ success: true, plan: ..., expires_at: ... }`.

#### `razorpay-webhook`
- `verify_jwt = false` (Razorpay calls it directly).
- Verifies Razorpay webhook signature.
- Listens for `payment.captured` and `subscription.cancelled` (future) events.
- Updates `user_subscriptions` status accordingly.

### 3. Client-Side Changes

New components / pages:
- `src/pages/Pricing.tsx` — plan comparison, Razorpay Checkout button.
- `src/components/UpgradeBanner.tsx` — shown on Health Card when free limits are approached or exceeded.
- `src/components/FamilyManager.tsx` — invite members, view family seats (Family plan only).
- `src/hooks/useSubscription.ts` — reads profile plan + subscription status.
- `src/lib/razorpay.ts` — loads Razorpay Checkout script and opens payment modal.

Modified files:
- `src/App.tsx` — add `/pricing` route.
- `src/pages/Index.tsx` — show upgrade CTA and plan badge in header; redirect to `/pricing` when document limit is hit.
- `src/components/PatientRegistrationForm.tsx` — block document upload beyond free limit unless paid.
- `src/components/HealthCardPreview.tsx` — show current plan badge, upgrade prompt if free, family management if family plan.

### 4. Free-Tier Enforcement

- Document upload: count existing `patients.documents` length. If >= 5 and plan is free, show upgrade modal instead of upload.
- Family profiles: only available when `effective_plan` returns `family`. Free/Premium users see single-profile UI.
- Soft gates first: warn at 4 documents, hard block at 5.

### 5. Security & Privacy

- `user_subscriptions` RLS: owners can read/update their own rows; no public access.
- `family_groups` / `family_members` RLS: owner-only management; members can read their own membership.
- All Razorpay signature verification happens in edge functions; frontend never sees `RAZORPAY_KEY_SECRET`.
- Webhook endpoint is idempotent: duplicate events update the same row safely.
- Document-limit checks run server-side in upload edge function and database function; client-side check is UX-only.

### 6. Implementation Phases

Because family-plan invitations add significant UX complexity, I recommend shipping in two phases:

#### Phase 1: Freemium + Premium (revenue-ready faster)
1. Schema: `subscription_plans`, `user_subscriptions`, extend `profiles`.
2. Razorpay order + verify + webhook edge functions.
3. Pricing page and upgrade flow.
4. Free-tier document limit enforcement.

#### Phase 2: Family Plan
1. Schema: `family_groups`, `family_members`.
2. Family invitation flow (email link → signup → auto-join group).
3. Family manager UI.
4. Effective-plan logic that grants premium benefits to family members.

### 7. Razorpay Setup Required from You

Before Phase 1 can go live, you will need:
1. A Razorpay account (test mode first).
2. API Keys page → copy **Key ID** and **Key Secret**.
3. Webhooks page → add endpoint URL (I will provide after deploying the webhook function) and subscribe to `payment.captured`.
4. Copy the webhook secret into the app secrets.

I will request these via the secure secret form once the infrastructure is deployed.

### 8. Success Metrics to Track

- Free-to-paid conversion rate.
- Documents uploaded per free user at the point of upgrade.
- Family plan invite acceptance rate.
- Churn after first month.

## Open Questions

1. Should free users see the Premium/Family pricing before signing up, or only after they have created their first health card?
2. Do you want a 7-day free trial for Premium/Family, or pay-first from day one?
3. For Family invitations, should invites be sent by email (requires email connector) or by sharing an invite code/link?

Once you confirm these, I will create the detailed build plan and start implementation.