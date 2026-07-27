
## The problem

Right now the QR code encodes just the patient's internal ID (`patient.id`). Scanning it doesn't open anything, and even if it did, there's no public page that shows their documents. So a printed card from last month has no way of surfacing the 10 new files uploaded today.

## The fix in one line

Make the QR a **stable public link** that, when scanned, calls the server and returns the **latest** vitals + **all current documents** from the database — not a snapshot baked into the QR.

Because the QR encodes only a link (not the documents themselves), the printed card never goes stale. Upload a new report at 2 pm → doctor scans the same old QR at 3 pm → sees it.

## What a doctor will see when scanning

Per your answers: full record + all current documents, and old printed QRs keep working until the patient revokes them.

Emergency page `/e/:token` (no login required):

- Header: "Emergency Medical Info" + patient name
- Blood group, DOB, gender, height/weight
- Allergies (highlighted red)
- Chronic conditions
- Emergency contact number (tap-to-call)
- **All uploaded documents** — each opens via a fresh short-lived signed URL, generated at scan time so it always reflects what's in storage right now
- Small "Report misuse / Revoke" link the patient can use later

## How the "always current" guarantee works

```text
Printed QR  ──►  https://medora.app/e/<share_token>
                        │
                        ▼
                 emergency-lookup edge function
                        │  (service role, read-only)
                        ▼
                 patients row (live)  ──►  documents[]  ──►  fresh signed URLs
```

The QR is just a pointer. The document list is fetched live every scan.

## Patient controls

On the health card screen, add two actions:

- **Revoke emergency access** — sets `share_revoked = true`. Scans return "This link has been revoked by the patient."
- **Rotate link** — generates a new `share_token`, prints a new QR. Old QR keeps working *unless* the patient also toggles revoke (your choice: default is old-QR-still-works).

## Technical section

### 1. Schema (migration)

Add to `public.patients`:

- `share_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE` — the value embedded in the QR
- `share_revoked boolean NOT NULL DEFAULT false`

New audit table `public.emergency_access_logs`:

- `id`, `patient_id`, `accessed_at`, `ip_hash text`, `user_agent text`
- RLS: only the owner can `SELECT` their own logs (so patient can see "your card was scanned 3 times this week")
- Standard GRANTs (authenticated + service_role)

Trigger on insert: keep the existing `enforce_patient_owner` behavior; `share_token` fills from the column default.

Backfill: `share_token` gets a default value, so the existing single patient row will pick one up automatically on migration (the `DEFAULT` fires for new rows; add `UPDATE patients SET share_token = gen_random_uuid() WHERE share_token IS NULL` inside the migration to be safe before setting NOT NULL).

### 2. Edge function `emergency-lookup`

- Public (`verify_jwt = false`)
- Input: `{ token: string }` (validated with Zod, UUID format)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to read one patient row by `share_token` where `share_revoked = false`
- For every entry in `documents[]`, creates a fresh 5-minute signed URL from the `patient-documents` bucket
- Writes one row into `emergency_access_logs` (hashed IP, no raw PII)
- Returns: `{ patient: {name, dob, gender, blood_group, height, weight, allergies, chronic_conditions, emergency_contact}, documents: [{name, url, uploaded_at}] }`
- Returns 404 for unknown/revoked tokens (no info leak)
- CORS enabled

### 3. Public route `/e/:token`

- New page `src/pages/Emergency.tsx`, added to `App.tsx` routes above the catch-all
- Calls the edge function, renders the emergency view described above
- Uses the same visual language as the health card, with a clear red "EMERGENCY MEDICAL INFO" band so the doctor knows what they're looking at
- No auth guard; deliberately public because the whole point is scan-and-view

### 4. QR value change

In `src/components/HealthCard.tsx`:

```ts
value={`${window.location.origin}/e/${patient.share_token}`}
```

Any card the user prints from this point on carries the new URL. If they still have the previous card in their wallet, it encoded a bare UUID and was never functional as a scan target — nothing to migrate.

### 5. Patient controls in `HealthCardPreview`

Two new buttons: "Revoke emergency link" and "Rotate link". Both call small mutations on the `patients` table (owner-only RLS already covers this).

### 6. Types

After the migration runs, the generated types pick up `share_token` / `share_revoked` automatically — the code changes in steps 3–5 come after that.

## Privacy note

This is a real change to the earlier "no one but the owner sees documents" rule — you've explicitly chosen to allow anyone holding the QR to see everything, because that's what saves lives at an accident scene. Mitigations included: revocable link, rotate link, access logs visible to the patient, short-lived signed URLs (~5 min), no listing/enumeration (unknown tokens return 404).
