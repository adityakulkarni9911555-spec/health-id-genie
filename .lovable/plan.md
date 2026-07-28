## Problem

The QR code on the health card is built from `window.location.origin`. When the card is generated from the Lovable preview URL (`id-preview--*.lovable.app`), the QR points to that preview URL, which is behind Lovable's project auth gate. Anyone else scanning it sees the "Access denied — you do not have access to this project" screen.

Verified in code:
- `src/components/HealthCardPreview.tsx:50` — QR value uses `${window.location.origin}/e/${patient.shareToken}`
- `src/components/HealthCard.tsx:110` — same pattern, plus the human-readable fallback URL just below
- The published site is `https://health-id-genie.lovable.app`, and `/e/:token` is a public route served by the `Emergency` page and the `emergency-lookup` edge function.

## Fix

Always encode the QR (and the printed fallback URL) against the canonical **published** domain, not the current browser origin.

1. Add a tiny helper `src/lib/publicUrl.ts` that returns the public origin:
   - Default: `https://health-id-genie.lovable.app`
   - Overridable via `VITE_PUBLIC_SITE_URL` env var so future custom domains just work.
   - Export `publicEmergencyUrl(token)` for reuse.

2. Update `src/components/HealthCardPreview.tsx` and `src/components/HealthCard.tsx` to build the QR `value` and the short/fallback text from `publicEmergencyUrl(patient.shareToken)` instead of `window.location.origin`.

3. Leave copy-link / share behavior on the same helper so a link shared from the preview also points to the public site.

## Not changing

- No backend, schema, or edge-function changes — `/e/:token` already resolves against live data via `emergency-lookup`.
- No QR styling or size changes.
- Existing tokens remain valid; users do not need to regenerate their card. (Reprint recommended so the human-readable URL under the QR also updates, but the token itself is unchanged.)

## Verification

- Build passes.
- Playwright: render the wallet page, read the QR's `value` prop / rendered `<canvas>` data URL, and confirm it starts with `https://health-id-genie.lovable.app/e/`.
- Manually confirm the printed fallback text under the QR shows the same public host.
