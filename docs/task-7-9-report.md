# Task 7-9 Report: Frontend Scaffold, Locale Routing, and Home Page

Date: 2026-08-14

Covers Tasks 7, 8 and 9 of Plan 1, plus the gallery images the seed was missing.

## What was built

- `frontend/`: Next.js 16 (App Router, TypeScript, Tailwind 4) with a typed GraphQL client.
- `frontend/src/lib/types.ts`: Zod schemas that validate and normalise the CMS response.
- `frontend/src/lib/i18n.ts`: EN/PT dictionaries and the locale-swapping helper.
- `frontend/src/app/[locale]/`: the root layout and the home page.
- `frontend/src/components/`: `PropertyCard` and `LanguageSwitcher`.
- `wp-plugin/dev/images.php`: generated gallery artwork for the seeded properties.

Run it:

```bash
cd wp-plugin/dev && docker compose up -d          # WordPress on :8930
cd ../../frontend && yarn dev                     # Next.js on :3000
```

## Retaking the project: the database was gone

The Docker volume holding WordPress had been emptied between sessions, so the site
redirected to `install.php` and the seed was lost. Nothing was recovered by hand: `setup.sh`
plus `seed.php` rebuilt the whole environment — WordPress, six plugins, both Polylang
languages, eight bilingual properties and two neighborhoods.

That is worth stating in the case study. The environment being defined as code stopped a
lost volume from being a lost afternoon.

## What the CMS actually returns, and why the schema normalises it

Querying the live endpoint contradicted the plan's assumed shapes in three ways. All three
are handled in `PropertySchema` so components never see them:

| Field | What GraphQL returns | Why |
| --- | --- | --- |
| `currency`, `operation`, `propertyType`, `status` | `["BRL"]` — an array | ACF select fields expose a list even for a single choice |
| `bedrooms`, `bathrooms` | `null` rather than `0` | ACF returns null for empty numeric fields |
| `gallery` | a connection, `null` when empty | ACF galleries are exposed as `AcfMediaItemConnection` |

`PropertySchema` unwraps the arrays, turns null counts into 0, flattens the gallery to a
plain list, and lifts `propertyFields` onto the property, so a component reads
`property.price` rather than `property.propertyFields.price`.

Parsing happens in `queries.ts`, at the edge. A CMS change surfaces as a validation error on
the server with a field name in it, instead of `undefined` reaching the markup.

The tests in `types.test.ts` use a node copied from a real response, so if the backend shape
changes the tests fail rather than the page.

## Gallery images: drawn, not downloaded

The seed left galleries empty. For a real estate demo that is the first thing a visitor
notices, so `images.php` now draws three images per property with GD at seed time.

Downloading stock photos was tried first and rejected. A placeholder service keyed by a
random seed returns whatever it has: of twelve sampled images, none were buildings, and one
request for a studio apartment produced the interior of an abandoned car. A wrong photo
reads worse than no photo.

Drawing them instead keeps the seed reproducible offline, free of licensing questions, and
always showing a building of the right type — a pitched-roof house, an apartment tower, a
commercial block, or a fenced plot for land. The palette is derived from the property slug,
so listings look distinct while staying consistent, and the third image uses a dusk sky so a
gallery is not the same shot three times. Same slug, same image, every run.

Galleries are also backfilled: re-running the seed tops up properties created before the
images existed rather than skipping them untouched.

## Locale routing

Every page lives under `/en` or `/pt`; `proxy.ts` redirects bare paths to the default locale.

The root layout lives at `app/[locale]/layout.tsx` rather than `app/layout.tsx`. Only one
layout may render `<html>`, and a layout above the locale segment cannot know the language,
which would leave `lang` hardcoded. Putting it inside the segment makes `<html lang="pt">`
correct, which matters for search engines and screen readers. The scaffold's `app/layout.tsx`
and `app/page.tsx` were deleted for the same reason.

An unknown segment such as `/fr` calls `notFound()` instead of rendering a page with missing
copy.

Portuguese is typed against English (`const pt: Dict = { ... }`), so a missing or misspelled
key fails the build rather than showing as a blank in the browser. The dictionaries are
deliberately not `as const`: that narrows every English string to its own literal type, and
then no translation can satisfy it.

The language switcher rewrites only the leading path segment, so switching keeps the visitor
on the page they were reading. That rewrite is a pure function, tested without a router.

## Prices

`formatPrice` uses `Intl.NumberFormat` with `en-US` or `pt-BR`, not string concatenation. The
same listing reads `R$320,000` in English and `R$ 320.000` in Portuguese, and a dollar listing
stays in dollars on both. Cents are dropped. A listing with no price returns null so the
caller can say "on request" instead of printing a misleading zero.

## Gotchas

**Next 16 blocks images from private IPs.** `next/image` returned HTTP 400,
`"url" parameter is not allowed`, even with the host in `remotePatterns`. The optimiser
refuses to fetch from hosts that resolve to a private IP, so it cannot be used to reach
internal services (SSRF). `localhost` is exactly that. The fix is
`images.dangerouslyAllowLocalIP`, enabled **in development only** — in production the CMS is
a public hostname and the protection stays on. The condition is in
`node_modules/next/dist/server/image-optimizer.js`, not in the error message.

**`middleware` is deprecated in Next 16**, renamed to `proxy`. The dev server warns about it;
the file is `src/proxy.ts` exporting `proxy`.

**Running the dev server on this machine.** Invoking `yarn` from another project's directory
picks up that project's Yarn version and fails ("This package doesn't seem to be present in
your lockfile"). Passing an absolute path to `next dev` makes Next join it onto the caller's
cwd and fail to find its own manifest. Set the working directory and call the binary:

```bash
cd /d frontend && node node_modules/next/dist/bin/next dev
```

**`docker compose exec` under Git Bash rewrites container paths.** `/var/www/html/...` becomes
`C:/Program Files/Git/var/www/html/...`. Prefix the command with `MSYS_NO_PATHCONV=1`.

**Next warns "Slow filesystem detected"** for `.next` on the E: drive, which is a mechanical
disk. Consistent with how slow the Docker bind mounts are on this machine.

## Verified

- 23 unit tests pass; TypeScript and ESLint clean.
- `/` redirects to `/en`; `/pt` serves `<html lang="pt">`; `/fr` is a 404.
- The home page lists six properties in both languages, with titles and neighborhood names
  translated by Polylang and prices formatted per locale.
- All six cover images load through the Next optimiser (26 KB source served as 5.8 KB).

## Next

Task 10: the listings page with filters.
