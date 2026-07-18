#!/usr/bin/env bash
set -e
C="docker compose exec -T wpcli wp --allow-root"
$C core install --url=http://localhost:8930 --title="Terra" \
   --admin_user=admin --admin_password=admin123 --admin_email=admin@example.com --skip-email
$C plugin install wp-graphql advanced-custom-fields polylang --activate
# WPGraphQL for ACF is published on WordPress.org under the slug "wpgraphql-acf" (merged upstream
# in 2023). The raw GitHub master/develop branch zip does not include the built Composer
# autoloader (vendor/), so it fatals with "Class WPGraphQL\Acf\ThirdParty not found". Install the
# wp.org release instead of a GitHub zip.
$C plugin install wpgraphql-acf --activate
# wp-graphql-polylang is not on WordPress.org. Its repo commits vendor/ (the Composer autoloader
# is checked into git), so a tagged release zip works. Pin a tag instead of master/HEAD so the
# install does not silently break if master changes.
$C plugin install "https://github.com/valu-digital/wp-graphql-polylang/archive/refs/tags/v0.7.1.zip" --activate
$C plugin activate terra-realestate
# Polylang languages: EN (default) + PT.
# NOTE: the free (wp.org) Polylang build ships no WP-CLI commands at all, so `wp pll lang create`
# does not exist. The known community package for it (diggy/polylang-cli) is an abandoned
# prealpha release that references a Polylang constant (PLL_INC) removed in modern Polylang, and
# its composer.json pins wp-cli/wp-cli ~1.5.0, so `wp package install` fails dependency
# resolution outright. Create the languages directly through Polylang's own model API via
# `wp eval` instead, the same code path the admin UI ultimately calls.
$C eval '$r = PLL()->model->languages->add( array( "name" => "English", "slug" => "en", "locale" => "en_US", "term_group" => 0 ) ); if ( is_wp_error( $r ) ) { WP_CLI::error( $r->get_error_message() ); } else { WP_CLI::success( "Created language: en" ); }'
$C eval '$r = PLL()->model->languages->add( array( "name" => "Português", "slug" => "pt", "locale" => "pt_BR", "term_group" => 1 ) ); if ( is_wp_error( $r ) ) { WP_CLI::error( $r->get_error_message() ); } else { WP_CLI::success( "Created language: pt" ); }'
$C rewrite structure '/%postname%/' --hard
