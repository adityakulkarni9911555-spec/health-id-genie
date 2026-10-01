# Protected Emergency QR Flow

## Goal
Make every emergency QR open the protected report journey rather than any raw file link, while keeping PIN protection and life-critical information available.

## Changes
- Add a protected-report intent to generated emergency QR links.
- On the emergency page, automatically open the first report inside the protected viewer when documents are available.
- If reports are PIN-locked, focus the PIN panel first and open the protected viewer immediately after a successful unlock.
- Keep blood group, allergies, conditions, and emergency contact available behind the viewer when it is closed.
- Never navigate to a signed storage URL directly from the emergency flow.

## Verification
- Upload a synthetic two-page lab PDF through the signed-in health card.
- Set or change the four-digit report PIN.
- Open the QR destination in a fresh unsigned browser context.
- Unlock the report, verify the protected viewer opens, scroll between PDF pages, and confirm each page keeps its identity shield while the forensic watermark remains visible.
- Confirm no raw document URL becomes the browser address and check preview errors afterward.

## Technical details
- Preserve `/e/:token` as the only public route; use a query parameter to request protected report opening.
- Continue rendering PDFs page-by-page with PDF.js so privacy overlays remain attached to report pages.
