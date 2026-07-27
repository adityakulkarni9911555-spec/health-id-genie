## Root cause

Both `send-phone-otp` and `verify-phone-otp` boot successfully but never register an HTTP handler, so every request hangs until the runtime idle-shuts the worker. Logs confirm it: repeated `booted` / `shutdown` entries with zero request lines.

Two bugs in each file cause this:

1. **No HTTP listener registered.** The functions use `export default async (req) => {...}`. Supabase Edge Runtime (Deno) only serves requests when the handler is registered via `Deno.serve(handler)`. A bare default export is never invoked, so requests wait forever.
2. **Broken cors import.** Both files import `corsHeaders` from `npm:@supabase/supabase-js@^2.89.0/cors`. That subpath does not exist in the npm package (it exists only on the Deno `esm.sh` build referenced in older docs). Module resolution failure can also stall cold-start. `corsHeaders` should be defined inline in the file.

## Fix

Edit both `supabase/functions/send-phone-otp/index.ts` and `supabase/functions/verify-phone-otp/index.ts`:

- Remove the `npm:@supabase/supabase-js@^2.89.0/cors` import.
- Define `corsHeaders` inline at the top of each file:
  ```ts
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  ```
- Replace `export default async (req: Request) => { ... }` with `Deno.serve(async (req) => { ... })` so the runtime binds a listener.
- Keep all existing OTP logic, Twilio gateway calls, and DB writes unchanged.

## Verify

1. Redeploy both functions.
2. Call `send-phone-otp` with the logged-in preview session and a valid phone. Expect either `{ success: true }` or a specific error status (401/400/503) within a second — no more timeouts.
3. Check `edge_function_logs` for real request lines (method, status) instead of only `booted`/`shutdown`.
4. Run the registration flow in the browser: send OTP → receive SMS (Twilio) → verify code → advance to step 3.

## Out of scope

No UI changes; the frontend already speaks the correct request/response shape. Twilio connector setup is already done.