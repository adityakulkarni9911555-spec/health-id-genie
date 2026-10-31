# Medora security upgrade roadmap (verified 2026-10-13)

## Android screen integration (2026-10-31)
- [ ] Match system status/navigation bars to the current theme, keep web content outside phone system bars, and check compact wallet layout.
- [ ] Installed-phone verification requires a rebuilt APK and authorised publication of web changes.

## Phase 1 — critical security
- [x] Edge functions: login + owner check + folder boundary; generic errors (live negative tests)
- [x] Public emergency data limited to name, blood group, allergies, conditions, emergency contact
- [x] Reports never public: only with a patient-set PIN; typed phone never unlocks
- [x] QR only ever encodes a share token (card, PDF, printed preview); no patient.id fallback
- [x] Rotation invalidates old token, logs + audits (rollback-safe test)
- [x] Audit/log tables append-only for clients; duplicate storage rules removed
- [ ] Verified clinician identity (blocked: needs external registry/OTP provider)

## Phase 2 — data security & entitlements
- [x] Plan/subscription/seat/card price fields server-only; free 5-document limit enforced in DB
- [x] Family access grants nothing without explicit scope (family_can_access tested)
- [ ] Paid plans / paid card orders (blocked: no payment provider; orders stay free "coming soon")
- [ ] Clinician request/approval flow (blocked on identity provider; no endpoint grants clinician access)

## Phase 3 — AI safety & provenance
- [x] Prompt-injection test with synthetic document: injected medicine, blood group and prompt leak all ignored
- [x] Conflicts flagged, never overwritten; decisions audited (rollback-safe test)
- [x] Search cites sources, returns "not found" without guessing; removed documents never cited

## Phase 4 — structured records & timeline
- [x] Migrations 0004–0008 applied in live database (9 recorded)
- [x] Backfill complete: 0 missing, 0 orphaned document rows
- [x] Medicines and lab results populate with source, dates, page, verification status
- [x] Document removal deletes only AI_EXTRACTED rows + search snippets; verified rows kept
- [x] Timeline reads real records, View original, loading/empty/error states, mobile checked

## Phase 5 — privacy center, access history, emergency screen polish (verified)
- [x] (2026-10-15) Typecheck, ESLint (changed files) and production build exit 0; Emergency.tsx lint errors fixed (types only)
- [x] (2026-10-15) Signed out, desktop + phone: /privacy redirects to sign-in, Privacy button hidden, invalid QR shows "link not available"; only console errors are dev-only ref warnings and the expected 400 for the invalid code
- [x] (2026-10-15) Signed in as the owner (preview session), desktop + phone: /privacy shows QR active + PIN set from live data and 34 real access-history entries (AI analyses, scans, wrong PIN, clinical request); no data writes sent; only console errors are dev-only ref warnings
- [x] (2026-10-16) Signed in as the owner, desktop: printed-card section shows "Coming soon" and the "Order a printed card" button is disabled; only request sent was the read-only PIN-status check (no writes)

## Timeline clarity (2026-10-17)
- [x] Monthly document grouping, document-type icons, clearer date/source labels, accessible tabs, 56px controls, and loading placeholders in HealthTimeline.tsx; existing queries and write actions preserved.
- [x] ESLint for HealthTimeline.tsx exit 0 with no warnings; automatic preview build reports build OK.
- [x] Existing owner session: read-only desktop/mobile navigation verified real timeline and all three tabs; no page runtime errors or mobile horizontal overflow. No forms submitted, records modified, or documents opened. Empty/error states not exercised.
- [ ] Phase 2 remains blocked on real payment and clinician identity providers.

## Referral link on the public emergency page (2026-10-19)
- [x] Added a tasteful "Create your own free Medora card" link (plus one line explaining what Medora is) in the privacy footer of src/pages/Emergency.tsx, below "Close & wipe from this device"; links to "/"; no other behavior changed.
- [x] Typecheck (bunx tsgo), ESLint on Emergency.tsx, and production build all exit 0.
- [x] Read-only browser check on a real emergency page, desktop + phone: link visible, href "/", 56px touch target, no page errors. No forms submitted, records modified, or documents opened.

## SEO fixes (2026-10-20)
- [x] Public homepage at "/" for signed-out visitors (src/pages/PublicHome.tsx) with visible h1 "Your personal health wallet", product copy, CTA buttons, and links to existing guides; Index.tsx renders it instead of redirecting to /auth. Signed-in visitors still see the app unchanged.
- [x] Verified all Article datePublished values are in the past (2026-07-28 x4, 2026-09-13); the metadata scanner's future-date finding was stale.
- [x] Typecheck, ESLint (Index.tsx, PublicHome.tsx) and production build exit 0; browser check desktop + mobile signed out shows the h1, signed-in still shows the health card, no page errors.
- [ ] Change reaches the live site on the next publish.

- [x] Test Android APK (debug, Capacitor shell of published site) built and saved to Files as medora-debug.apk (2026-10-21)
- [ ] Play Store release: needs a user-owned signing key

- [x] Profile & Settings page (/profile) with PIN-gated password change, 3 tries / 24h lock — verified on phone size while signed in (read-only)

## Phone layout and recovery (2026-10-24)
- [x] Compact health card with full-width wrapping name, medical details and 116px phone QR column; shared query-based navigation, stable loading placeholders, reduced-motion support and no phone wallet blur.
- [x] Removed SiteFooter from signed-in wallet; native-platform guard on shared website footer (source checked only, Android runtime not tested). Profile displays signed photo or initials and retains upload/selfie/remove controls.
- [x] Current injected account, read-only browser: 390×844 Card/Records/Timeline/Manage/Profile all open without horizontal overflow; ordering disabled; Change password disabled because current account has no PIN. 1280×1800 Card checked; wallet website footer absent. No page errors. No account data changed.
- [x] Signed-out browser: Forgot password with empty email shows validation; reset route without session shows Link expired. No email sent, PIN entered, or password changed.
- [x] Recovery fails closed on failed profile/PIN/status checks; four recovery-gate tests pass (bun test scripts/passwordRecovery.test.ts, exit 0); changed-screen ESLint exit 0; latest automatic typecheck/build reports build OK (2026-10-24T07:46:09Z). No manual production build/typecheck run; no database migrations or publish.
- [ ] User completes private email link → PIN → new password → signed-in confirmation (requires their inbox and PIN; do not change their password during read-only checks).

## Floating wallet brand (2026-10-25)
- [x] Fixed floating Medora badge with safe-area clearance, finite 3D refresh/tap motion and reduced-motion/power-saver opt-outs; existing wallet actions retained, no patient-data changes.
- [x] Existing injected account, read-only: 1280×1800, 390×844 and 320×740 show fixed badge without horizontal overflow; refresh and tap replay finite brand-settle motion; reduced-motion reports no animation; screenshots reviewed, no page errors. No account data changed.
- [x] ESLint on BrandBadge.tsx and Index.tsx exit 0; automatic preview build reports build OK (2026-10-25T05:31:56Z). No manual build/typecheck, migrations or publish; native Android runtime not tested.

## Opening and switching smoothness (2026-10-25)
- [x] Patient-load effects now depend on stable user IDs, not refreshed user objects; removed unused dashboard subscription loading, parallelized Profile status reads with unmount guards, and kept visited Card/Records/Timeline panels in wallet-only memory. Manage PIN controls still remount. No auth, emergency wipe, database or entitlement changes.
- [x] Replaced continuous device-monitor frame loop with 2-second visible samples separated by 30 seconds; startup sampling delayed, hidden/pagehide cancels pending work, visible return restarts safely. Brief panel transition respects reduced-motion/power-saver; tapping the active navigation item no longer resets scroll.
- [x] Existing account, read-only reproduction at 484×954: timeline queries fell from two to one over two visits; full navigation sequence patient queries fell from 6 to 3 and profile queries from 16 to 9. Card/Records/Timeline/Manage/Profile open without page errors; screenshots reviewed.
- [x] Browser freeze/resume retains card and brand DOM; returning to Timeline preserves selected Lab results tab. Simulated document.hidden sends zero frame requests over 2.5 seconds, visible return resumes sampling. 390×844 and 1280×1800 show no overflow; reduced-motion duration is 0.001ms. No private forms submitted or account data changed.
- [x] Changed-file ESLint exit 0; automatic preview build reports build OK (2026-10-25T05:35:21Z). No manual build/typecheck, migrations or publish.
- [ ] Native Android cold-start and switching between installed apps require a physical phone; browser checks cannot verify Android's app-switch animation. Existing APK loads the published site, so these changes are not live there yet.

## Health-card download (2026-10-26)
- [x] Removed Print action; two-column Download/Edit details row. Download prepares PDF in memory, then Save PDF uses a fresh click for browser sharing/download or Android's registered CardFile system document picker. Cancellation does not report success; old APK without plugin shows an update-required error.
- [x] Existing account browser check: actual 1,133,178-byte PDF downloaded, %PDF header verified, first page rendered with pdftoppm and visually reviewed; card/photo/QR present. Print absent, 390×844 no overflow, no page errors. No patient records changed. Changed-file ESLint exit 0; automatic preview build OK (2026-10-26T05:10:05Z).
- [ ] Native Android save-picker execution still requires a physical device; Android 1.1 rebuilt successfully on 2026-10-28 with CardFile registered. Nothing published, no database changes.

## Background record reminders (2026-10-26)
- [ ] Connect Firebase Messaging with web push enabled; blocked: connection card declined, no service linked. Closed-website delivery cannot run yet.
- [ ] Implement permission-aware website/Android registration, owner-scoped reminder preferences and scheduled generic notifications; keep medical details out of notifications.
- [x] In-app reminder redesigned as a compact unframed notice with Add a record, explicit 14-day device snooze and Undo; removed misleading notification opt-in from the notice. Existing 90-day due rule unchanged. Legacy opt-in notifications now use generic content and do not fire while the page is hidden.
- [x] Isolated empty-record browser check (not a live patient): Add callback, snooze and Undo work, 320/390/1280 widths have no overflow; screenshot reviewed, no page errors. Two notification privacy tests pass, changed-file ESLint exit 0; automatic preview build OK (2026-10-26T05:14:59Z). No database changes, no publish; native runtime and closed-app delivery not tested.

## Phone polish and updated APK (2026-10-27)
- [x] Refined health-card identity/actions and bottom-navigation selection; removed stacked framing from Records/Manage and Profile, compacted photo controls, added Profile record/QR shortcuts, collapsed upcoming card ordering. Signed-in 484×954 navigation checked with no overflow/page errors; screenshots reviewed. Changed-file lint and automatic preview build pass.
- [x] Built Android 1.1 debug APK (versionCode 2); native Java compilation successful, APK metadata and v1/v2 signatures verified. Delivered medora-debug-v1.1.apk. Loads the published site; screen changes remain preview-only until publishing is authorised.
- [ ] Physical Android install and native save-picker execution not verified; no emulator/device available. Older debug APK signing compatibility not established—do not advise uninstalling and losing local state.

## Page-loading recovery (2026-10-28)
- [x] Current Index module returns HTTP 200; interrupted module fetch reproduced with browser interception. Error boundary shows recovery instead of blank screen; removing interruption and clicking Try again restores the homepage. Screenshot reviewed; lint and automatic build pass. No automatic reload or stored-data clearing.
