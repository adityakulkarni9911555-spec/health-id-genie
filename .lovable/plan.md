## Plan to cut FCP/LCP and CLS on `/auth`

1. **Remove render-blocking font work from first paint**
   - Stop loading Google Fonts before the page paints.
   - Use the existing system font stack for the first screen so text appears immediately.
   - Keep the visual style but avoid web-font download blocking FCP/LCP.

2. **Make `/auth` load synchronously instead of lazy-loading**
   - Import the Auth page directly in `App.tsx` so the first screen is not waiting on an extra JS chunk.
   - Keep deeper pages lazy-loaded.

3. **Take analytics out of the critical path**
   - Remove PostHog provider initialization from the root render path.
   - Load analytics only after the page is interactive/idle.
   - On `/auth`, keep A/B assignment instant by using the stored/fallback variant first, then let analytics report later.

4. **Prevent CLS on the auth page**
   - Reserve stable space for the header, hero, and sign-in card.
   - Remove layout-affecting responsive reflows above the fold where possible.
   - Replace font-dependent sizing with stable line heights/min-heights.

5. **Verify the result**
   - Run a local Lighthouse-style/performance check against `/auth` after changes.
   - Confirm the page paints without splash/login flicker, and CLS-causing elements no longer jump.

Expected result: FCP/LCP should drop sharply because the browser no longer waits on external fonts or an Auth chunk, and CLS should fall below the 0.1 target by stabilizing the above-the-fold layout.