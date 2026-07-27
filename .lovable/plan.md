Replace every user-facing “Smart Health” / “Smart Health Card” reference with “Medora” so the product name is consistent from login to health card to MCP tooling.

### Files to update

1. **`index.html`**
   - `<title>` → `Medora — Your Personal Health Wallet`
   - `<meta name="author">` → `Medora`
   - `<meta name="description">` and `og:description` can keep current copy but reference Medora where natural.
   - `og:title` → `Medora — Your Personal Health Wallet`

2. **`src/pages/Index.tsx`**
   - Header `<h1>`: `Smart Health` → `Medora`
   - Subtitle: `Digital Patient ID` → `Digital Health ID` (consumer-friendly)
   - Footer: `Smart Health Card · Secure Patient Registration` → `Medora · Secure Health Wallet`

3. **`src/pages/Auth.tsx`**
   - Page heading and subheading: replace generic “health wallet” with “Medora” / “Your Medora health wallet”.

4. **`src/components/SplashScreen.tsx`**
   - Title: `Smart Health` → `Medora`

5. **`src/components/HealthCard.tsx`**
   - Card header: `Smart Health Card` → `Medora Card`

6. **`src/components/HealthCardPreview.tsx`**
   - Success message: `Your Smart Health Card is saved...` → `Your Medora Card is saved...`

7. **`src/pages/OAuthConsent.tsx`**
   - `Smart Health Card` → `Medora` in the consent description and permission note.

8. **MCP surfaces**
   - `src/lib/mcp/index.ts`: title/instructions → Medora.
   - `src/lib/mcp/tools/list-patients.ts`: description → Medora.
   - `supabase/functions/mcp/index.ts`: title, description, instructions → Medora.
   - `.lovable/mcp/manifest.json` will regenerate from the source MCP definitions on build.

### Verification
- Run `bunx tsc --noEmit` or `tsgo` to confirm no type errors.
- Launch preview and take a Playwright screenshot of the splash + auth + index header to confirm the new name renders cleanly.
- Search repo for any remaining `Smart Health` occurrences and resolve them.