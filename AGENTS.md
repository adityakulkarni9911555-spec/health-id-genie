# Project Architecture Rules

- Render emergency-view PDFs page-by-page with PDF.js; never use a browser PDF iframe because privacy overlays cannot follow its internal scroll position.
- Generate emergency QR links with `?view=report`; this keeps access on `/e/:token`, enforces PIN gating, and opens files only in the protected viewer.