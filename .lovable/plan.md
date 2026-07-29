## Why your page isn't showing in Google (yet)

Being live is not the same as being indexed. Google has to discover the site, crawl it, decide it's worth indexing, and only then does it appear in search. For a brand new Lovable app on a `.lovable.app` subdomain, that usually takes days to weeks — and it will not happen at all until Google knows the site exists.

Here's what I checked and what's actually going on:

### What's fine
- `robots.txt` allows Googlebot on all public pages (only internal routes like `/auth/`, `/e/`, `/.lovable/` are disallowed — correct).
- `sitemap.xml` exists at `https://health-id-genie.lovable.app/sitemap.xml` and lists the homepage, `/pricing`, and the 4 blog posts.
- Per-route titles, descriptions, canonicals and JSON-LD are in place from the recent SEO work.

### The real reasons you can't find it
1. **Google has almost certainly never crawled the site.** You have not verified the domain in Google Search Console or submitted the sitemap, so Google has no signal that this URL exists. Waiting won't fix this on a `.lovable.app` subdomain — you have to tell Google.
2. **You're probably searching wrong.** Typing "Medora" into Google will surface bigger, older sites with the same name long before yours. Until you have backlinks and history, your site only shows up for very specific queries. Test with `site:health-id-genie.lovable.app` — if that returns nothing, the site is genuinely not indexed yet.
3. **New sites take time.** Even after submission, first indexing typically takes 3–14 days. Ranking for competitive terms like "digital health card" takes months and depends on backlinks, not on-page SEO alone.
4. **A `.lovable.app` subdomain will never rank well for competitive terms.** Google heavily favors root domains. If SEO matters to you, connecting a custom domain (e.g. `medora.app`) is the single biggest lever.

## What I'll do

### Step 1 — Verify the site in Google Search Console
Use the built-in Google Search Console connector to:
- Request a verification token
- Inject the `google-site-verification` meta tag into `index.html`
- Ask you to publish once so the tag goes live
- Call Google to verify ownership
- Register the site as a property

### Step 2 — Submit the sitemap
Once verified, submit `https://health-id-genie.lovable.app/sitemap.xml` via the Search Console API so Google starts crawling all 7 listed URLs immediately instead of waiting to discover them.

### Step 3 — Give you the "is it indexed?" check
Explain how to use `site:health-id-genie.lovable.app` in Google to watch indexing progress over the next 1–2 weeks, and how to use the URL Inspection tool in Search Console to request indexing for specific pages.

### What I won't do without asking
- Connect a custom domain — that's a decision (and cost) for you. I'll mention it as the biggest ranking lever but won't push it.
- Change any content, keywords, or metadata — the on-page SEO is already solid; the missing piece is discoverability, not quality.

## Technical details
- Verification uses the `google_search_console` connector's Site Verification API with `METHOD=META`, token embedded in `index.html` `<head>`.
- After verification: `PUT /webmasters/v3/sites/{encoded siteUrl}` to register, then `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{encoded sitemap URL}` to submit.
- Requires you to click Publish once between token injection and verification so Google can fetch the live meta tag.
