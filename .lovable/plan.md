# Medora Pitch Deck for Unstop Submission

## Cover page

- Team Name: Medora
- College: Bhavan's Hazarimal Somani College
- Contact Email: aa3095517@gmail.com
- Team members: Aryan Singh, Lathick Chitla
- Medora logo, tagline "Your Personal Health Wallet", Ideathon/event line

Produce a judge-ready pitch deck PDF (A4 landscape, 13 pages, well under 15) using Medora's real branding and live app screenshots, delivered as a downloadable file.

## Cover page (single page)

- Team Name: Medora
- College: Bhavan's Hazarimal Somani College
- Contact Email: aa3095517@gmail.com
- Team members: Aryan Singh, Lathick Chitla
- Medora logo, tagline "Your Personal Health Wallet", Ideathon/event line

## Deck outline (13 pages)

1. Cover — team name, college, email, team members, logo, tagline
2. The problem — records scattered, emergencies without medical history
3. Who it hurts — patients, families, emergency responders (with data points framed as estimates)
4. Solution — Medora personal health wallet, one-line pitch + hero screenshot
5. How it works — 3 steps: register, upload/scan, share QR (flow diagram)
6. Product walkthrough 1 — registration + health card screenshots
7. Product walkthrough 2 — wallet, document upload, camera scan screenshots
8. Emergency QR — always-current share token, clinician one-page view screenshot
9. AI layer — smart document reading, natural-language record search
10. Built for real conditions — offline-first sync, low-battery/device-heat power saving, tablet/mobile UI
11. Privacy & security — owner-only access, RLS, private storage, expiring document links
12. Business model — Free / Premium / Family tiers with limits (from the live pricing page)
13. Ask & roadmap — support requested, next 6-12 months, target reach

## Technical approach

- Capture fresh screenshots of the live app (auth/landing, wallet + health card, document upload, emergency page, pricing) via Playwright at a clean viewport into `/tmp`.
- Build an HTML slide template using Medora's existing tokens (purple-indigo primary, teal accent, Plus Jakarta Sans/Inter) and render to PDF with Playwright at A4 landscape, one page per slide.
- Only claims already implemented in the app go into the deck; forward-looking items are labelled roadmap.
- Save as `/mnt/documents/Medora_Pitch_Deck.pdf` and surface it as a downloadable artifact.

## Quality check

- Convert every page to an image and inspect all 14 for overflow, clipped text, missing screenshots, contrast, and ordering; fix and re-render until clean.
- Confirm page count <= 15 and file size well under typical upload limits.

No app source files change — this is a document deliverable only.
