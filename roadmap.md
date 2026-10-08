# Medora security upgrade roadmap

## Phase 1 — critical security (done)
- [x] extract-document: login + owner check + folder boundary + prompt-injection guard
- [x] search-records: owner check before search, untrusted-data prompt, "not found" answer
- [x] emergency-lookup: typed phone no longer unlocks reports; requests + PIN attempts logged
- [x] audit_events (append-only), qr_rotation_logs, rotate_share_token, clinician_profiles foundation
- [x] Rotate Emergency QR uses audited server function
- [x] Removed unverified "DPDP" claims from emergency page and watermark
- [ ] Remove duplicate storage access rules (blocked: storage rules can't be edited from here; they are identical and harmless)

## Phase 2–5 (next)
## Phase 2 — data security (done)
- [x] Plans, subscriptions and family seats can only be changed server-side
- [x] Card order price/status/payment fields locked for customers
- [x] Family permission scopes + relationship, audited, owner-controlled
- [x] Expiring clinician access grants + owner revoke
- [ ] Clinician identity verification (blocked: needs external ID/OTP provider)
- [ ] Payments to activate paid plans (blocked: payments were removed; need a provider)
## Phase 3 — AI safety (done)
- [x] Extraction records model, time and AI_EXTRACTED / USER_VERIFIED status
- [x] Blood group / allergy mismatches flagged for review, never auto-overwritten
- [x] Search answers show sources, dates, View original, and "not found" message
- [ ] Documents/medications/lab tables + health timeline
- [ ] Privacy & Security Center, access history view, emergency screen polish
