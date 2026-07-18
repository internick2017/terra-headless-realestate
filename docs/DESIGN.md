# Headless Real Estate (WP + Next.js) — Design

**Date:** 2026-07-18
**Type:** New standalone portfolio project (WordPress Engineer campaign, phase 3: headless WP + Next.js).
**Goal:** A live, bilingual (EN/PT) headless real estate site that proves Nick can
pair WordPress-as-CMS with a modern Next.js frontend. Targets international (USD/EUR)
and Brazilian clients. Becomes a portfolio card plus a `/work` case study.

## Market rationale (researched 2026-07-18)

- Headless WP + Next.js demand has moved from enterprise to mid-market; the driver is
  speed (Core Web Vitals), which is now also a ranking signal for AI search engines
  (ChatGPT, Perplexity, Google AI Overviews).
- Specialists ("developer for [industry]") earn multiples of generalists. Real estate
  is a vertical with the highest measurable SEO ROI and is universal across US + Brazil.
- Real estate content is editor-heavy (agents manage listings and hyperlocal content) and
  performance/SEO-critical, which is the textbook case for a headless split: WordPress for
  editors, Next.js for speed.
- Bilingual EN/PT lets the single demo speak to both researched markets.

Sources are recorded in the brainstorming conversation.

## Demo brand

Fictional agency **"Terra"** (Terra Homes / Terra Imóveis). All content is demo data.

## Architecture

```
WordPress backend (HostGator subdomain)         Next.js frontend (Vercel)
──────────────────────────────────────          ─────────────────────────
Property CPT + ACF fields               ──┐      /en and /pt locale routes
Neighborhood posts (hyperlocal SEO)       │      Listings + filters (server-rendered)
Media library (photos)               WPGraphQL   Property detail pages (ISR)
Polylang (EN/PT translations)          ──┘       Gallery, specs, map, lead form
Editors work in the normal wp-admin              SEO metadata + JSON-LD + /llms.txt
```

- **WordPress** hosts content only. Exposed to the frontend through **WPGraphQL**.
  No public WordPress theme is shipped; the site's only public face is the Next.js app.
- **Next.js 15** on **Vercel**, using **ISR** so listing and detail pages are static-fast
  but refresh when editors publish changes.
- WordPress lives on a **HostGator subdomain** (working name `imoveis-cms.nickgranados.com`),
  same install pattern as kindly.nickgranados.com.

## WordPress backend

The backend configuration is version-controlled as a **companion plugin** (not click-ops in
the admin), so the whole CMS is reproducible from code. The plugin registers:

- **Custom Post Type `property`** with **ACF** fields: price, currency, operation
  (sale/rent), property type (house/apartment/land/commercial), bedrooms, bathrooms, area
  (m²), address, neighborhood, latitude, longitude, status (available/reserved/sold),
  photo gallery, assigned agent.
- **`neighborhood` content** as standard posts in a "Neighborhoods" category, for the
  hyperlocal SEO articles the research flagged as the top-ranking content type.
- Field exposure to GraphQL via **WPGraphQL for ACF**.
- **Polylang** + **wp-graphql-polylang** so every property and post has EN and PT versions,
  queryable by language.

Required WordPress plugins: WPGraphQL, WPGraphQL for ACF, Advanced Custom Fields, Polylang,
wp-graphql-polylang.

## Next.js frontend

- **Locale routing:** `/en/...` and `/pt/...`. Language selection maps to the Polylang
  language argument in every GraphQL query.
- **Listings page** (`/[locale]/properties`): grid of property cards with filters
  (operation, type, price range, bedrooms, neighborhood). Rendered server-side for speed
  and crawlability.
- **Property detail** (`/[locale]/properties/[slug]`): image gallery, specs table,
  description, an embedded map (a static map image, e.g. a static maps API, to protect
  Core Web Vitals; no heavy interactive map JS), the assigned agent, and a **lead capture
  form** (contact the agent). Built with **ISR**.
- **Neighborhood articles** (`/[locale]/neighborhoods/[slug]`): hyperlocal SEO content.
- **Home page**: hero, featured listings, featured neighborhoods, a search entry point.
- **Lead form** posts to a **Next.js route handler** that sends the inquiry to the agency
  via a transactional email service (Resend). No database on the frontend.

## SEO and AI-search readiness

- Per-property **metadata** (title, description, canonical, hreflang for EN/PT) and
  **Open Graph** images.
- **JSON-LD** `RealEstateListing` / `Residence` schema per property and `Article` for
  neighborhood posts.
- **XML sitemap** and **robots.txt**.
- **`/llms.txt`** catalog index and AI-crawler-friendly output, extending the AI-discovery
  angle Nick already built in ShopGraph, so listings can be cited by ChatGPT / Perplexity.
- Core Web Vitals budget: LCP < 2.5s, CLS < 0.1, via ISR, `next/image`, and minimal JS.

## Deliverables

1. Live WordPress backend on the HostGator subdomain, seeded with demo listings and
   neighborhood posts in EN and PT.
2. Live Next.js frontend on Vercel.
3. Public GitHub repo (the companion plugin + the Next.js app).
4. A **portfolio card** in `src/data/projects.ts` (category `wordpress` or a new `headless`
   filter) plus a **`/work` case study** using the system built on 2026-07-18.

## Repository layout

New repo at `E:\dev\02-wordpress\headless-realestate\`:

```
headless-realestate/
  wp-plugin/        # companion plugin: CPT, ACF fields, GraphQL + Polylang wiring
  frontend/         # Next.js 15 app (deployed to Vercel)
  docs/             # this design + notes
  README.md
```

## Verification / success criteria

- Editing a property in wp-admin (EN and PT) surfaces it on the matching locale route after
  ISR revalidation.
- Filters narrow the listing set correctly.
- A property detail page renders gallery, specs, map, and a working lead form.
- Lighthouse: performance and SEO green; Core Web Vitals within budget.
- JSON-LD validates (Google Rich Results / schema validator); `/llms.txt` served.
- Both locales navigable end to end; hreflang present.

## Out of scope (YAGNI for a demo)

- No user accounts, saved favorites, or saved searches.
- No payment or booking flow.
- No map-heavy clustering UI (a static or lightweight map is enough).
- No languages beyond EN/PT.
- Not a distributable product; it is a polished vertical slice for the portfolio.
