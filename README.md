# Terra — Headless Real Estate Demo

A bilingual (EN/PT) real estate site built headless: WordPress as the content back end, exposed
over GraphQL, with a Next.js front end. Listings, neighborhood articles and every UI string exist
in both languages, and each language has its own URL space.

The point of the project is the architecture, not the listings: a CMS defined as code, a typed
boundary between the two halves, and a reproducible local environment.

## Architecture

```
WordPress (:8930)                         Next.js (:3000)
├── terra-realestate plugin               ├── proxy.ts        → /  redirects to /en
│   ├── property CPT                      ├── [locale]/       → /en and /pt
│   ├── ACF fields (in PHP, not clicks)   │   ├── layout      → <html lang>, header, switcher
│   └── Polylang wiring                   │   ├── page        → hero, featured, neighborhoods
├── WPGraphQL  ──────── GraphQL ───────►  │   ├── properties  → filters + detail + map
└── seeded demo content                   │   └── neighborhoods
                                          ├── api/lead        → enquiries out by email
                                          ├── sitemap · robots · llms.txt
                                          ├── lib/queries.ts  → typed queries
                                          └── lib/types.ts    → Zod validation at the edge
```

Everything the CMS returns is validated by Zod before it reaches a component, so a change on the
WordPress side fails loudly on the server instead of leaking `undefined` into the markup.

## Local development

Requires Docker and Node. Two halves, started separately.

**1. WordPress**

```bash
cd wp-plugin/dev
docker compose up -d
bash setup.sh        # installs WordPress, the plugins, and both languages
MSYS_NO_PATHCONV=1 docker compose exec -T wpcli wp --allow-root \
  eval-file /var/www/html/wp-content/plugins/terra-realestate/dev/seed.php
```

- Site: <http://localhost:8930> · admin `admin` / `admin123`
- GraphQL: <http://localhost:8930/graphql>

`setup.sh` and `seed.php` are both idempotent and are the only supported way to build the
environment: there are no manual steps to remember, and a lost Docker volume costs one command
rather than an afternoon.

The seed is declarative rather than write-once. Posts are created only if missing, but every
field hanging off them is re-applied on each run, so editing a value in `seed.php` and re-running
reconciles the database with the file. Backfilling only what was absent is how the coordinates in
that file once stayed months out of date in an environment that had already been seeded.

The `MSYS_NO_PATHCONV=1` prefix is only needed on Git Bash, which otherwise rewrites the
container path into a Windows one.

**2. Front end**

```bash
cd frontend
yarn install
yarn dev
```

- Site: <http://localhost:3000> (redirects to `/en`)
- Config: copy `.env.example` to `.env.local`; `WP_GRAPHQL_URL` points at the WordPress above.

Checks:

```bash
yarn test        # vitest
yarn lint
npx tsc --noEmit
```

## Project structure

- **`wp-plugin/`** — the companion plugin, registered in PHP rather than clicked together in the
  admin: the `property` CPT, its ACF fields, Polylang wiring, and GraphQL exposure.
  - **`wp-plugin/dev/`** — the Docker environment, `setup.sh`, and the bilingual seed, including
    the generated gallery artwork.
- **`frontend/`** — the Next.js app (App Router, TypeScript, Tailwind).
- **`docs/`** — the design document and a report per task, including the decisions and the dead
  ends behind them.

## Deployment

The two halves deploy independently, and the order matters: the front end queries the CMS at
**build** time (`generateStaticParams`, the sitemap, `/llms.txt`), so a Vercel build against a
WordPress that is only reachable on localhost fails rather than degrading.

**1. WordPress, on a public host.** A subdomain and a normal WordPress install, then five
plugins, in this order:

| Plugin | Where from |
| --- | --- |
| `wp-graphql` | WordPress.org |
| `advanced-custom-fields` | WordPress.org |
| `polylang` | WordPress.org |
| `wpgraphql-acf` | WordPress.org (not a GitHub zip: those ship without the Composer autoloader and fatal) |
| `wp-graphql-polylang` | [v0.7.1 release zip](https://github.com/valu-digital/wp-graphql-polylang/archive/refs/tags/v0.7.1.zip) — not on WordPress.org; pin the tag rather than master |

Then upload `wp-plugin/` as the `terra-realestate` plugin and activate it, set permalinks to
**Post name**, and run **Tools → Terra demo content → Seed demo content**. That page creates the
two Polylang languages and the demo content; it is the same code `dev/seed.php` runs under
WP-CLI, and exists because shared hosting has no shell. It is safe to run twice.

Confirm `https://<subdomain>/graphql` answers before going further.

**2. Next.js, on Vercel.** Import the repository, set the root directory to `frontend/`, and set:

| Variable | Value |
| --- | --- |
| `WP_GRAPHQL_URL` | `https://<subdomain>/graphql` |
| `NEXT_PUBLIC_SITE_URL` | the Vercel or custom domain, no trailing slash |
| `RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_TO_EMAIL` | optional; without them enquiries are logged, not emailed |
| `NEXT_PUBLIC_STATIC_MAP_URL` | optional; a paid static-map provider instead of OSM tiles |

`NEXT_PUBLIC_SITE_URL` is not cosmetic: hreflang, the canonical links, the sitemap and the
enquiry emails all build absolute URLs from it, and they are wrong without it.

**3. Afterwards.** Check `/sitemap.xml`, `/robots.txt` and `/llms.txt` respond, run a listing
through Google's Rich Results test, and run Lighthouse against the deployed front end. None of
that is meaningful against localhost.

## Status

Feature-complete locally. Built: the CMS and its content model, the bilingual seed with images,
the typed GraphQL client, locale routing with a language switcher, the home page, the listings
page with URL-driven filters, property detail pages with a gallery and a location map, the lead
capture form, the neighborhood articles, and the SEO surface — JSON-LD, sitemap, robots and
`/llms.txt`.

Next: deployment (WordPress on a subdomain, the front end on Vercel), then the portfolio card and
the case study.

## License

MIT
