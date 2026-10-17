# Medora security upgrade roadmap (verified 2026-10-13)

## Phase 1 — critical security
- [x] Edge functions: login + owner check + folder boundary; generic errors (live negative tests)
- [x] Public emergency data limited to name, blood group, allergies, conditions, emergency contact
- [x] Reports never public: only with a patient-set PIN; typed phone never unlocks
- [x] QR only ever encodes a share token (card, PDF, printed preview); no patient.id fallback
- [x] Rotation invalidates old token, logs + audits (rollback-safe test)
- [x] Audit/log tables append-only for clients; duplicate storage rules removed
- [ ] Verified clinician identity (blocked: needs external registry/OTP provider)

## Phase 2 — data security & entitlements
- [x] Plan/subscription/seat/card price fields server-only; free 5-document limit enforced in DB
- [x] Family access grants nothing without explicit scope (family_can_access tested)
- [ ] Paid plans / paid card orders (blocked: no payment provider; orders stay free "coming soon")
- [ ] Clinician request/approval flow (blocked on identity provider; no endpoint grants clinician access)

## Phase 3 — AI safety & provenance
- [x] Prompt-injection test with synthetic document: injected medicine, blood group and prompt leak all ignored
- [x] Conflicts flagged, never overwritten; decisions audited (rollback-safe test)
- [x] Search cites sources, returns "not found" without guessing; removed documents never cited

## Phase 4 — structured records & timeline
- [x] Migrations 0004–0008 applied in live database (9 recorded)
- [x] Backfill complete: 0 missing, 0 orphaned document rows
- [x] Medicines and lab results populate with source, dates, page, verification status
- [x] Document removal deletes only AI_EXTRACTED rows + search snippets; verified rows kept
- [x] Timeline reads real records, View original, loading/empty/error states, mobile checked

## Phase 5 — privacy center, access history, emergency screen polish (verified)
- [x] (2026-10-15) Typecheck, ESLint (changed files) and production build exit 0; Emergency.tsx lint errors fixed (types only)
- [x] (2026-10-15) Signed out, desktop + phone: /privacy redirects to sign-in, Privacy button hidden, invalid QR shows "link not available"; only console errors are dev-only ref warnings and the expected 400 for the invalid code
- [x] (2026-10-15) Signed in as the owner (preview session), desktop + phone: /privacy shows QR active + PIN set from live data and 34 real access-history entries (AI analyses, scans, wrong PIN, clinical request); no data writes sent; only console errors are dev-only ref warnings
- [x] (2026-10-16) Signed in as the owner, desktop: printed-card section shows "Coming soon" and the "Order a printed card" button is disabled; only request sent was the read-only PIN-status check (no writes)

## Timeline clarity (2026-10-17)
- [x] Monthly document grouping, document-type icons, clearer date/source labels, accessible tabs, 56px controls, and loading placeholders in HealthTimeline.tsx; existing queries and write actions preserved.
- [x] ESLint for HealthTimeline.tsx exit 0 with no warnings; automatic preview build reports build OK.
- [x] Existing owner session: read-only desktop/mobile navigation verified real timeline and all three tabs; no page runtime errors or mobile horizontal overflow. No forms submitted, records modified, or documents opened. Empty/error states not exercised.
- [ ] Phase 2 remains blocked on real payment and clinician identity providers.
