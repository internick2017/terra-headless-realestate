# Task 5 Report: Local Docker WordPress Dev Environment

Date: 2026-07-18

## What was built

- `wp-plugin/dev/docker-compose.yml`: written verbatim from the plan (MariaDB + WordPress
  6.7-php8.2-apache on host port 8930 + a `wpcli` sidecar container, with `wp-plugin/` mounted
  into `wp-content/plugins/terra-realestate`).
- `wp-plugin/dev/setup.sh`: written from the plan, then updated after two of the plan's install
  commands failed in practice. See "Deviations" below for exactly what changed and why.

The stack was brought up with `docker compose up -d`, then torn all the way down
(`docker compose down -v`, dropping both volumes) and rebuilt from a clean slate to prove the
final `setup.sh` works end to end, not just after manual patching.

## Deviations from the plan

The plan's `setup.sh` had two GitHub zip installs and Polylang WP-CLI commands (`pll lang
create`). Both needed changes:

### 1. WPGraphQL for ACF: GitHub zip fatals, use the WordPress.org release instead

`wp plugin install "https://github.com/wp-graphql/wpgraphql-acf/archive/refs/heads/master.zip"
--activate` installs, activates, and then fatals the entire site:

```
PHP Fatal error:  Uncaught Error: Class "WPGraphQL\Acf\ThirdParty" not found in
/var/www/html/wp-content/plugins/wpgraphql-acf/src/WPGraphQLAcf.php:64
```

Cause: the plugin's `src/` uses PSR-4 classes that are normally loaded through a Composer-built
`vendor/autoload.php`. That directory is not committed to the repo and is not present in a raw
GitHub source zip, so half the classes never load.

Fix: WPGraphQL for ACF was merged upstream into an official WordPress.org plugin in 2023, slug
`wpgraphql-acf` (confirmed via `https://api.wordpress.org/plugins/info/1.0/wpgraphql-acf.json`,
currently version 2.6.5). Installing straight from wp.org ships the built package with the
autoloader included:

```bash
$C plugin install wpgraphql-acf --activate
```

This installed and activated with zero errors, both from a broken-then-fixed site and from a
fully clean rebuild.

### 2. wp-graphql-polylang: pin a tagged release, not master

The plan's URL (`.../archive/refs/heads/master.zip`) was never actually exercised in isolation in
the first run, because the site was already fatally broken by the wpgraphql-acf problem above by
the time that line executed. Rather than assume master works, I checked the repo directly:
`vendor/` (including `vendor/autoload.php`) is committed to git in this repo (unlike
wpgraphql-acf), so a source zip does carry its autoloader either way. Still, pinning a tag is
safer than tracking a moving branch, so `setup.sh` now installs the latest tagged release:

```bash
$C plugin install "https://github.com/valu-digital/wp-graphql-polylang/archive/refs/tags/v0.7.1.zip" --activate
```

This installed and activated cleanly on the first try (both in the initial fix-up run and in the
full clean rebuild).

### 3. `wp pll lang create` / `wp pll lang list` do not exist

The plan assumed WP-CLI has a native `pll` command. It does not, and neither does it come from
Polylang itself:

- The free (wordpress.org) build of Polylang 3.8.5 ships no WP-CLI integration at all
  (`grep -rl 'cli' wp-content/plugins/polylang` for command registration turns up nothing; `wp cli
  has-command pll` returns nothing).
- The one community WP-CLI package for it, `diggy/polylang-cli`:
  - `wp package install https://github.com/diggy/polylang-cli.git` fails outright:
    `diggy/polylang-cli dev-master requires wp-cli/wp-cli ~1.5.0` conflicts with the actual
    (much newer) `wp-cli/wp-cli` root package, so Composer's dependency resolution fails before
    anything installs.
  - Bypassing Composer and loading the package's `command.php` directly with
    `wp --require=.../command.php pll lang list` gets further, but then fatals:
    `Undefined constant "Polylang_CLI\Commands\PLL_INC"`, the package is an abandoned prealpha
    release written against an old Polylang internal API; the `PLL_INC` constant no longer exists
    in modern Polylang (3.x uses `POLYLANG_DIR`).

Fix: create the languages directly through Polylang's own model API via `wp eval`, the same code
path the admin UI (and any working CLI wrapper) would ultimately call
(`PLL()->model->languages->add()`, defined in
`wp-content/plugins/polylang/src/Model/Languages.php`):

```bash
$C eval '$r = PLL()->model->languages->add( array( "name" => "English", "slug" => "en", "locale" => "en_US", "term_group" => 0 ) ); if ( is_wp_error( $r ) ) { WP_CLI::error( $r->get_error_message() ); } else { WP_CLI::success( "Created language: en" ); }'
$C eval '$r = PLL()->model->languages->add( array( "name" => "Português", "slug" => "pt", "locale" => "pt_BR", "term_group" => 1 ) ); if ( is_wp_error( $r ) ) { WP_CLI::error( $r->get_error_message() ); } else { WP_CLI::success( "Created language: pt" ); }'
```

This worked cleanly both times. `PLL_ADMIN` is defined true automatically when `WP_CLI` is true
(see `polylang/src/class-polylang.php:142`), so Polylang's admin-side model classes, including
`->model->languages`, are available in a WP-CLI context without any extra setup.

Consequence for verification: `wp --allow-root pll lang list` genuinely returns
`Error: 'pll' is not a registered wp command.` (confirmed below, on purpose, to document the
failure). The functional equivalent, `wp term list language`, is used instead and shows both
languages correctly.

## Verification results

### 1. All plugins active

```
$ docker compose exec -T wpcli wp --allow-root plugin list --status=active
name                     status  update  version  update_version  auto_update
advanced-custom-fields   active  none    6.8.6                     off
polylang                 active  none    3.8.5                     off
terra-realestate         active  none    0.1.0                     off
wp-graphql               active  none    2.17.0                    off
wpgraphql-acf            active  none    2.6.5                     off
wp-graphql-polylang      active  none    0.7.1                     off
```

All 5 required plugins (WPGraphQL, Advanced Custom Fields, Polylang, WPGraphQL for ACF,
wp-graphql-polylang) plus the Terra companion plugin are active. No fatal errors; `wp-login.php`
and `/` both return HTTP 200.

### 2. GraphQL responds

```
$ curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ properties { nodes { title } } }"}'
{"data":{"properties":{"nodes":[]}},"extensions":{...debug notice only...}}
```

`data.properties.nodes` resolves to an empty array, as expected before Task 6 seeds content.

### 3. ACF fields are in the GraphQL schema

Public introspection is disabled by default in WPGraphQL. Enabled it via
`update_option('graphql_general_settings', ['public_introspection_enabled' => 'on'])` (useful for
the frontend team generally, not just this check), then:

```
$ curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name: \"Property\") { fields { name } } }"}'
```

Returned fields include `propertyFields` (the ACF group, confirming WPGraphQL for ACF is wired)
and `language` / `translations` (confirming wp-graphql-polylang is wired). Full field list:
content, contentType, contentTypeName, databaseId, date, dateGmt, desiredSlug, editingLockedBy,
enclosure, enqueuedScripts, enqueuedStylesheets, featuredImage, featuredImageDatabaseId,
featuredImageId, guid, hasPassword, id, isComment, isContentNode, isFrontPage, isPostsPage,
isPreview, isRestricted, isTermNode, **language**, lastEditedBy, link, modified, modifiedGmt,
password, preview, previewRevisionDatabaseId, previewRevisionId, **propertyFields**, slug,
status, template, title, **translation**, **translations**, uri.

Also confirmed the `language` where-argument is accepted by the schema (not just present as a
field):

```
$ curl -s -X POST http://localhost:8930/graphql -H 'Content-Type: application/json' \
  -d '{"query":"{ properties(where:{language:PT}){ nodes { title propertyFields { price bedrooms } } } }"}'
{"data":{"properties":{"nodes":[]}}, ...}
```

No schema error; empty because there is no seeded data yet.

### 4. Polylang languages

`wp pll lang list` does not exist (see Deviation 3). Functional equivalent:

```
$ docker compose exec -T wpcli wp --allow-root term list language --fields=term_id,name,slug,description
term_id  name       slug  description
2        English    en    a:3:{s:6:"locale";s:5:"en_US";s:3:"rtl";b:0;s:9:"flag_code";s:0:"";}
5        Português  pt    a:3:{s:6:"locale";s:5:"pt_BR";s:3:"rtl";b:0;s:9:"flag_code";s:0:"";}
```

Both `en` (locale `en_US`, default) and `pt` (locale `pt_BR`) exist.

Also confirmed the `property` CPT is registered as translatable with Polylang (Task 4's
`pll_get_post_types` filter is actually wired, not just present in code):

```
$ docker compose exec -T wpcli wp --allow-root eval 'var_export( PLL()->model->get_translated_post_types() );'
array (
  'post' => 'post',
  'page' => 'page',
  'wp_block' => 'wp_block',
  'property' => 'property',
)
```

## Other notes

- An unrelated orphan container `dev-wordpress-1` (3 weeks old, port 8920, exited) showed up as an
  "orphan container" warning on `docker compose up`. This belongs to a different project (the
  Kindly WP dev environment, per project memory, which also runs its compose file from a folder
  named `dev/` and shares the docker-compose default project name). It was left untouched; it is
  stopped and does not conflict with port 8930.
- Windows Git Bash (MSYS) path-mangles bare `/tmp/...`-style arguments passed through `docker
  compose exec` (e.g. turned `-e HOME=/tmp` into a Windows path). This surfaced while
  investigating the `polylang-cli` package and is worth remembering for future `docker compose
  exec` calls from this shell (`MSYS_NO_PATHCONV=1` prefix works around it), but it did not affect
  the final `setup.sh`, which does not pass such paths.
- `wp-data` (MariaDB volume) is Docker-managed and gitignored per Task 1; nothing under
  `wp-plugin/dev/wp-data/` was committed.

## Commit

`git add wp-plugin/dev/ && git commit -m "chore(wp): local docker dev environment with graphql + polylang"`

Commit hash: `db81bb6` (`chore(wp): local docker dev environment with graphql + polylang`,
2 files changed: `wp-plugin/dev/docker-compose.yml`, `wp-plugin/dev/setup.sh`).
