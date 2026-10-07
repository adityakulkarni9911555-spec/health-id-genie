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
- [ ] Family permission scopes, clinician verification flow (needs external ID/OTP provider)
- [ ] AI provenance + conflict review, search citations UI
- [ ] Documents/medications/lab tables + health timeline
- [ ] Privacy & Security Center, access history view, emergency screen polish
