# Task 6 Report: Seed Demo Data (Bilingual Properties + Neighborhoods)

Date: 2026-07-18

## What was built

- `wp-plugin/dev/seed.php`: a WP-CLI `eval-file` script that seeds 8 demo properties (each with
  an EN and a PT post, linked as Polylang translations) and 2 neighborhood articles (also EN+PT,
  linked, and assigned to a translated "Neighborhoods"/"Bairros" category).

Run with:

```bash
cd wp-plugin/dev
docker compose exec -T wpcli wp --allow-root eval-file wp-content/plugins/terra-realestate/dev/seed.php
```

## How it works

Polylang free ships no WP-CLI commands (confirmed again here, consistent with Task 5's finding),
so language assignment and translation linking go through Polylang's own PHP API, called directly
inside the `eval-file` script:

- `pll_set_post_language( $post_id, $lang )` to set a post's language.
- `pll_save_post_translations( ['en' => $en_id, 'pt' => $pt_id] )` to link the two as translations.
- `pll_set_term_language( $term_id, $lang )` / `pll_save_term_translations(...)` for the same on
  taxonomy terms (needed because `category` turned out to be a Polylang-translated taxonomy, see
  "Discovery" below).

Each function call is guarded with `function_exists(...)` and falls back to the underlying model
API (`PLL()->model->post->set_language()`, `PLL()->model->post->save_translations()`,
`PLL()->model->term->set_language()`, `PLL()->model->term->save_translations()`) if the wrapper
isn't defined, per the task instructions. In this environment the `pll_*` wrapper functions were
already available in a plain `wp eval` context, so that's the path actually exercised.

Property ACF fields are set with `update_field( $name, $value, $post_id )`, matching by field
name (the local field group registered in Task 3 uses `'name' => $key` for every field, so
`update_field('price', 320000, $id)` resolves correctly without needing the `field_...` key).
Numeric/select specs (price, currency, operation, propertyType, bedrooms, bathrooms, areaM2,
latitude, longitude, status, agentName, agentEmail) are identical on both language posts of a
property (it's the same physical listing). `address` and `neighborhoodName` are set per-language
since they're free text. `gallery` is left empty, as the plan explicitly allows.

### Idempotency

Every post and term created by the script is tagged with a `_terra_seed_key` meta value. On each
run, `terra_seed_find_by_key()` looks up that key first (via `get_posts()`/`get_terms()` with
`meta_key`/`meta_value`) and skips creation if both the EN and PT posts already exist. Verified by
running the script twice: the second run reported `Seeded 0 properties (EN+PT) and 0
neighborhoods (EN+PT). Skipped 8 properties and 2 neighborhoods already seeded.` with no new posts
created.

### Discovery: `category` is a Polylang-translated taxonomy

The plan's Task 6 description says "creates a 'Neighborhoods' category" (singular). Before writing
the script, I checked `PLL()->model->get_translated_taxonomies()` and confirmed Polylang has
`category` registered as translated by default (alongside `post_tag`). That means a single shared
category term assigned to both an EN and a PT post would violate Polylang's per-language term
model. So the script creates two terms instead, `Neighborhoods` (en) and `Bairros` (pt), and links
them with `pll_save_term_translations()`, exactly like the posts. Each language's neighborhood
articles get their own language's term via `wp_set_post_categories()`.

## Demo data seeded

8 properties, covering all `propertyType`/`operation`/`status` enum values across 2 neighborhoods
(Downtown/Centro and Riverside/Beira-Rio):

| EN title | PT title | Type | Operation | Price | Beds/Baths | Status |
|---|---|---|---|---|---|---|
| Downtown Loft | Loft no Centro | apartment | sale | 320,000 USD | 1/1 | available |
| Riverside Cottage | Casa na Beira-Rio | house | sale | 275,000 USD | 3/2 | available |
| Downtown Family House | Casa de Familia no Centro | house | sale | 1,250,000 BRL | 4/3 | available |
| Downtown Studio | Studio no Centro | apartment | rent | 1,200 USD | 0/1 | available |
| Riverside Villa | Vila na Beira-Rio | house | sale | 650,000 USD | 5/4 | reserved |
| Downtown Commercial Space | Espaço Comercial no Centro | commercial | rent | 3,000 USD | 0/2 | available |
| Riverside View Apartment | Apartamento com Vista para o Rio | apartment | sale | 890,000 BRL | 2/2 | available |
| Riverside Land Lot | Lote na Beira-Rio | land | sale | 320,000 BRL | 0/0 | sold |

2 neighborhood articles (EN+PT), category "Neighborhoods"/"Bairros":

- Downtown / Centro
- Riverside / Beira-Rio

## Seed run output

```
Seeded property 'Downtown Loft' -> EN #5 / PT #6
Seeded property 'Riverside Cottage' -> EN #7 / PT #8
Seeded property 'Downtown Family House' -> EN #9 / PT #10
Seeded property 'Downtown Studio' -> EN #11 / PT #12
Seeded property 'Riverside Villa' -> EN #13 / PT #14
Seeded property 'Downtown Commercial Space' -> EN #15 / PT #16
Seeded property 'Riverside View Apartment' -> EN #17 / PT #18
Seeded property 'Riverside Land Lot' -> EN #19 / PT #20
Seeded neighborhood 'Downtown' -> EN #21 / PT #22
Seeded neighborhood 'Riverside' -> EN #23 / PT #24
Success: Seeded 8 properties (EN+PT) and 2 neighborhoods (EN+PT). Skipped 0 properties and 0 neighborhoods already seeded.
```

Idempotency re-run:

```
Skipping property 'Downtown Loft' (already seeded: EN #5, PT #6)
... (all 8 properties and 2 neighborhoods skipped)
Success: Seeded 0 properties (EN+PT) and 0 neighborhoods (EN+PT). Skipped 8 properties and 2 neighborhoods already seeded.
```

## GraphQL verification

### 1. EN properties: titles + populated price/bedrooms/neighborhoodName

```bash
curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ properties(where:{language:EN}){ nodes { title propertyFields { price bedrooms neighborhoodName } } } }"}'
```

```json
{"data":{"properties":{"nodes":[
  {"title":"Riverside Land Lot","propertyFields":{"price":320000,"bedrooms":null,"neighborhoodName":"Riverside"}},
  {"title":"Riverside View Apartment","propertyFields":{"price":890000,"bedrooms":2,"neighborhoodName":"Riverside"}},
  {"title":"Downtown Commercial Space","propertyFields":{"price":3000,"bedrooms":null,"neighborhoodName":"Downtown"}},
  {"title":"Riverside Villa","propertyFields":{"price":650000,"bedrooms":5,"neighborhoodName":"Riverside"}},
  {"title":"Downtown Studio","propertyFields":{"price":1200,"bedrooms":null,"neighborhoodName":"Downtown"}},
  {"title":"Downtown Family House","propertyFields":{"price":1250000,"bedrooms":4,"neighborhoodName":"Downtown"}},
  {"title":"Riverside Cottage","propertyFields":{"price":275000,"bedrooms":3,"neighborhoodName":"Riverside"}},
  {"title":"Downtown Loft","propertyFields":{"price":320000,"bedrooms":1,"neighborhoodName":"Downtown"}}
]}}}
```

All 8 EN titles present, `price` populated on every property, `neighborhoodName` populated on
every property. `bedrooms` is populated (non-null) for every property that actually has bedrooms
> 0; see "Known quirk" below for why the 3 zero-bedroom properties show `null`.

### 2. PT properties: translated titles

```bash
curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ properties(where:{language:PT}){ nodes { title propertyFields { price bedrooms } } } }"}'
```

```json
{"data":{"properties":{"nodes":[
  {"title":"Lote na Beira-Rio","propertyFields":{"price":320000,"bedrooms":null}},
  {"title":"Apartamento com Vista para o Rio","propertyFields":{"price":890000,"bedrooms":2}},
  {"title":"Espaço Comercial no Centro","propertyFields":{"price":3000,"bedrooms":null}},
  {"title":"Vila na Beira-Rio","propertyFields":{"price":650000,"bedrooms":5}},
  {"title":"Studio no Centro","propertyFields":{"price":1200,"bedrooms":null}},
  {"title":"Casa de Familia no Centro","propertyFields":{"price":1250000,"bedrooms":4}},
  {"title":"Casa na Beira-Rio","propertyFields":{"price":275000,"bedrooms":3}},
  {"title":"Loft no Centro","propertyFields":{"price":320000,"bedrooms":1}}
]}}}
```

All 8 PT titles returned correctly (raw response has `ç`/`ã` escapes from curl/JSON,
decoded above), same prices as the EN set (same underlying listings), confirming `where:{language:
PT}` correctly filters to the Portuguese posts.

### 3. EN <-> PT translation link

```bash
curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ properties(where:{language:EN}){ nodes { title language { code } translation(language: PT) { title language { code } } translations { title language { code } } } } }"}'
```

```json
{"data":{"properties":{"nodes":[
  {"title":"Riverside Land Lot","language":{"code":"EN"},"translation":{"title":"Lote na Beira-Rio","language":{"code":"PT"}},"translations":[{"title":"Lote na Beira-Rio","language":{"code":"PT"}}]},
  {"title":"Riverside View Apartment","language":{"code":"EN"},"translation":{"title":"Apartamento com Vista para o Rio","language":{"code":"PT"}},"translations":[{"title":"Apartamento com Vista para o Rio","language":{"code":"PT"}}]},
  {"title":"Downtown Commercial Space","language":{"code":"EN"},"translation":{"title":"Espaço Comercial no Centro","language":{"code":"PT"}},"translations":[{"title":"Espaço Comercial no Centro","language":{"code":"PT"}}]},
  {"title":"Riverside Villa","language":{"code":"EN"},"translation":{"title":"Vila na Beira-Rio","language":{"code":"PT"}},"translations":[{"title":"Vila na Beira-Rio","language":{"code":"PT"}}]},
  {"title":"Downtown Studio","language":{"code":"EN"},"translation":{"title":"Studio no Centro","language":{"code":"PT"}},"translations":[{"title":"Studio no Centro","language":{"code":"PT"}}]},
  {"title":"Downtown Family House","language":{"code":"EN"},"translation":{"title":"Casa de Familia no Centro","language":{"code":"PT"}},"translations":[{"title":"Casa de Familia no Centro","language":{"code":"PT"}}]},
  {"title":"Riverside Cottage","language":{"code":"EN"},"translation":{"title":"Casa na Beira-Rio","language":{"code":"PT"}},"translations":[{"title":"Casa na Beira-Rio","language":{"code":"PT"}}]},
  {"title":"Downtown Loft","language":{"code":"EN"},"translation":{"title":"Loft no Centro","language":{"code":"PT"}},"translations":[{"title":"Loft no Centro","language":{"code":"PT"}}]}
]}}}
```

Every EN property resolves both `translation(language: PT)` (singular field) and `translations`
(list field) to its correct PT counterpart. Confirmed both syntaxes work identically here since
there are only 2 languages.

### Bonus: neighborhood posts (category + translation)

```bash
curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ posts(where:{language:EN, categoryName:\"neighborhoods\"}){ nodes { title language { code } categories { nodes { name } } translation(language: PT) { title } } } }"}'
```

```json
{"data":{"posts":{"nodes":[
  {"title":"Riverside","language":{"code":"EN"},"categories":{"nodes":[{"name":"Neighborhoods"}]},"translation":{"title":"Beira-Rio"}},
  {"title":"Downtown","language":{"code":"EN"},"categories":{"nodes":[{"name":"Neighborhoods"}]},"translation":{"title":"Centro"}}
]}}}
```

Both EN neighborhood articles are in the "Neighborhoods" category and resolve to their PT
counterparts. (Confirmed separately that the PT posts sit in the "Bairros" category term.)

## Exact GraphQL syntax confirmed (for later frontend tasks)

- **Language filter on the `property` connection**: `properties(where:{language: EN})` /
  `properties(where:{language: PT})`. The `where.language` arg type is `LanguageCodeFilterEnum`
  with values `EN`, `PT`, `ALL`, `DEFAULT` (not the plain `LanguageCodeEnum`, which only has
  `EN`/`PT` and is used for the `translation(language: ...)` arg instead).
- **Language filter on the `post` connection**: same shape,
  `posts(where:{language: EN, categoryName: "neighborhoods"})`. `categoryName` takes the category
  **slug** (lowercase), not the display name.
- **Single translation lookup**: `translation(language: PT)` on both `Property` and `Post` types,
  argument type `LanguageCodeEnum!` (non-null, only `EN`/`PT`).
- **All translations**: `translations` (no args) returns a list; with only 2 languages configured
  it always has 0 or 1 items, but frontend code should treat it as a list, not assume a max of 1
  language pair permanently.
- **Reading a node's own language**: `language { code }` returns an object (`code` is the
  `LanguageCodeEnum` value), not a plain scalar.

## Known quirk to hand off to the frontend team (Task 7+)

ACF **number** fields whose stored value is `0` resolve to GraphQL `null`, not `0`. Confirmed on
`bedrooms` (studio, land, and commercial listings, which legitimately have 0 bedrooms) and
`bathrooms` (the land lot, 0 bathrooms). The raw postmeta is stored correctly as the string `"0"`
(verified with `wp eval 'var_dump(get_post_meta(11,"bedrooms",true), get_field("bedrooms",11));'`,
both returned `string(1) "0"`), so this is not a seeding bug: WPGraphQL for ACF's number-field
resolver treats the PHP-falsy value `"0"` as empty and returns `null` instead of `0`. `price`,
`areaM2`, `latitude`, and `longitude` are never legitimately zero in this dataset so they weren't
affected, but any future zero-valued number field will hit the same behavior.

Practical implication for Task 7's Zod schema (`frontend/src/lib/types.ts`): `bedrooms` and
`bathrooms` must be typed as nullable numbers (e.g. `z.number().nullable()`), and UI code that
renders "N bed / M bath" should treat `null` as `0`, not as missing data.

## Commit

`git add wp-plugin/dev/seed.php && git commit -m "chore(wp): seed bilingual demo properties and neighborhoods"`

Commit hash: `c737c27` (1 file changed: `wp-plugin/dev/seed.php`, 530 insertions).
