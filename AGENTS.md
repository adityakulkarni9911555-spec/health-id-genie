# Project Architecture Rules

- Render emergency-view PDFs page-by-page with PDF.js; never use a browser PDF iframe because privacy overlays cannot follow its internal scroll position.
- Generate emergency QR links with `?view=report`; this keeps access on `/e/:token`, enforces PIN gating, and opens files only in the protected viewer.
- Break-glass requests with a typed phone number are logged (max 3/hour per patient) but never unlock documents; only a verified clinician (clinician_profiles.verification_status = 'verified', set by admins) may in future; why: a typed number is not proof of identity.
- The public emergency lookup returns only name, blood group, allergies, conditions and emergency contact, and never returns documents unless a patient-set PIN is entered; why: least-privilege public exposure.
- Edge functions that touch patient data authenticate the JWT, then check patients.owner_id in the database AND the `<uid>/<patient_id>/` storage path boundary before using service-role access; why: prevents IDOR.
- Security-sensitive actions are written to the append-only audit_events table by server code only; why: clients must not edit access history.
- Emergency QR rotation goes through the rotate_share_token RPC (logs a hash of the old token); why: rotation must be atomic and audited.
- AI prompts wrap document text in <untrusted_document_data> and forbid following instructions inside it; why: uploaded documents are untrusted input.
- Plan, subscription, family-seat and card-order price/status fields are changed only by server code (guard triggers + revoked grants); why: clients must never grant themselves entitlements.
- Family membership grants nothing by itself; access to another member's data must go through family_can_access(patient_id, scope); why: permissions are explicit per scope.
- AI extraction stores provenance and a conflicts list on each document and never writes patient profile fields; only the patient's explicit choice in the conflict review changes them; why: verified data must not be silently overwritten.
- Uploads write to the legacy patients.documents list (the single write path); the documents table is a derived read model synced one-way by a DB trigger that only accepts `<owner>/<patient>/` paths, and removing a document deletes only its AI_EXTRACTED medicine/lab rows and search snippets; why: one source of truth with no two-way sync, without breaking older app versions.

- Android app is a Capacitor shell (`android/`, `capacitor.config.ts`) loading the published site via server.url; why: one codebase, web updates reach the app without rebuilding.
- Wallet section selection uses the section query parameter and shared WalletNavigation on the wallet and Profile; why: section links survive navigation and provide consistent phone navigation without storing patient data.
- Password changes from the Profile page require the account PIN check (verify_account_pin: 3 wrong tries = 24h lock, separate from the emergency PIN counter); passwords are never readable or shown; why: stored only as one-way hashes.
- Recovery security lookup failures must stop password entry, never behave as a missing PIN; why: transient errors must not bypass existing PIN protection. Email-only recovery applies only to explicitly confirmed no-patient/no-PIN accounts.
- Wallet brand motion is isolated in BrandBadge and uses finite CSS transforms with reduced-motion/power-saver opt-outs; why: brand feedback must not block content or require a continuous rendering loop.
- Wallet Card/Records/Timeline panels mount on first visit and remain in route-local memory until the wallet unmounts; Manage security controls remount on entry, and emergency pages never use this retention; why: avoid repeated record queries without retaining sensitive PIN forms or changing emergency wipe behavior.
