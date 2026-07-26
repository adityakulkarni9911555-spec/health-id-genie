## Goal
Harden the full consumer flow — sign-up/sign-in → patient record writes → document uploads → session persistence — so there is no weak link end-to-end.

## Current state (verified from context)
- Auth: email/password + Google via Supabase; session in `localStorage`, auto-refresh on.
- `patients` RLS: owner-only select/insert/update, no delete. Good, but `owner_id` is nullable.
- `profiles` RLS: owner-only. Good.
- `patient-documents`: private bucket, files pathed as `userId/patientId/...`, accessed via signed URLs. No storage.objects RLS policies confirmed.
- `phone_otp_codes`: no RLS policies listed — likely exposed to Data API if grants exist.
- Leaked-password (HIBP) protection: not confirmed enabled.
- Client validation exists in the registration form; no schema-level length caps on `patients` text columns.
- Legacy staff RPCs (`staff_get_patient`, `staff_update_patient_safe_fields`, `is_staff`, `patient_edit_logs`, `user_roles`) still exist in the DB even though the staff UI was removed — extra attack surface for a consumer-only app.

## Plan

### 1. Lock down `patients` ownership
- Make `patients.owner_id` `NOT NULL` after backfilling any orphan rows to prevent RLS-bypass via null owner.
- Add a `BEFORE INSERT` trigger that forces `owner_id = auth.uid()` so a client cannot spoof another user's ID even if RLS check were ever loosened.
- Add reasonable length CHECK constraints on `full_name`, `phone_number`, `emergency_contact`, `insurance_provider`, `policy_number`, `tpa_contact` to block oversized payload abuse.

### 2. Storage bucket policies (documents)
- Add explicit RLS policies on `storage.objects` for bucket `patient-documents`:
  - SELECT/INSERT/UPDATE/DELETE only when `(storage.foldername(name))[1] = auth.uid()::text`.
- Keep bucket private; continue using short-lived signed URLs (already implemented).
- Add file-type + size validation client-side in `DocumentUpload.tsx` (allow-list: pdf/jpg/png/webp; max ~10 MB) as defence-in-depth.

### 3. Remove dead staff/role surface
- Drop unused objects: `staff_get_patient`, `staff_update_patient_safe_fields`, `is_staff`, `has_role`, `user_roles`, `patient_edit_logs`, and `app_role` enum. Fewer SECURITY DEFINER functions = smaller attack surface.

### 4. Phone OTP table hardening
- Enable RLS on `phone_otp_codes` and add zero client policies (service-role only). Revoke anon/authenticated grants.
- (Table is unused by any UI yet, but leaving it open is a leak risk.)

### 5. Auth configuration
- Enable HIBP leaked-password check via `configure_auth`.
- Confirm anonymous sign-ups are off; keep auto-confirm email on (already the product choice).
- Keep session persistence (`localStorage`, auto-refresh) — consistent with "remember me forever" product decision. Document the trade-off in code comments.

### 6. Client trust boundaries
- In `useAuth`, additionally call `supabase.auth.getUser()` before treating the session as authoritative for any write flow (getSession only decodes local JWT).
- Add zod validation at submit time in `PatientRegistrationForm.tsx` mirroring the new DB CHECK limits, with trimmed inputs and phone digit-only normalisation.
- Never log form data or tokens; scrub existing `console.log` calls in auth/upload paths.

### 7. Verification
- Run `supabase--linter` after migrations; fix any new warnings.
- Manual smoke test: sign up → register patient → upload doc → sign out → sign back in → confirm record + signed-URL document open; attempt to insert a patient with a different `owner_id` and confirm it is rejected.

## Technical details
- One SQL migration covers sections 1, 3, 4, plus storage.objects policies from section 2.
- Frontend edits: `DocumentUpload.tsx`, `PatientRegistrationForm.tsx`, `useAuth.ts`.
- Auth settings via `supabase--configure_auth` (HIBP on).
- No user-facing UI change; purely security hardening.
