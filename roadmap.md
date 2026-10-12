# Medora security upgrade roadmap

## Phase 1 — critical security (verified 2026-10-11)
- [x] Edge functions: login + owner check + folder boundary; generic errors
- [x] Emergency page shows only name, blood group, allergies, conditions, emergency contact
- [x] Reports never public: open only with a patient-set PIN; typed phone never unlocks
- [x] No patient.id fallback in any QR
- [x] Audit/log tables: client write grants revoked
- [x] Duplicate storage rules removed
- [ ] Old-QR-after-rotation live test (not run: would break the owner's printed QR)

## Phase 2 — data security (verified)
- [x] Server-only plans/subscriptions/seats/card price fields
- [ ] Clinician identity verification (blocked: needs external ID/OTP provider)
- [ ] Payments for paid plans (blocked: no payment provider)
- [ ] Family member view of another member's records (not built; must use family_can_access)

## Phase 3 — AI safety
- [x] Provenance, conflicts, sources, "not found" message, conflict decisions audited
- [ ] Adversarial prompt-injection document test (not run)

## Phase 4 — structured records & timeline (verified)
- [x] documents / medications / lab tables, backfill, path-checked one-way sync
- [x] Timeline with View original, error/empty states, lab disclaimer

## Phase 5 — privacy center, access history, emergency screen polish (not started)
