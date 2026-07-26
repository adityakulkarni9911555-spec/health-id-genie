
## Goal

Let a patient create their own account, register once, and stay signed in on their device indefinitely. On return visits they land straight on their own health card — no re-login, no re-registration.

## Auth setup

- Enable email/password sign-in (Lovable Cloud Auth). Keep Google available as an optional second button on the auth page (already wired).
- Turn OFF "confirm email" so patients can sign up and use the app immediately (they're often on a clinic tablet with no email access).
- Session: use the default long-lived refresh token — auto-refreshed on every app open, so effectively permanent until the user taps "Sign out" or clears browser data.

## Data model

New `profiles` table (one row per auth user), linking an auth user to their patient record:

```text
profiles
  id            uuid  PK, references auth.users(id) on delete cascade
  patient_id    uuid  nullable, references public.patients(id)
  created_at    timestamptz
  updated_at    timestamptz
```

- Trigger on `auth.users` insert → auto-create empty `profiles` row.
- RLS: a user can only read/update their own profile row.

Tighten `patients` table RLS (currently fully public):
- Add nullable `owner_id uuid` column referencing `auth.users(id)`.
- Backfill existing rows with `NULL` (treated as legacy/anonymous).
- Replace the three "public" policies with:
  - `SELECT` / `UPDATE`: `auth.uid() = owner_id`
  - `INSERT`: `auth.uid() = owner_id` (owner_id must be set to the caller)
  - Keep `service_role` full access for edge functions / MCP tools.
- Storage bucket `patient-documents` policies: only the owner can read/write objects under their patient folder.

## App flow

1. **First visit** → redirect to `/auth`. Patient signs up with email + password (or Google). A profile row is created automatically.
2. **Registration form** (`/`) — same three-step form as today, but:
   - Requires an authenticated session (route guard).
   - On submit, sets `owner_id = auth.uid()` on the patient row and writes `patient_id` back into `profiles`.
   - If the profile already has a `patient_id`, skip the form and go straight to the health card view.
3. **Return visits** → session auto-restores, app checks `profiles.patient_id`:
   - Has patient → show their health card + "Edit details" option.
   - No patient yet → show the registration form.
4. **Sign out** button in the header for shared/clinic devices.
5. Offline queue keeps working; queued patient inserts stamp `owner_id` from the current session before syncing.

## MCP tools

The existing `list_patients` / `get_patient` / `register_patient` tools already act as the signed-in user. With RLS scoped to `owner_id`, each MCP user will automatically see only their own record — no code change needed beyond making sure `register_patient` stamps `owner_id = auth.uid()`.

## Files touched

- `supabase/migrations/*` — new migration for `profiles`, `patients.owner_id`, updated RLS, storage policies, signup trigger.
- `src/App.tsx` — add auth guard around `/`, redirect unauthenticated users to `/auth`.
- `src/pages/Index.tsx` — branch on `profiles.patient_id`: show card if exists, else show registration form; add "Sign out" in header.
- `src/pages/Auth.tsx` — keep, adjust post-signin redirect to `/`.
- `src/components/PatientRegistrationForm.tsx` — set `owner_id`, update `profiles.patient_id` after insert.
- `src/lib/offlineQueue.ts` — attach `owner_id` when flushing queued inserts.
- `src/lib/mcp/tools/register-patient.ts` — stamp `owner_id` from the caller's JWT.

## Out of scope

- Password reset emails (can be added later once a custom email domain is set up).
- Staff/admin roles — everyone is a patient for now.
- Merging existing anonymous `patients` rows into new accounts.
