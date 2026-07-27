## Problem

After picking a Google account and granting permission, the app reloads and the user ends up back at sign‑in instead of the home page. Two things combine to cause this:

1. `src/pages/Auth.tsx` passes `redirect_uri: ${window.location.origin}${next}` to `lovable.auth.signInWithOAuth("google", …)`. When `next = "/"` this becomes `${origin}/`, i.e. the protected home route. The Cloud auth docs are explicit: `redirect_uri` must be a full same‑origin *public* URL like `window.location.origin` or `${origin}/auth/callback` — never a protected route. Pointing it at `/` sends the user back through the OAuth broker into a guarded page before the Supabase client has finished hydrating the session from the URL hash.
2. `src/pages/Index.tsx` renders `<Navigate to="/auth" replace />` as soon as `authLoading` is `false` and `user` is `null`. On the return trip from Google, there is a brief window where the hash tokens exist but `onAuthStateChange` hasn't fired yet. The navigate strips the hash, Supabase never sets the session, and the user is thrown back to `/auth` — which then loops through Google again. Combined with the splash overlay this reads as "the app restarts".

## Fix

Keep this scoped to the auth surface — no backend changes.

1. **`src/pages/Auth.tsx`**
   - Always pass `redirect_uri: window.location.origin` to `lovable.auth.signInWithOAuth` (no path, no `next`), matching the Cloud OAuth guidance.
   - Store the intended `next` path in `sessionStorage` before initiating Google sign‑in.
   - Add an `onAuthStateChange` listener alongside the existing `getSession()` check so that when the session hydrates after the OAuth redirect, we navigate to the stored `next` (and clear it) instead of relying solely on the initial mount.

2. **`src/pages/Index.tsx`**
   - Don't redirect to `/auth` while the URL still contains an OAuth hash (`access_token=` / `code=`) — give the Supabase client a tick to consume it.
   - Subscribe to `onAuthStateChange` (via existing `useAuth`) so a late `SIGNED_IN` event re‑renders instead of bouncing to `/auth`.
   - Only `<Navigate to="/auth">` once `authLoading` is false, `user` is null, AND there is no auth hash/code in the URL.

3. **No changes** to `src/integrations/lovable/*`, edge functions, Supabase config, or the splash screen.

## Verification

- Build passes.
- Manual: sign out, click "Continue with Google", pick account, grant consent → lands on `/` with the health card / registration view, no bounce back to `/auth`.
- Email/password sign‑in still works unchanged.

## Technical notes

- `sessionStorage` (not `localStorage`) so a stale `next` from a previous tab doesn't hijack later sign‑ins.
- Sanitize the stored `next` the same way `sanitizeNext` does today — only same‑origin relative paths starting with a single `/`.
- The hash check in `Index.tsx` looks for `access_token=` or `?code=` substrings; that's enough to defer the redirect for the one render it takes Supabase to process the callback.
