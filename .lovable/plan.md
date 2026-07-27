# Plan: Twilio OTP Phone Verification for Medora

## Goal
Connect a Twilio account so the app can send SMS one-time passcodes (OTPs) to verify patient phone numbers during registration.

## Current state (verified)
- `public.phone_otp_codes` table exists with `phone_number`, `code_hash`, `expires_at`, `attempts`, `verified_at`.
- Table is locked down: RLS enabled, no anon/authenticated grants, service-role only.
- No edge function currently sends or verifies OTPs.
- No OTP UI step in `PatientRegistrationForm`.
- Twilio connector is available in the workspace; no connections exist yet.

## Plan

### 1. Connect Twilio
- Call `standard_connectors--connect` with `connector_id: twilio`.
- The connect card will let you create or pick a Twilio connection and link it to the project.
- After linking, project env vars (e.g. `TWILIO_API_KEY`) will be available for the edge function.
- Recommended: enable Twilio SMS Pumping Protection and geo-restrict destination countries to India (since the app validates Indian 10-digit mobile numbers).

### 2. Edge function: `send-phone-otp`
Create `supabase/functions/send-phone-otp/index.ts`:
- Validate request body with Zod (`phone` must match `^[6-9]\d{9}$`).
- Verify the caller is authenticated via `supabase.auth.getClaims()`.
- Generate a 6-digit numeric code.
- Hash the code with bcrypt/scrypt and insert a row into `phone_otp_codes` with a 10-minute expiry and IP address.
- Rate-limit: one code per phone number per 60 seconds; max 5 attempts per code.
- Send the plain code via Twilio SMS through the Lovable connector gateway:
  - `POST https://connector-gateway.lovable.dev/twilio/Messages.json`
  - Headers: `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${TWILIO_API_KEY}`, `Content-Type: application/x-www-form-urlencoded`
  - Body: `To=+91<phone>`, `From=<Twilio sender number>`, `Body=Your Medora verification code is: <code>`
- Return `{ success: true }` to the client (never return the code).

### 3. Edge function: `verify-phone-otp`
Create `supabase/functions/verify-phone-otp/index.ts`:
- Validate request body with Zod (`phone`, `code`).
- Verify caller is authenticated.
- Look up the most recent unexpired code for the phone number from `phone_otp_codes`.
- Constant-time compare the submitted code against `code_hash`.
- Increment `attempts`; fail after 5 attempts.
- On success, set `verified_at` and return `{ verified: true }`.
- On failure, return `{ verified: false, error: "Invalid or expired code" }`.

### 4. Frontend OTP step
Update `src/components/PatientRegistrationForm.tsx`:
- After step 1 (personal details including phone), add a new OTP verification step before step 2.
- When the user proceeds from step 1, call `send-phone-otp` and show:
  - a 6-digit `InputOTP` component,
  - a resend timer (60 s),
  - a "Verify" button.
- On successful verification, advance to the original step 2 (emergency/contact info).
- Block progression if verification fails or expires.

### 5. Form submission guard
- Before inserting into `patients`, ensure `phone_number` has a `verified_at` record in `phone_otp_codes` within the last 10 minutes.
- This can be checked client-side by keeping a verified flag in component state, or server-side in a future hardening pass. For this plan we will keep verified state in the form and pass it to the insert path.

### 6. Testing & verification
- Type-check the project.
- Deploy the two new edge functions.
- Test the happy path with a real phone number after Twilio is connected.
- Verify that:
  - unauthenticated requests are rejected,
  - expired codes fail,
  - brute-force attempts are capped,
  - the code is never logged or returned to the client.

## Files to create / modify
- Create `supabase/functions/send-phone-otp/index.ts`
- Create `supabase/functions/verify-phone-otp/index.ts`
- Modify `src/components/PatientRegistrationForm.tsx`
- Possibly modify `src/types/patient.ts` if a `phoneVerified` field is added to form state

## Out of scope
- WhatsApp OTP (Twilio WhatsApp requires a separate sender and business approval).
- Email OTP (not requested).
- Changing the existing `patients` schema beyond the verification flag.

## Approval needed
Please confirm and I will start with the Twilio connection, then build the edge functions and UI step.