# Task 2-4 Report: Terra Real Estate companion plugin (CPT, ACF fields, Polylang i18n)

Implemented Tasks 2, 3, and 4 from `2026-07-18-headless-realestate.md`, transcribed verbatim from the plan.

## Files created

- `wp-plugin/terra-realestate.php` (Task 2, modified in Tasks 3 and 4): main plugin file. Header (Plugin Name, Description, Version, Author, Text Domain `terra-realestate`), `ABSPATH` guard, then three require + hook pairs added incrementally:
  - `class-cpt.php` required, hooked to `init` -> `Terra_CPT::register`
  - `class-fields.php` required, hooked to `acf/init` -> `Terra_Fields::register`
  - `class-i18n.php` required, hooked to the `pll_get_post_types` filter -> `Terra_I18n::translatable_post_types`
- `wp-plugin/includes/class-cpt.php` (Task 2): registers the `property` CPT (`public`, `show_in_rest`, `show_in_graphql`, `graphql_single_name: property`, `graphql_plural_name: properties`, supports title/editor/thumbnail).
- `wp-plugin/includes/class-fields.php` (Task 3): registers the `group_property` ACF field group in PHP via `acf_add_local_field_group`, scoped to the `property` post type, group itself exposed to GraphQL as `propertyFields`. All 14 fields (price, currency, operation, propertyType, bedrooms, bathrooms, areaM2, address, neighborhoodName, latitude, longitude, status, gallery, agentName, agentEmail) are individually exposed with `show_in_graphql => 1` and matching `graphql_field_name`.
- `wp-plugin/includes/class-i18n.php` (Task 4): adds `property` to the array Polylang treats as translatable via the `pll_get_post_types` filter.

## php -l results

All four files linted clean, checked twice (once per task as written, once as a final pass after all edits):

```
No syntax errors detected in wp-plugin/terra-realestate.php
No syntax errors detected in wp-plugin/includes/class-cpt.php
No syntax errors detected in wp-plugin/includes/class-fields.php
No syntax errors detected in wp-plugin/includes/class-i18n.php
```

PHP used: 8.5.3 (cli), `/c/tools/php85/php` (Laragon toolchain on this machine).

Note: the IDE diagnostics tool flagged `Undefined function 'add_action'` on the main plugin file after each edit. This is expected and not a real problem: WordPress core functions (`add_action`, `add_filter`, `register_post_type`, etc.) only exist once the file runs inside a live WordPress process, and no WP stub package is loaded in this plain-editor context. `php -l` (which only checks syntax, not symbol resolution) confirms there is no actual syntax error. This will be exercised for real once Task 5's Docker WP environment is up.

## Commits

Three commits, one per task, on top of the Task 1 scaffold commit (`a4ffd4e`):

1. `b5485ac` — `feat(wp): register property custom post type with graphql exposure` (Task 2)
2. `2c35c86` — `feat(wp): register property ACF fields in code and expose to graphql` (Task 3)
3. `776147d` — `feat(wp): make property translatable via polylang` (Task 4)

Commit messages match the plan exactly, no AI mentions or co-author trailers added.

## Concerns / deviations

None. All code was transcribed verbatim from the plan (Tasks 2, 3, 4, each Step 1-4). No functional deviations. The only thing not yet possible is a runtime check inside WordPress itself (register_post_type actually firing, ACF field group actually appearing, Polylang actually treating `property` as translatable) since that requires the Docker WP environment from Task 5, which is out of scope for this unit of work. `php -l` is the verification method the plan specifies for these tasks, and all four files pass it.
