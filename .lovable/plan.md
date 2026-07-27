## Problem

The printed/displayed QR code on the Medora Card fails to scan on most phones, even though the emergency link itself works when opened manually.

**Root cause (confirmed by reading `src/components/HealthCard.tsx`):**
- The QR encodes a long URL: `${window.location.origin}/e/${shareToken}` — on the preview/published Lovable domain the origin is ~50 chars, plus `/e/` + a 36-char UUID = ~90+ characters.
- It's rendered at `size={104}` with `level="H"` (highest error correction). That combo produces a very dense grid (~40×40 modules) squeezed into ~104 px on screen and printed even smaller on some layouts → phone cameras can't resolve the modules.
- The foreground color is `hsl(222, 40%, 12%)` (near-black but not pure), which slightly reduces scanner contrast on low-quality prints.
- There is no visible fallback URL under the QR, so a failed scan leaves the doctor with no way in.

## Fix

Keep behavior identical, only presentation/QR-encoding tweaks in `src/components/HealthCard.tsx`:

1. **Increase QR size** from `104` → `160` on screen, with a `print:` size bump so the printed version is at least ~180 px equivalent. Reflow the card so details column and QR still fit side by side on the card width.
2. **Lower error-correction** from `level="H"` → `level="M"`. Halves module density for the same URL, dramatically easier to scan. Emergency URLs don't need H-level resilience — they aren't printed on damaged surfaces.
3. **Pure black foreground** (`#000000`) on pure white background for maximum scanner contrast, both on screen and in print.
4. **Add a small human-readable fallback** under the QR: `medora → /e/XXXXXXXX` (first 8 chars of token) plus the full short code, so a doctor whose scanner fails can type it or the patient can read it out.
5. **Sanity check the emergency URL** — if `window.location.origin` includes a very long preview subdomain, that's the origin the QR encodes. No code change needed here (the runtime origin is correct), but the plan notes that once published to a short custom domain the QR becomes even easier to scan.

## Out of scope

- No changes to `emergency-lookup`, rate limiting, Turnstile, or the `Emergency` page — those already work.
- No database or share-token changes.

### Technical details

File touched: `src/components/HealthCard.tsx` only.
- `QRCodeSVG` props: `size={160}`, `level="M"`, `fgColor="#000000"`, `bgColor="#ffffff"`, keep `includeMargin={false}` but wrap in existing white padded container (already provides quiet zone via `p-2.5`).
- Layout: change the right column to `w-[180px]` so the QR + label fit; details column stays `flex-1 min-w-0`.
- Add `<p className="text-[10px] font-mono ...">/e/{shareToken?.slice(0,8)}</p>` under the existing shortId label.