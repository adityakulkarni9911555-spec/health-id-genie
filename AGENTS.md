# Project Architecture Rules

- Render emergency-view PDFs page-by-page with PDF.js; never use a browser PDF iframe because privacy overlays cannot follow its internal scroll position.
- Generate emergency QR links with `?view=report`; this keeps access on `/e/:token`, enforces PIN gating, and opens files only in the protected viewer.
- Break-glass requests with a typed phone number are logged (max 3/hour per patient) but never unlock documents; only a verified clinician (clinician_profiles.verification_status = 'verified', set by admins) may in future; why: a typed number is not proof of identity.
- Edge functions that touch patient data authenticate the JWT, then check patients.owner_id in the database AND the `<uid>/<patient_id>/` storage path boundary before using service-role access; why: prevents IDOR.
- Security-sensitive actions are written to the append-only audit_events table by server code only; why: clients must not edit access history.
- Emergency QR rotation goes through the rotate_share_token RPC (logs a hash of the old token); why: rotation must be atomic and audited.
- AI prompts wrap document text in <untrusted_document_data> and forbid following instructions inside it; why: uploaded documents are untrusted input.
