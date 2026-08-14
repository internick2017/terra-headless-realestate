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
│   └── Polylang wiring                   │   └── page        → featured listings
├── WPGraphQL  ──────── GraphQL ───────►  ├── lib/queries.ts  → typed queries
└── seeded demo content                   └── lib/types.ts    → Zod validation at the edge
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
rather than an afternoon. Re-running the seed also backfills anything added to it since.

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

## Status

Built: the CMS and its content model, the bilingual seed with images, the typed GraphQL client,
locale routing with a language switcher, and the home page.

Next: the listings page with filters, property detail pages, the lead form, neighborhood
articles, then SEO and deployment.

## License

MIT
