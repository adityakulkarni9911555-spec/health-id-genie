# Project Architecture Rules

- Render emergency-view PDFs page-by-page with PDF.js; never use a browser PDF iframe because privacy overlays cannot follow its internal scroll position.
- Generate emergency QR links with `?view=report`; this keeps access on `/e/:token`, enforces PIN gating, and opens files only in the protected viewer.
- Emergency documents use a break-glass override: clinician phone is logged server-side (max 3/hour per patient) and stamped into the watermark; why: doctors must reach reports without a PIN while keeping accountability.
