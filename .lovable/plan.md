# Remove OTP + Strengthen Per-User Privacy

## Goals
1. Drop phone OTP verification entirely — each user signs up with their own email + password (already in place).
2. Guarantee that uploaded medical documents (PDFs, images) are strictly private to the owner. No one else — including builder/admin — can view them.

## Changes

### 1. Remove OTP flow
- `src/components/PatientRegistrationForm.tsx`: remove the "Verify phone" step; go back to a 3-step flow (Basics → Medical → Emergency/Insurance/Documents). Keep phone number field as plain input (still validated format), but no SMS verification.
- Delete edge functions: `supabase/functions/send-phone-otp/` and `supabase/functions/verify-phone-otp/`.
- Drop table `phone_otp_codes` via migration.
- Delete secret `DEV_OTP_MODE`.
- Leave Twilio connector linked (harmless) — no code references remain.

### 2. Password-based auth (already present)
- `src/pages/Auth.tsx` already supports email + password sign up / sign in. No change needed beyond copy tweaks (remove any OTP mentions).
- Confirm HIBP leaked-password check stays enabled.

### 3. Strict document privacy
- `patient-documents` bucket stays **private** (no public URLs).
- Re-verify Storage RLS policies on `storage.objects` so only `auth.uid() = (storage.foldername(name))[1]::uuid` can SELECT/INSERT/UPDATE/DELETE. Files are stored under `{user_id}/{patient_id}/...` — this scopes access to owner only.
- Access is always via short-lived signed URLs generated client-side by the signed-in owner (`getSignedDocumentUrl`, 10 min TTL). No server-side admin path exists.
- Document metadata in `patients.documents` (JSONB) is already protected by owner-only RLS on `patients`.
- Confirm no edge function or RPC reads documents on behalf of another user. (None currently exist.)

### Privacy guarantee note (for user)
- Even the app builder cannot view the files: the storage bucket is private, RLS restricts reads to the file owner's session, and there is no backend function that bypasses this. The only way to view a file is to be signed in as that user.

## Out of scope
- Encryption at rest beyond Supabase defaults (already AES-256 server-side).
- Client-side E2E encryption (can be a follow-up if desired).
