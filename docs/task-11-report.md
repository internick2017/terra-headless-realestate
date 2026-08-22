# Task 11 — Property detail page

The page at `/[locale]/properties/[slug]`: gallery, description, specifications, static map and
the assigned agent. The lead form and the JSON-LD live in their own tasks; this one stops at
the title and meta description.

## What was built

| File | Role |
| --- | --- |
| `src/app/[locale]/properties/[slug]/page.tsx` | the route: prerendering, metadata, layout |
| `src/components/property-gallery.tsx` | one large image plus thumbnails (the only client component) |
| `src/components/property-map.tsx` | the location, composed from map tiles |
| `src/lib/map.ts` | Web Mercator projection and the tile grid |
| `src/lib/specs.ts` | the specifications table as label/value pairs |
| `src/lib/types.ts` | `PropertyDetailSchema`, `fromPllLang` |
| `src/lib/queries.ts` | `getProperty`, `getPropertySlugs` |

The page is server-rendered apart from the gallery, which needs the client only to remember
which image is selected. ISR with `revalidate = 3600`, and `generateStaticParams` prerenders the
whole catalogue in both languages.

## Two assumptions that turned out to be wrong

Both were written, typechecked, linted and unit-tested before anyone pointed a browser at them.
Neither would have been caught by any of that.

### Polylang's language filter is ignored once you query by name

The plan was to identify a listing with `where: { language: $language, name: $slug }`, on the
reasoning that the singular `property(id:, idType: SLUG)` form takes no language argument and the
connection does. The connection does accept it. It also ignores it:

```
where: { language: PT, name: "riverside-villa" }  ->  Riverside Villa   (the English post)
where: { language: EN, name: "vila-na-beira-rio" } ->  Vila na Beira-Rio (the Portuguese post)
```

In both directions, `name` wins outright. Left alone, `/pt/properties/<english-slug>` would have
rendered English copy inside Portuguese chrome — exactly the bug the filter was supposed to
prevent.

The check now lives in `getProperty`: ask by slug, then compare the `language { code }` the CMS
returned against the locale the URL asked for, and return null on a mismatch. That is better than
the original plan regardless — the rule is visible in our own code and covered by tests, rather
than delegated to plugin behaviour that turned out not to exist. Both cross-language URLs now
404, verified against the running CMS.

### The default static-map provider no longer exists

`staticmap.openstreetmap.de` does not resolve; the domain is gone. The unit tests were happy
because they only ever checked that the URL string was assembled correctly — the one thing that
was never in doubt.

The map is now built from raw OpenStreetMap tiles: `tileMap()` returns the tiles covering a
viewport centred on the listing, each with a CSS offset, and the component lays them out as
absolutely positioned `<img>` tags with a marker on top. No API key, no script, no third party
between the page and the tile server. `NEXT_PUBLIC_STATIC_MAP_URL` remains as an escape hatch for
a deployment that would rather pay a provider than lean on the OSM tile servers.

The projection is tested by round-tripping through the inverse formulae, which is the strongest
check available without a second implementation to compare against. Asserting a tile number
remembered from the OSM wiki was tried first and was simply wrong.

## Also fixed

- **The map broke on a phone.** At 800×400 anchored to the top left, a 375px viewport showed a
  corner of the map with the marker off screen. The grid is centred now: narrow viewports crop
  the edges and keep the pin. Verified at 375px — marker dead centre, no horizontal overflow.

## Verified

- `tsc --noEmit`, `eslint`, and 69 unit tests (37 before this task) all clean.
- `next build` prerenders 16 property pages, 8 per language.
- `/en/properties/riverside-villa` and `/pt/properties/vila-na-beira-rio` return 200 with
  translated headings, specifications and prices; the other two combinations and an unknown slug
  return 404.
- All 12 map tiles on the page return 200 and decode at 256×256 in the browser.

## Known, not ours

The seeded coordinates are in New Jersey (40.7368, −74.0261) while the addresses are Brazilian,
so the map is accurate about a place the listing is not. Seed data; fix in `dev/seed.php`.

## Next

Task 12: the lead capture form. Its copy is already in the dictionary under `lead`, unused.
