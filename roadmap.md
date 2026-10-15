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

## Phase 5 — privacy center, access history, emergency screen polish (not started)
- [x] (2026-10-15) Typecheck, ESLint (changed files) and production build exit 0; Emergency.tsx lint errors fixed (types only)
- [x] (2026-10-15) Signed out, desktop + phone: /privacy redirects to sign-in, Privacy button hidden, invalid QR shows "link not available"; only console errors are dev-only ref warnings and the expected 400 for the invalid code
- [ ] Signed-in browser check of /privacy access history (not run this session)
